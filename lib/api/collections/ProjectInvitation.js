'use strict';

var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
var errors = require('../errors.js');
var collection = require('../collection.js');
var projectModel = require('../models/projects.js');
var cycleModel = require('../models/cycles.js');


module.exports = function ProjectInvitation(config, resources) {
	return {
		query: queryInvitations,
		get: getInvitation,
		create: createInvitation,
		save: saveInvitation,
		update: updateInvitation,
		delete: deleteInvitation
	};

	function queryInvitations(conn, projectId, query, user){
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

							// get visible invitations
							project('invitations').coerceTo('array').map(function(kv){ return kv.nth(1).merge({ project_id: project('id') }); }).filter(function(invitation){
								return cycleModel.visibleTo(invitation, project('role'), cycle);
							})
						);
					});
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function getInvitation(conn, projectId, invitationId, user){
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

							// get invitation
							r.branch(
								project('invitations').hasFields(invitationId).not(),
								r.error('{"error": "NotFoundError", "message": "Invitation not found."}'),

								// check visibility
								r.branch(
									cycleModel.visibleTo(project('invitations')(invitationId), project('role'), cycle).not(),
									// this would really be 403, but we want to pretend that the invitation does not exist
									r.error('{"error": "NotFoundError", "message": "Invitation not found."}'),

									// return the invitation
									project('invitations')(invitationId).merge({
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

	function createInvitation(conn, cycleId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// validate lack of id
		if(data.id) return Q.reject(new errors.ValidationError('No id should be set.'));

		// set new id
		var invitationId = data.id = uuid();

		// save
		return saveInvitation(conn, cycleId, invitationId, data, user);
	}


	function updateInvitation(conn, projectId, invitationId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// validate id
		if(typeof data.id !== 'undefined' && invitationId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate invitation
		var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/invitation', data, {checkRequired: false});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this project
		var lock = new resources.lock('project:' + projectId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('projects').get(projectId).do(function(project){
				var delta = {
					invitations: {},
					updated: r.now().toEpochTime()
				}; delta.invitations[invitationId] = data;

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

								// get invitation
								r.branch(
									project('invitations').hasFields(invitationId).not(),
									r.error('{"error": "NotFoundError", "message": "Invitation not found"}'),
									project.merge(delta).do(function(write){

										// check visibility and assignability
										return r.branch(
											r.or(

												// check authorizations against any existing invitation
												r.and(
													project('invitations').hasFields(invitationId),
													r.or(
														cycleModel.visibleTo(project('invitations')(invitationId), project('role'), cycle).not(),
														cycleModel.assignableBy(project('invitations')(invitationId), project('role'), cycle).not()
													)
												),

												// check authorizations against the new invitation
												r.or(
													cycleModel.visibleTo(write('invitations')(invitationId), project('role'), cycle).not(),
													cycleModel.assignableBy(write('invitations')(invitationId), project('role'), cycle).not()
												)
											),
											r.error('{"error": "ForbiddenError", "message": "You are not permitted to make this invitation."}'),

											// TODO: processWriteHooks

											// update the project
											r.table('projects').get(projectId).update(delta, {returnChanges: true}).do(function(result){
												return r.branch(
													result('errors').gt(0),
													r.error('{"error": "Error", "message": "Error writing to the database."}'),

													// return new value
													result('changes').nth(0)('new_val')('invitations')(invitationId).merge({
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


	function saveInvitation(conn, projectId, invitationId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// validate id
		if(invitationId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate invitation
		var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/invitation', data, {useDefault: true});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this project
		var lock = new resources.lock('project:' + projectId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('projects').get(projectId).do(function(project){
				var delta = {
					invitations: {},
					updated: r.now().toEpochTime()
				}; delta.invitations[invitationId] = r.literal(data);

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

											// check authorizations against any existing invitation
											r.and(
												project('invitations').hasFields(invitationId).not(),
												r.or(
													cycleModel.visibleTo(project('invitations')(invitationId), project('role'), cycle).not(),
													cycleModel.assignableBy(project('invitations')(invitationId), project('role'), cycle).not()
												)
											),

											// check authorizations against the new invitation
											r.or(
												cycleModel.visibleTo(write('invitations')(invitationId), project('role'), cycle).not(),
												cycleModel.assignableBy(write('invitations')(invitationId), project('role'), cycle).not()
											)
										),
										r.error('{"error": "ForbiddenError", "message": "You are not permitted to make this invitation."}'),
										r.branch(
											r.table('projects').get(projectId).replace(write)('errors').gt(0),
											r.error('{"error": "Error", "message": "Error writing to the database."}'),

											// return new value
											write('invitations')(invitationId).merge({
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


	function deleteInvitation(conn, projectId, invitationId, user){
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

				var without = { invitations: {} };
				without.invitations[invitationId] = true;

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

								// get invitation
								r.branch(
									project('invitations').hasFields(invitationId).not(),
									r.error('{"error": "NotFoundError", "message": "Invitation not found."}'),

									// check visibility and assignability
									r.branch(
										r.or(
											cycleModel.visibleTo(project('invitations')(invitationId), project('role'), cycle).not(),
											cycleModel.assignableBy(project('invitations')(invitationId), project('role'), cycle).not()
										),
										// this would really be 403, but we want to pretend that the invitation does not exist
										r.error('{"error": "NotFoundError", "message": "Invitation not found."}'),

										// update the project
										project.without(without).merge(delta).do(function(write){
											return r.branch(
												r.table('projects').get(projectId).replace(write)('errors').gt(0),
												r.error('{"error": "Error", "message": "Error writing to the database."}'),

												// return old value
												project('invitations')(invitationId).merge({
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
