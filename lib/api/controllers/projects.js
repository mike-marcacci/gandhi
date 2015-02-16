'use strict';

var _ = require('lodash');
var controller = require('../controller.js');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// parse the query
				var query = controller.parseQuery(req.query);

				// restrict to a given user
				if(req.params.user || req.query.user)
					query.userId = req.params.user || req.query.user;

				resources.collections.Project.query(
					conn,
					query,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
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
					.send(projects);
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(project){
					res.send(project);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
