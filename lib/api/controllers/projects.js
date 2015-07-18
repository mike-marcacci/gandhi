'use strict';

var Q = require('q');
var _ = require('lodash');
var controller = require('../controller.js');

module.exports = function(config, resources) {


	var map = {
		assignments: resources.collections.ProjectAssignment,
		contents: resources.collections.Content
	};



	function getIncludes(conn, project, req){
		var includes = controller.parseIncludes(req.query.includes, map);
		if(!includes) return project;

		// fetch the includes
		return Q.all(_.map(includes, function(key){
			return map[key].query(
				conn,
				project.id,
				null,
				req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
			);
		}).filter(function(n){ return n; }))

		// append to the project
		.then(function(results){
			includes.forEach(function(key, i){
				project[key] = _.indexBy(results[i], 'id');
			});
			return project;
		});
	}



	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// parse the query
				var query = controller.parseQuery(req.query);

				// restrict to a given cycle
				if(req.params.cycle || req.query.cycle)
					query.cycleId = req.params.cycle || req.query.cycle;

				// restrict to a given user
				if(req.params.user || req.query.user)
					query.userId = req.params.user || req.query.user;

				resources.collections.Project.query(
					conn,
					query,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.then(function(projects){
					return Q.all(projects.map(function(project){
						return getIncludes(conn, project, req);
					}))
					.then(function(results){
						results.total = projects.total;
						return results;
					});
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(projects){

					// set pagination headers
					return res.set(controller.makePageHeaders(
						query.skip,
						query.limit,
						projects.total,
						req.path,
						req.query
					))

					// send the results
					.send(

						// hide exports from non-admin users
						req.user && req.user.admin && req.query.admin === 'true' ?
							projects
							: projects.map(function(p){ delete p.exports; return p; })

					);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Project.get(
					conn,
					req.params.project,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.then(function(project){
					return getIncludes(conn, project, req);
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){

					// hide exports from non-admin users
					if(!req.user || !req.user.admin || req.query.admin !== 'true')
						delete project.exports;

					res.send(project);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Project.save(
					conn,
					req.params.project,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.then(function(project){
					return getIncludes(conn, project, req);
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){

					// hide exports from non-admin users
					if(!req.user || !req.user.admin || req.query.admin !== 'true')
						delete project.exports;
					
					res.send(project);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Project.update(
					conn,
					req.params.project,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.then(function(project){
					return getIncludes(conn, project, req);
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){

					// hide exports from non-admin users
					if(!req.user || !req.user.admin || req.query.admin !== 'true')
						delete project.exports;
					
					res.send(project);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Project.create(
					conn,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.then(function(project){
					return getIncludes(conn, project, req);
				})
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){

					// hide exports from non-admin users
					if(!req.user || !req.user.admin || req.query.admin !== 'true')
						delete project.exports;
					
					res.status(201).send(project);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Project.delete(
					conn,
					req.params.project,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){

					// hide exports from non-admin users
					if(!req.user || !req.user.admin || req.query.admin !== 'true')
						delete project.exports;
					
					res.send(project);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
