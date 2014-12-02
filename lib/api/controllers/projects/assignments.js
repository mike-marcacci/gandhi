'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

var projectModel = require('../../models/projects.js');
var cycleModel = require('../../models/cycles.js');

module.exports = function(config, resources) {
	return _.extend(
		require('../_embedded.js')('project', 'projects', 'assignment', 'assignments', config, resources),
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

										// enforce assignment-level access control
										project('assignments').coerceTo('array').filter(function(s){
											return cycleModel.visibleTo(s.nth(1), project('role'), cycle);
										}).map(function(s){
											return s.nth(1);
										})
									);
								});
							})
						);
					})
					.run(conn)
					.then(function(assignments){
						return res.send(assignments);
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
								return projectModel.build(r.table('users').get(req.user.id), project)

								// enforce project-level access control
								.do(function(project){
									return r.branch(
										project('permissions')('update').eq(false),
										r.error('{"code": 403, "message": "You are not permitted to view this project."}'),

										// enforce assignment-level access control
										r.branch(
											project('assignments').hasFields(req.params.assignment).not().or(cycleModel.visibleTo(project('assignments')(req.params.assignment), project('role'), cycle).not()),
											r.error('{"code": 404, "message": "Assignment not found."}'),
											project('assignments')(req.params.assignment)
										)
									);
								});
							})
						);
					})
					.run(conn)
					.then(function(assignments){
						return res.send(assignments);
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
				if(req.params.assignment !== req.body.id) return next({code: 400, message: 'The request body\'s id did not match the URL param.'});

				// validate assignment
				var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/assignment', req.body, {useDefault: true});
				if(err) return next({code: 400, message: err});

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
									var body = r.expr(req.body);

									return r.branch(
										project('permissions')('read').eq(false),
										r.error('{"code": 403, "message": "You are not permitted to view this project."}'),
										r.branch(
											r.or(

												// check permissions against any existing assignment
												r.and(
													project('assignments').hasFields(req.params.assignment),
													r.or(
														cycleModel.visibleTo(project('assignments')(req.params.assignment), project('role'), cycle).not(),
														cycleModel.assignableBy(project('assignments')(req.params.assignment), project('role'), cycle).not()
													)
												),

												// check permissions against the new assignment
												r.or(
													cycleModel.visibleTo(body, project('role'), cycle).not(),
													cycleModel.assignableBy(body, project('role'), cycle).not()
												)
											),
											r.error('{"code": 403, "message": "You are not permitted to make this assignment."}'),
											r.table('projects').get(req.params.project).update(function(project){
												var u = {assignments:{}}; u.assignments[req.params.assignment] = r.literal(body);
												return u;
											}, {returnChanges: true})('changes').nth(0)('new_val')('assignments')(req.params.assignment)
										)
									);
								});
							})
						);
					})
					.run(conn)
					.then(function(assignments){
						return res.send(assignments);
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
				if(typeof req.body.id !== 'undefined' && req.params.assignment !== req.body.id) return next({code: 400, message: 'The request body\'s id did not match the URL param.'});

				// validate assignment
				var err = resources.validator.validate('http://www.gandhi.io/schema/project#/definitions/assignment', req.body, {checkRequired: false});
				if(err) return next({code: 400, message: err});

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
									var body = r.expr(req.body);

									return r.branch(
										project('permissions')('update').eq(false),
										r.error('{"code": 403, "message": "You are not permitted to view this project."}'),
										r.branch(
											project('assignments').hasFields(req.params.assignment).not(),
											r.error('{"code": 404, "message": "Assignment not found."}'),
											r.branch(
												r.or(

													// check permissions against any existing assignment
													r.and(
														project('assignments').hasFields(req.params.assignment),
														r.or(
															cycleModel.visibleTo(project('assignments')(req.params.assignment), project('role'), cycle).not(),
															cycleModel.assignableBy(project('assignments')(req.params.assignment), project('role'), cycle).not()
														)
													),

													// check permissions against the new assignment
													r.and(
														body.hasFields('role'),
														cycleModel.visibleTo(body, project('role'), cycle).not(),
														cycleModel.assignableBy(body, project('role'), cycle).not()
													)
												),
												r.error('{"code": 403, "message": "You are not permitted to make this assignment."}'),
												r.table('projects').get(req.params.project).update(function(project){
													var u = {assignments:{}}; u.assignments[req.params.assignment] = body;
													return u;
												}, {returnChanges: true})('changes').nth(0)('new_val')('assignments')(req.params.assignment)
											)
										)
									);
								});
							})
						);
					})
					.run(conn)
					.then(function(assignments){
						return res.send(assignments);
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