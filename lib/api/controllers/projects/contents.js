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
			get: function(req, res, next) {
				if(!req.user) return next(401);
				return resources.db.acquire(function(err, conn){
					if(err) return next(err);

					// get the project
					r.table('projects').get(req.params.project).do(function(project){
						return r.branch(
							project.eq(null),
							r.error('{"code": 404, "message": "Project not found"}'),

							// get the cycle
							r.table('cycles').get(project('cycle_id')).do(function(cycle){
								var role = _projects.getRole(req.user.id, project, cycle);
								return r.branch(
									cycle.eq(null).or(cycle('stages').hasFields(req.params.content).not()	),
									r.error('{"code": 404, "message": "Stage not found"}'),

									// make sure project is visible
									r.branch(
										_projects.hasPermission(role, cycle('visible'), project).not(),
										r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

										// return the models necessary for a component
										{
											cycle: cycle,
											stage: cycle('stages')(req.params.content),
											project: project.merge({role: role}).without(collections),
											content: project('contents')(req.params.content).default(
												resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/content', {id: req.params.content}, {useDefault: true})
											).merge(function(content){

												// make sure the content is visible
												return r.branch(
													_projects.hasPermission(role, cycle('stages')(req.params.content)('visible'), project).not(),
													r.error('{"code": 403, "message": "You are not permitted to view this content."}'),
													{
														// calculate the component permissions
														permissions: cycle('stages')(req.params.content)('component')('permissions').coerceTo('array').map(function(p){
															return [p.nth(0), _projects.hasPermission(role, p.nth(1), project)];
														}).coerceTo('object')
													}
												)
											})
										}
									)
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
							result.project,
							result.content
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