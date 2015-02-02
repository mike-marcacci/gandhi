'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var projectModel = require('../../models/projects.js');
var cycleModel = require('../../models/cycles.js');

function prepare(o){
	if(_.isArray(o))
		return _.map(o, prepare);

	return _.assign(o, {href: 'api/projects/' + o.project_id + '/contents/' + o.id});
}

function sanitize(o) {
	delete o.href;
	delete o.authorizations;
	return o;
}

module.exports = function(config, resources) {

	function getContent(req) {
		return r.table('projects').get(req.params.project).do(function(project){
			return r.branch(
				project.not(),
				r.error('{"code": 404, "message": "Project not found"}'),

				// get the cycle
				r.table('cycles').get(project('cycle_id')).do(function(cycle){
					return r.branch(
						cycle.and(cycle('stages').hasFields(req.params.content)).not(),
						r.error('{"code": 404, "message": "Stage not found"}'),

						// build the project
						projectModel.read(r.expr({id: req.user.id, admin: req.user.admin}), project)

						// enforce project-level access control
						.do(function(project){
							return r.branch(
								project('authorizations')('read').eq(false),
								r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

								// return the models necessary for a component
								{
									cycle: cycleModel.sanitize(cycleModel.read(r.expr({id: req.user.id, admin: req.user.admin}), cycle)),
									stage: cycle('stages')(req.params.content),
									project: projectModel.sanitize(project),
									content: project('contents')(req.params.content).default({id: req.params.content, status_id: 'none'})
									.merge(function(content){

										// make sure this stage is visible
										return r.branch(
											projectModel.hasPermission(cycle('stages')(req.params.content)('visible'), project('role'), project('events')).not(),
											r.error('{"code": 403, "message": "You are not permitted to view this stage."}'),
											// calculate the component authorizations
											{ authorizations: projectModel.processPermissions(cycle('stages')(req.params.content)('component')('permissions'), project) }
										);
									})
								}
							);
						})
					);
				})
			);
		});
	}

	return {
		list: function(req, res, next) {
			if(!req.user) return next(401);
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the project
				r.table('projects').get(req.params.project).do(function(project){
					return r.branch(
						project.not(),
						r.error('{"code": 404, "message": "Project not found"}'),

						// get the cycle
						r.table('cycles').get(project('cycle_id')).do(function(cycle){
							return projectModel.read(r.expr({id: req.user.id, admin: req.user.admin}), project)

							// enforce project-level access control
							.do(function(project){
								return r.branch(
									project('authorizations')('read').eq(false),
									r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

									// return the models necessary for a component
									{
										cycle: cycleModel.sanitize(cycleModel.read(r.expr({id: req.user.id, admin: req.user.admin}), cycle)),
										stages: cycle('stages'),
										project: projectModel.sanitize(project),
										contents: cycle('stages').coerceTo('array').map(function(s){
											return [
												s.nth(0),
												project('contents')(s.nth(0))

												// add defaults
												.default({id: s.nth(0), data: {}, status_id: 'none'})

												// calculate authorizations
												.merge(function(content){
													return { authorizations: projectModel.processPermissions(s.nth(1)('component')('permissions'), project) };
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
				})
				.run(conn)

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
				})
				.then(function(contents){
					return res.send(prepare(contents));
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},
		
		get: function(req, res, next) {
			if(!req.user) return next(401);
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the project
				getContent(req)
				.run(conn)

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
				})
				.then(function(content){
					return res.send(prepare(content));
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		put: function(req, res, next) {
			if(!req.user) return next(401);

			// validate id
			if(req.params.content !== req.body.id) return next({code: 400, message: 'The request body\'s id did not match the URL param.'});

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', req.body, {useDefault: true});
			if(err) return next({code: 400, message: err});

			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the project
				getContent(req)
				.run(conn)

				// pass to the component
				.then(function(result){

					// if the component isn't registered server side
					if(!resources.components[result.stage.component.name])
						return req.body;

					// pass to the component
					return resources.components[result.stage.component.name].content.patch(
						req.body,
						result.content,
						result.stage,
						result.project,
						result.cycle
					);
				})

				// update the content
				.then(function(content){

					// validate the component's response
					var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', content, {useDefault: true});
					if(err) return Q.reject({code: 500, message: err});

					// build the update
					var changes = {contents: {}}; changes.contents[req.params.content] = r.literal(content);

					return r.table('projects').get(req.params.project).do(function(project){
						projectModel.write(project.merge(changes)).do(function(data){
							return r.branch(
								project.replace(data)('errors').gt(0),
								r.error('{"code": 404, "message": "Stage not found"}'),
								projectModel.sanitize(projectModel.read(data))
							);
						});
					})

					.run(conn);
				})

				.then(function(content){
					return res.send(prepare(content));
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		patch: function(req, res, next) {
			if(!req.user) return next(401);

			// validate id
			if(typeof req.body.id !== 'undefined' && req.params.content !== req.body.id) return next({code: 400, message: 'The request body\'s id did not match the URL param.'});

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', req.body, {checkRequired: false});
			if(err) return next({code: 400, message: err});

			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the project
				getContent(req)
				.run(conn)

				// pass to the component
				.then(function(result){

					// if the component isn't registered server side
					if(!resources.components[result.stage.component.name])
						return req.body;

					// pass to the component
					return resources.components[result.stage.component.name].content.patch(
						req.body,
						result.content,
						result.stage,
						result.project,
						result.cycle
					);
				})

				// update the content
				.then(function(content){

					// validate the component's response
					var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', content, {useDefault: true});
					if(err) return Q.reject({code: 500, message: err});

					// build the update
					var changes = {contents: {}}; changes.contents[req.params.content] = content;

					return r.table('projects').get(req.params.project).do(function(project){
						projectModel.write(project.merge(changes)).do(function(data){
							return r.branch(
								project.replace(data)('errors').gt(0),
								r.error('{"code": 404, "message": "Stage not found"}'),
								projectModel.sanitize(projectModel.read(data))
							);
						});
					})

					.run(conn);
				})

				.then(function(content){
					return res.send(prepare(content));
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		// TODO: at some point we may have a need for a delete method,
		// but I can't think of a good use case right now
		delete: function(req, res, next) {
			return next(405);
		}
	};
};
