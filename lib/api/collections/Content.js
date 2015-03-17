'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var collection = require('../collection.js');
var cycleModel = require('../models/cycles.js');
var projectModel = require('../models/projects.js');

function removeContext(content) {
	return _.omit(content, ['authorizations']);
}

module.exports = function Content(config, resources) {
	return {
		query: queryContents,
		get: getContent,
		save: saveContent,
		update: updateContent
	};

	// PRIVATE
	function _getContentDependencies(conn, projectId, contentId, user, permission){
		permission = permission || 'project/contents:read';

		// get the project
		return r.table('projects').get(projectId).do(function(project){
			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found"}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){
					return r.branch(
						cycle.and(cycle('stages').hasFields(contentId)).not(),
						r.error('{"code": 404, "message": "Stage not found"}'),

						// add user context
						projectModel.addContext(r.expr(user), project).do(function(project){

							// check authorizations
							return r.branch(
								project('authorizations')(permission).default(false).not(),
								r.error('{"code": 403, "message": "You are not permitted to view this project\'s contents."}'),

								// return the models necessary for a component
								{
									cycle: cycleModel.stripCollections(cycleModel.addContext(r.expr(user), cycle)),
									stage: cycle('stages')(contentId),
									project: projectModel.stripCollections(project),
									content: project('contents')(contentId).default({id: contentId, data: {}, status_id: 'none'})
									.merge(function(content){

										// make sure this stage is visible
										return r.branch(
											projectModel.hasPermission(cycle('stages')(contentId)('visible'), project('role'), project('events')).not(),
											r.error('{"code": 403, "message": "You are not permitted to view this stage."}'),

											{
												// calculate the component authorizations
												authorizations: projectModel.processPermissions(cycle('stages')(contentId)('component')('permissions'), project, project('role')),

												// apply the project id
												project_id: project('id')
											}
										);
									})
								}
							);
						})
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function queryContents(conn, projectId, query, user){
		if(!user) return Q.reject(401);

		// get the project
		return r.table('projects').get(projectId).do(function(project){
			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found"}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){

					// add user context
					return projectModel.addContext(r.expr(user), project).do(function(project){

						// check authorizations
						return r.branch(
							project('authorizations')('project/contents:read').default(false).not(),
							r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

							// return the models necessary for a component
							{
								cycle: cycleModel.stripCollections(cycleModel.addContext(r.expr(user), cycle)),
								stages: cycle('stages'),
								project: projectModel.stripCollections(project),
								contents: cycle('stages').coerceTo('array').map(function(s){
									return [
										s.nth(0),
										project('contents')(s.nth(0))

										// add defaults
										.default({id: s.nth(0), data: {}, status_id: 'none'})

										.merge(function(content){
											return {
												// calculate the component authorizations
												authorizations: projectModel.processPermissions(s.nth(1)('component')('permissions'), project, project('role')),

												// add the project id
												project_id: project('id')
											};
										})
									];
								})

								// only show visible stages
								.filter(function(c){
									return projectModel.hasPermission(cycle('stages')(c.nth(0))('visible'), project('role'), project('events'));
								})
								.coerceTo('object')
							}
						);
					});
				})
			);
		}).run(conn)

		// pass to the components
		.then(function(result){
			return Q.all(_.map(_.sortBy(result.contents, function(content){ return result.stages[content.id].order; }), function(content) {

				// if the component isn't registered server side
				if(!resources.components[result.stages[content.id].component.name])
					return content;

				// pass to the component
				return resources.components[result.stages[content.id].component.name].content.get(
					content,
					result.stages[content.id],
					result.project,
					result.cycle
				);
			}));
		});
	}


	function getContent(conn, projectId, contentId, user){
		if(!user) return Q.reject(401);

		// get the dependencies
		return _getContentDependencies(conn, projectId, contentId, user, 'project/contents:read')

		// pass to the component
		.then(function(result){

			// if the component isn't registered server side
			if(!resources.components[result.stage.component.name])
				return result.content;

			// pass to the component
			return resources.components[result.stage.component.name].content.get(
				result.content,
				result.stage,
				result.project,
				result.cycle
			);
		});
	}


	function updateContent(conn, projectId, contentId, data, user){
		if(!user) return Q.reject(401);

		// remove user context
		data = removeContext(data);

		// validate id
		if(typeof data.id !== 'undefined' && contentId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate content
		var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		// get the dependencies
		return _getContentDependencies(conn, projectId, contentId, user, 'project/contents:write')

		// pass to the component
		.then(function(result){

			// if the component isn't registered server side
			if(!resources.components[result.stage.component.name])
				return data;

			// pass to the component
			return resources.components[result.stage.component.name].content.update(
				data,
				result.content,
				result.stage,
				result.project,
				result.cycle
			);
		})

		// update the project
		.then(function(content){

			// validate the component's response
			var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', content, {checkRequired: false});
			if(err) return Q.reject({code: 500, message: err});

			// get the project
			return r.table('projects').get(projectId).do(function(project){
				var delta = {
					contents: {},
					updated: r.now().toEpochTime()
				}; delta.contents[contentId] = project('contents')(contentId).default({id: contentId, data: {}, status_id: 'none'}).merge(content);

				return r.branch(
					project.not(),
					r.error('{"code": 404, "message": "Project not found"}'),

					// get the cycle
					r.table('cycles').get(project('cycle_id')).do(function(cycle){
						return r.branch(
							r.or(cycle.not(), cycle('stages').hasFields(contentId).not()),
							r.error('{"code": 404, "message": "Stage does not exist"}'),

							// update the project
							project.merge(delta).do(function(write){
								return r.branch(
									r.table('projects').get(projectId).replace(write)('errors').gt(0),
									r.error('{"code": 500, "message": "Error writing to the database."}'),

									// return new value
									write('contents')(contentId).merge({
										project_id: project('id')
									})
								);
							})
						);
					})
				);
			}).run(conn)

		// parse errors
		.catch(collection.throwError);
		});
	}


	function saveContent(conn, projectId, contentId, data, user){
		if(!user) return Q.reject(401);

		// remove user context
		data = removeContext(data);

		// validate id
		if(contentId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate content
		var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// get the dependencies
		return _getContentDependencies(conn, projectId, contentId, user, 'project/contents:write')

		// pass to the component
		.then(function(result){

			// if the component isn't registered server side
			if(!resources.components[result.stage.component.name])
				return data;

			// pass to the component
			return resources.components[result.stage.component.name].content.save(
				data,
				result.content,
				result.stage,
				result.project,
				result.cycle
			);
		})

		// update the project
		.then(function(content){

			// validate the component's response
			var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', content, {checkRequired: false});
			if(err) return Q.reject({code: 500, message: err});

			// get the project
			return r.table('projects').get(projectId).do(function(project){
				var delta = {
					contents: {},
					updated: r.now().toEpochTime()
				}; delta.contents[contentId] = r.literal(content);

				return r.branch(
					project.not(),
					r.error('{"code": 404, "message": "Project not found"}'),

					// get the cycle
					r.table('cycles').get(project('cycle_id')).do(function(cycle){
						return r.branch(
							r.or(cycle.not(), cycle('stages').hasFields(contentId).not()),
							r.error('{"code": 404, "message": "Stage does not exist"}'),

							// update the project
							project.merge(delta).do(function(write){
								return r.branch(
									r.table('projects').get(projectId).replace(write)('errors').gt(0),
									r.error('{"code": 500, "message": "Error writing to the database."}'),

									// return new value
									write('contents')(contentId).merge({
										project_id: project('id')
									})
								);
							})
						);
					})
				);
			}).run(conn)

		// parse errors
		.catch(collection.throwError);
		});
	}

};
