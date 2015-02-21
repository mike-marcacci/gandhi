'use strict';

var _ = require('lodash');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// TODO: build query from req.query
				var query = {};

				resources.collections.ProjectAssignment.query(
					conn,
					req.params.project,
					query,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignments){
					res.send(assignments);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.ProjectAssignment.get(
					conn,
					req.params.project,
					req.params.assignment,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.ProjectAssignment.save(
					conn,
					req.params.project,
					req.params.assignment,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return res.status(405).send();
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.ProjectAssignment.update(
					conn,
					req.params.project,
					req.params.assignment,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.ProjectAssignment.delete(
					conn,
					req.params.project,
					req.params.assignment,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
