'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var collection = require('../collection.js');
var projectModel = require('../models/projects.js');

function removeContext(project) {
	return _.omit(project, ['role','status','authorizations']);
}

module.exports = function Project(config, resources) {
	return {
		query: queryProjects,
		get: getProject,
		create: createProject,
		save: saveProject,
		update: updateProject,
		delete: deleteProject
	};


	// Query for a lsit of projects
	//
	// query.cycleId
	// query.userId
	// query.search
	// query.filter

	function queryProjects(conn, query, user){
		if(!user) return Q.reject(401);

		// Filter Projects
		// ---------------

		var projects = r.table('projects');

		// restrict to cycle
		if(query.cycleId)
			projects = projects.filter({cycle_id: query.cycleId});

		// restrict to user; TODO: make sure this assignment is visible to the user
		if(query.userId)
			projects = projects.filter(function(project){ return project('assignments').hasFields(query.userId); });

		// search
		if(typeof query.search === 'string' && query.search.length)
			projects = projects.filter(r.row('title').downcase().match(query.search.toLowerCase()));

		// run read queries
		projects = projects.map(function(project) {
			return projectModel.stripCollections(projectModel.addContext(r.expr(user), project));
		});

		// check authorizations
		projects = projects.filter(function(project) {
			return project('authorizations')('project:read').default(false);
		});

		// filter
		if(query.filter) query.filter.forEach(function(f){
			projects = projects.filter(f);
		});




		// Build Result
		// ------------

		var result = projects;

		// sort
		if(query.sort)
			result = result.orderBy.apply(result, query.sort);

		// skip
		if(query.skip)
			result = result.skip(query.skip);

		// limit
		if(query.limit)
			result = result.limit(query.limit);

		return r.expr({

			// get the total results count
			total: projects.count(),

			// get the processed projects
			projects: result.coerceTo('array')

		}).run(conn)

		// return as an array
		.then(function(results){
			results.projects.total = results.total;
			return results.projects;
		});
	}


	function getProject(conn, projectId, user){
		if(!user) return Q.reject(401);

		// get project
		return r.table('projects').get(projectId).do(function(project){

			// 404
			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found"}'),

				// run read queries
				projectModel.stripCollections(projectModel.addContext(r.expr(user), project)).do(function(project){

					// check authorizations
					return r.branch(
						project('authorizations')('project:read').default(false).not(),
						r.error('{"code": 403, "message": "You are not permitted to view this project."}'),
						project
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function createProject(conn, data, user){
		if(!user) return Q.reject(401);

		data = removeContext(data);

		// validate id
		if(data.id) return Q.reject({code: 400, message: 'Project must not already have an id.'});

		// validate project
		var err = resources.validator.validate('http://www.gandhi.io/schema/project', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// get the cycle
		return r.table('cycles').get(data.cycle_id).do(function(cycle){
			var delta = r.expr(data).merge({
				id: r.uuid(),
				created: r.now().toEpochTime(),
				updated: r.now().toEpochTime()
			});

			// apply optional defaults for admins
			if(user === true) {
				delta = delta.merge({
					status_id: data('status_id').default(cycle('defaults')('status_id'))
				});
			}

			// force defaults for non-admin users
			else {
				var assignments = {}; assignments[user.id] = {
					id: user.id,
					role_id: cycle('defaults')('role_id')
				};

				delta = delta.merge({
					status_id: cycle('defaults')('status_id'),
					assignments: r.literal(assignments)
				});
			}

			// make sure the cycle exists
			return r.branch(
				cycle.not(),
				r.error('{"code": 400, "message": "No such cycle"}'),

				// process write hooks
				projectModel.processWriteHooks(delta).do(function(write){

					// add user context
					return projectModel.addContext(r.expr(user), r.expr(write), cycle).do(function(project){

						// check authorizations
						return r.branch(
							project('authorizations')('project:create').default(false).not(),
							r.error('{"code": 403, "message": "You are not permitted to create this project."}'),

							// insert the cycle
							r.table('projects').insert(write).do(function(result){
								return r.branch(
									result('errors').gt(0),
									r.error('{"code": 500, "message": "Error writing to the database."}'),

									// return new value
									projectModel.stripCollections(projectModel.addContext(r.expr(user), write))
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


	function updateProject(conn, projectId, data, user){
		if(!user) return Q.reject(401);

		data = removeContext(data);

		// validate id
		if(typeof data.id !== 'undefined' && projectId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate project
		var err = resources.validator.validate('http://www.gandhi.io/schema/project', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		return r.table('projects').get(projectId).do(function(project){
			var delta = project.merge(projectModel.stripCollections(
				r.expr(data).merge({
					updated: r.now().toEpochTime(),
					created: project('created').default(r.now().toEpochTime())
				})
			));

			// get the project
			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found."}'),

				// add user context
				projectModel.addContext(r.expr(user), project).do(function(project){

					// check authorizations
					return r.branch(
						project('authorizations')('project:update').default(false).not(),
						r.error('{"code": 403, "message": "You are not permitted to update this project."}'),

						// process write hooks
						projectModel.processWriteHooks(delta).do(function(write){

							// update the project
							return r.branch(
								r.table('projects').get(projectId).replace(write)('errors').gt(0),
								r.error('{"code": 500, "message": "Error writing to the database."}'),

								// return new value
								projectModel.stripCollections(projectModel.addContext(r.expr(user), write))
							);
						})
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function saveProject(conn, projectId, data, user){
		if(!user) return Q.reject(401);

		data = removeContext(data);

		// validate id
		if(projectId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate project
		var err = resources.validator.validate('http://www.gandhi.io/schema/project', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		return r.table('projects').get(projectId).do(function(project){
			var delta = project.merge(projectModel.stripCollections(
				r.expr(data).merge({
					updated: r.now().toEpochTime()
				})
			));

			// get the project
			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found."}'),

				// add user context
				projectModel.addContext(r.expr(user), project).do(function(project){

					// check authorizations
					return r.branch(
						project('authorizations')('project:update').default(false).not(),
						r.error('{"code": 403, "message": "You are not permitted to update this project."}'),

						// process write hooks
						projectModel.processWriteHooks(delta).do(function(write){

							// update the project
							return r.branch(
								r.table('projects').get(projectId).replace(write)('errors').gt(0),
								r.error('{"code": 500, "message": "Error writing to the database."}'),

								// return new value
								projectModel.stripCollections(projectModel.addContext(r.expr(user), write))
							);
						})
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function deleteProject(conn, projectId, user){
		if(!user) return Q.reject(401);

		// get project
		return r.table('projects').get(projectId).do(function(project){

			// 404
			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found"}'),

				// run read queries
				projectModel.stripCollections(projectModel.addContext(r.expr(user), project))

				.do(function(project){

					// check authorizations
					return r.branch(
						project('authorizations')('project:delete').default(false).not(),
						r.error('{"code": 403, "message": "You are not permitted to delete this project."}'),

						// delete the project
						r.branch(
							r.table('projects').get(projectId).delete()('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),
							project
						)
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}

};
