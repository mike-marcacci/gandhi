'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var projectModel = require('../../models/projects.js');
var cycleModel = require('../../models/cycles.js');

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
						projectModel.build(r.table('users').get(req.user.id), project)

						// enforce project-level access control
						.do(function(project){
							return r.branch(
								project('permissions')('read').eq(false),
								r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

								// return the models necessary for a component
								{
									cycle: cycleModel.sanitize(cycleModel.build(cycle)),
									stage: cycle('stages')(req.params.content),
									project: projectModel.sanitize(project),
									content: project('contents')(req.params.content).default(
										resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', {id: req.params.content}, {useDefault: true})
									)
									.merge(function(content){

										// make sure this stage is visible
										return r.branch(
											projectModel.hasPermission(cycle('stages')(req.params.content)('visible'), project).not(),
											r.error('{"code": 403, "message": "You are not permitted to view this stage."}'),
											// calculate the component permissions
											{ permissions: projectModel.processPermissions(cycle('stages')(req.params.content)('component')('permissions'), project) }
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

	return _.extend(
		require('../_embedded.js')('project', 'projects', 'content', 'contents', config, resources),
		{
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
								return projectModel.build(r.table('users').get(req.user.id), project)

								// enforce project-level access control
								.do(function(project){
									return r.branch(
										project('permissions')('read').eq(false),
										r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

										// return the models necessary for a component
										{
											cycle: cycleModel.sanitize(cycleModel.build(cycle)),
											stages: cycle('stages'),
											project: projectModel.sanitize(project),
											contents: cycle('stages').coerceTo('array').map(function(s){
												return [
													s.nth(0),
													project('contents')(s.nth(0))

													// add defaults
													.default(
														resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', {id: s.nth(0)}, {useDefault: true})
													)

													// calculate permissions
													.merge(function(content){
														return { permissions: projectModel.processPermissions(s.nth(1)('component')('permissions'), project) };
													})
												];
											})

											// only show visible stages
											.filter(function(c){
												return projectModel.hasPermission(cycle('stages')(c.nth(0))('visible'), project);
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
						return Q.all(_.map(result.contents, function(content, id) {

							// if the component isn't registered server side
							if(!resources.components[result.stages[id].component.name])
								return content;

							// pass to the component
							return resources.components[result.stages[id].component.name].content.get(
								content,
								result.stages[id],
								result.project
							);
						}));
					})
					.then(function(contents){
						return res.send(contents);
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
							result.project
						);
					})
					.then(function(content){
						return res.send(content);
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
							return result.content;

						// pass to the component
						return resources.components[result.stage.component.name].content.patch(
							result.content,
							result.stage,
							result.project
						);
					})

					// update the content
					.then(function(content){
						var update = {contents: {}};
						update.contents[req.params.content] = r.row('contents')(req.params.content).default(
							resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', {id: req.params.content}, {useDefault: true})
						).merge(content);
						return r.table('projects')
						.get(req.params.project)
						.update(update, {returnChanges: true})
						.run(conn)
					})
					.then(function(changes){
						return res.send(changes[0].new_val);
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
							return result.content;

						// pass to the component
						return resources.components[result.stage.component.name].content.patch(
							result.content,
							result.stage,
							result.project
						);
					})

					// update the content
					.then(function(content){
						var update = {contents: {}};
						update.contents[req.params.content] = r.row('contents')(req.params.content).default(
							resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', {id: req.params.content}, {useDefault: true})
						).merge(content);

						return r.table('projects')
						.get(req.params.project)
						.update(update, {returnChanges: true})
						.run(conn)
					})
					.then(function(changes){
						return res.send(changes[0].new_val);
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
		}
	);
}