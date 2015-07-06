'use strict';

var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
var errors = require('../errors.js');
var collection = require('../collection.js');
var projectModel = require('../models/projects.js');
var cycleModel = require('../models/cycles.js');


module.exports = function ProjectAssignment(config, resources) {
	return {
		query: queryAssignments,
		get: getAssignment,
		save: saveAssignment,
		update: updateAssignment,
		delete: deleteAssignment
	};

	function queryAssignments(conn, projectId, query, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// get the project
		return r.table('projects').get(projectId).do(function(project){
			return r.branch(
				project.not(),
				r.error('{"error": "NotFoundError", "message": "Project not found."}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){

					// add user context
					return projectModel.addContext(r.expr(user), project).do(function(project){

						// check authorizations
						return r.branch(
							project('authorizations')('project/assignments:read').default(false).not(),
							r.error('{"error": "ForbiddenError", "message": "You are not permitted to view this project."}'),

							// get visible assignments
							project('assignments').coerceTo('array').map(function(kv){ return kv.nth(1).merge({ project_id: project('id') }); }).filter(function(assignment){
								return cycleModel.visibleTo(assignment, project('role'), cycle);
							})
						);
					});
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function getAssignment(conn, projectId, assignmentId, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// get the project
		return r.table('projects').get(projectId).do(function(project){
			return r.branch(
				project.not(),
				r.error('{"error": "NotFoundError", "message": "Project not found."}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){

					// add user context
					return projectModel.addContext(r.expr(user), project).do(function(project){

						// check authorizations
						return r.branch(
							project('authorizations')('project/assignments:read').default(false).not(),
							r.error('{"error": "ForbiddenError", "message": "You are not permitted to view this project."}'),

							// get assignment
							r.branch(
								project('assignments').hasFields(assignmentId).not(),
								r.error('{"error": "NotFoundError", "message": "Assignment not found."}'),

								// check visibility
								r.branch(
									cycleModel.visibleTo(project('assignments')(assignmentId), project('role'), cycle).not(),
									// this would really be 403, but we want to pretend that the assignment does not exist
									r.error('{"error": "NotFoundError", "message": "Assignment not found."}'),

									// return the assignment
									project('assignments')(assignmentId).merge({
										project_id: project('id')
									})
								)
							)
						);
					});
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function updateAssignment(conn, projectId, assignmentId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// validate id
		if(typeof data.id !== 'undefined' && assignmentId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate assignment
		var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/assignment', data, {checkRequired: false});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this project
		var lock = new resources.lock('project:' + projectId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('projects').get(projectId).do(function(project){
				var delta = {
					assignments: {},
					updated: r.now().toEpochTime()
				}; delta.assignments[assignmentId] = data;

				return r.branch(
					project.not(),
					r.error('{"error": "NotFoundError", "message": "Project not found"}'),

					// get the cycle
					r.table('cycles').get(project('cycle_id')).do(function(cycle){

						// add user context
						return projectModel.addContext(r.expr(user), project).do(function(project){

							// check authorizations
							return r.branch(
								project('authorizations')('project/assignments:write').default(false).not(),
								r.error('{"error": "ForbiddenError", "message": "You are not permitted to update this project."}'),

								// get assignment
								r.branch(
									project('assignments').hasFields(assignmentId).not(),
									r.error('{"error": "NotFoundError", "message": "Assignment not found"}'),
									project.merge(delta).do(function(write){

										// check visibility and assignability
										return r.branch(
											r.or(

												// check authorizations against any existing assignment
												r.and(
													project('assignments').hasFields(assignmentId),
													r.or(
														cycleModel.visibleTo(project('assignments')(assignmentId), project('role'), cycle).not(),
														cycleModel.assignableBy(project('assignments')(assignmentId), project('role'), cycle).not()
													)
												),

												// check authorizations against the new assignment
												r.or(
													cycleModel.visibleTo(write('assignments')(assignmentId), project('role'), cycle).not(),
													cycleModel.assignableBy(write('assignments')(assignmentId), project('role'), cycle).not()
												)
											),
											r.error('{"error": "ForbiddenError", "message": "You are not permitted to make this assignment."}'),

											// TODO: processWriteHooks

											// update the project
											r.table('projects').get(projectId).update(delta, {returnChanges: true}).do(function(result){
												return r.branch(
													result('errors').gt(0),
													r.error('{"error": "Error", "message": "Error writing to the database."}'),

													// return new value
													result('changes').nth(0)('new_val')('assignments')(assignmentId).merge({
														project_id: project('id')
													})
												);
											})
										);
									})
								)
							);
						});
					})
				);
			}).run(conn)

			// parse errors
			.catch(collection.throwError);
		})

		// release the lock
		.finally(lock.release.bind(lock));
	}


	function saveAssignment(conn, projectId, assignmentId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// validate id
		if(assignmentId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate assignment
		var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/assignment', data, {useDefault: true});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this project
		var lock = new resources.lock('project:' + projectId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('projects').get(projectId).do(function(project){
				var delta = {
					assignments: {},
					updated: r.now().toEpochTime()
				}; delta.assignments[assignmentId] = r.literal(data);

				return r.branch(
					project.not(),
					r.error('{"error": "NotFoundError", "message": "Project not found"}'),

					// get the cycle
					r.table('cycles').get(project('cycle_id')).do(function(cycle){

						// add user context
						return projectModel.addContext(r.expr(user), project).do(function(project){

							// check authorizations
							return r.branch(
								project('authorizations')('project/assignments:write').default(false).not(),
								r.error('{"error": "ForbiddenError", "message": "You are not permitted to update this project."}'),
								project.merge(delta).do(function(write){

									// check visibility and assignability
									return r.branch(
										r.or(

											// check authorizations against any existing assignment
											r.and(
												project('assignments').hasFields(assignmentId).not(),
												r.or(
													cycleModel.visibleTo(project('assignments')(assignmentId), project('role'), cycle).not(),
													cycleModel.assignableBy(project('assignments')(assignmentId), project('role'), cycle).not()
												)
											),

											// check authorizations against the new assignment
											r.or(
												cycleModel.visibleTo(write('assignments')(assignmentId), project('role'), cycle).not(),
												cycleModel.assignableBy(write('assignments')(assignmentId), project('role'), cycle).not()
											)
										),
										r.error('{"error": "ForbiddenError", "message": "You are not permitted to make this assignment."}'),
										r.branch(
											r.table('projects').get(projectId).replace(write)('errors').gt(0),
											r.error('{"error": "Error", "message": "Error writing to the database."}'),

											// return new value
											write('assignments')(assignmentId).merge({
												project_id: project('id')
											})
										)
									);
								})
							);
						});
					})
				);
			}).run(conn)

			// parse errors
			.catch(collection.throwError);
		})

		// release the lock
		.finally(lock.release.bind(lock));
	}


	function deleteAssignment(conn, projectId, assignmentId, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// acquire a lock for this project
		var lock = new resources.lock('project:' + projectId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('projects').get(projectId).do(function(project){
				var delta = {
					updated: r.now().toEpochTime()
				};

				var without = { assignments: {} };
				without.assignments[assignmentId] = true;

				return r.branch(
					project.not(),
					r.error('{"error": "NotFoundError", "message": "Project not found."}'),

					// get the cycle
					r.table('cycles').get(project('cycle_id')).do(function(cycle){

						// add user context
						return projectModel.addContext(r.expr(user), project).do(function(project){

							// check authorizations
							return r.branch(
								project('authorizations')('project/assignments:write').default(false).not(),
								r.error('{"error": "ForbiddenError", "message": "You are not permitted to view this project."}'),

								// get assignment
								r.branch(
									project('assignments').hasFields(assignmentId).not(),
									r.error('{"error": "NotFoundError", "message": "Assignment not found."}'),

									// check visibility and assignability
									r.branch(
										r.or(
											cycleModel.visibleTo(project('assignments')(assignmentId), project('role'), cycle).not(),
											cycleModel.assignableBy(project('assignments')(assignmentId), project('role'), cycle).not()
										),
										// this would really be 403, but we want to pretend that the assignment does not exist
										r.error('{"error": "NotFoundError", "message": "Assignment not found."}'),

										// update the project
										project.without(without).merge(delta).do(function(write){
											return r.branch(
												r.table('projects').get(projectId).replace(write)('errors').gt(0),
												r.error('{"error": "Error", "message": "Error writing to the database."}'),

												// return old value
												project('assignments')(assignmentId).merge({
													project_id: project('id')
												})
											);
										})
									)
								)
							);
						});
					})
				);
			}).run(conn)

			// parse errors
			.catch(collection.throwError);
		})

		// release the lock
		.finally(lock.release.bind(lock));
	}

};
