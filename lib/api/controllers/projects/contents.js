'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');
var _projects = require('./_projects.js');

var collections = ['assignments','invitations','contents'];

module.exports = function(config, resources) {
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
								return _projects.buildProject(r.table('users').get(req.user.id), project)

								// enforce project-level access control
								.do(function(project){
									return r.branch(
										project('permissions')('read').eq(false),
										r.error('{"code": 403, "message": "You are not permitted to view this project."}'),
										
										// return the models necessary for a component
										{
											cycle: cycle,
											stages: cycle('stages'),
											project: project.without(collections),
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
														return { permissions: _projects.processPermissions(s.nth(1)('component')('permissions'), project) }
													})
												];
											})

											// only show visible stages
											.filter(function(c){
												return _projects.hasPermission(cycle('stages')(c.nth(0))('visible'), project)
											})
											.coerceTo('object')
										}
									);
								})
							})
						);
					})
					.run(conn)

					// pass to the components
					.then(function(result){
						return Q.all(_.map(result.contents, function(content, id) {
							return resources.components[result.stages[id].component.name].content.get(
								content,
								result.stages[id],
								result.project
							);
						}))
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
					r.table('projects').get(req.params.project).do(function(project){
						return r.branch(
							project.not(),
							r.error('{"code": 404, "message": "Project not found"}'),

							// get the cycle
							r.table('cycles').get(project('cycle_id')).do(function(cycle){
								return r.branch(
									cycle.and(cycle('stages').hasFields(req.params.content)).not(),
									r.error('{"code": 404, "message": "Stage not found"}'),

									// build the project
									_projects.buildProject(r.table('users').get(req.user.id), project)

									// enforce project-level access control
									.do(function(project){
										return r.branch(
											project('permissions')('read').eq(false),
											r.error('{"code": 403, "message": "You are not permitted to view this project."}'),
											
											// return the models necessary for a component
											{
												cycle: cycle,
												stage: cycle('stages')(req.params.content),
												project: project,
												content: project('contents')(req.params.content).default(
													resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', {id: req.params.content}, {useDefault: true})
												)
												.merge(function(content){

													// make sure this stage is visible
													return r.branch(
														_projects.hasPermission(cycle('stages')(req.params.content)('visible'), project).not(),
														r.error('{"code": 403, "message": "You are not permitted to view this stage."}'),
														// calculate the component permissions
														{ permissions: _projects.processPermissions(cycle('stages')(req.params.content)('component')('permissions'), project) }
													)
												})
											}
										);
									})
								)
							})
						);
					})
					.run(conn)

					// pass to the component
					.then(function(result){
						return resources.components[result.stage.component.name].content.get(
							result.content,
							result.stage,
							result.project
						)
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
			}
		}
	);
}