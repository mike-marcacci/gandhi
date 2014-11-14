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

										// merge cycle and project-level assignments
										cycle('assignments').merge(project('assignments'))

										// enforce assignment-level access control
										.coerceTo('array').filter(function(s){
											return projectModel.visibleTo(s.nth(1), project('role'), cycle);
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
			}
		}
	);
}