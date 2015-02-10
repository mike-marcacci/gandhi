'use strict';

var r = require('rethinkdb');
var Q = require('q');

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
		if(!user) return Q.reject(401);

		// get the project
		return r.table('projects').get(projectId).do(function(project){
			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found."}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){

					// add user context
					return projectModel.addContext(r.expr(user), project).do(function(project){

						// check authorizations
						return r.branch(
							project('authorizations')('read').default(false).not(),
							r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

							// get visible assignments
							project('assignments').coerceTo('array').map(function(kv){ return kv.nth(1); }).filter(function(assignment){
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
		if(!user) return Q.reject(401);

		// get the project
		return r.table('projects').get(projectId).do(function(project){
			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found."}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){

					// add user context
					return projectModel.addContext(r.expr(user), project).do(function(project){

						// check authorizations
						return r.branch(
							project('authorizations')('read').default(false).not(),
							r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

							// get assignment
							r.branch(
								project('assignments').hasFields(assignmentId).not(),
								r.error('{"code": 404, "message": "Assignment not found."}'),

								// check visibility
								r.branch(
									cycleModel.visibleTo(project('assignments')(assignmentId), project('role'), cycle).not(),
									// this would really be 403, but we want to pretend that the assignment does not exist
									r.error('{"code": 404, "message": "Assignment not found."}'),

									// return the assignment
									project('assignments')(assignmentId)
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
		if(!user) return Q.reject(401);

		// validate id
		if(typeof data.id !== 'undefined' && assignmentId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate assignment
		var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/assignment', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		// get the project
		return r.table('projects').get(projectId).do(function(project){
			var delta = {
				assignments: {},
				updated: r.now().toEpochTime()
			}; delta.assignments[assignmentId] = data;

			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found"}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){

					// add user context
					return projectModel.addContext(r.expr(user), project).do(function(project){

						// check authorizations
						return r.branch(
							project('authorizations')('update:assignments').eq(false),
							r.error('{"code": 403, "message": "You are not permitted to update this project."}'),

							// get assignment
							r.branch(
								project('assignments').hasFields(assignmentId).not(),
								r.error('{"code": 404, "message": "Assignment not found"}'),
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
										r.error('{"code": 403, "message": "You are not permitted to make this assignment."}'),

										// update the project
										r.branch(
											r.table('projects').get(projectId).replace(write)('errors').gt(0),
											r.error('{"code": 500, "message": "Error writing to the database."}'),

											// return new value
											write('assignments')(assignmentId)
										)
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
	}


	function saveAssignment(conn, projectId, assignmentId, data, user){
		if(!user) return Q.reject(401);

		// validate id
		if(assignmentId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate assignment
		var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/assignment', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});


		// get the project
		return r.table('projects').get(projectId).do(function(project){
			var delta = {
				assignments: {},
				updated: r.now().toEpochTime()
			}; delta.assignments[assignmentId] = r.literal(data);

			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found"}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){

					// add user context
					return projectModel.addContext(r.expr(user), project).do(function(project){

						// check authorizations
						return r.branch(
							project('authorizations')('update:assignments').eq(false),
							r.error('{"code": 403, "message": "You are not permitted to update this project."}'),
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
									r.error('{"code": 403, "message": "You are not permitted to make this assignment."}'),
									r.branch(
										r.table('projects').get(projectId).replace(write)('errors').gt(0),
										r.error('{"code": 500, "message": "Error writing to the database."}'),

										// return new value
										write('assignments')(assignmentId)
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
	}


	function deleteAssignment(conn, projectId, assignmentId, user){
		if(!user) return Q.reject(401);

		// get the project
		return r.table('projects').get(projectId).do(function(project){
			var delta = {
				assignments: {},
				updated: r.now().toEpochTime()
			}; delta.assignments[assignmentId] = true;

			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found."}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){

					// add user context
					return projectModel.addContext(r.expr(user), project).do(function(project){

						// check authorizations
						return r.branch(
							project('authorizations')('update:assignments').default(false).not(),
							r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

							// get assignment
							r.branch(
								project('assignments').hasFields(assignmentId).not(),
								r.error('{"code": 404, "message": "Assignment not found."}'),

								// check visibility and assignability
								r.branch(
									r.or(
										cycleModel.visibleTo(project('assignments')(assignmentId), project('role'), cycle).not(),
										cycleModel.assignableBy(project('assignments')(assignmentId), project('role'), cycle).not()
									),
									// this would really be 403, but we want to pretend that the assignment does not exist
									r.error('{"code": 404, "message": "Assignment not found."}'),

									// update the project
									project.without(delta).do(function(write){
										return r.branch(
											r.table('projects').get(projectId).replace(write)('errors').gt(0),
											r.error('{"code": 500, "message": "Error writing to the database."}'),

											// return old value
											project('assignments')(assignmentId)
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
	}

};
