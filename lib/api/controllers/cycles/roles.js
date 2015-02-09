'use strict';

var _ = require('lodash');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// TODO: build query from req.query
				var query = {};

				resources.collections.Role.query(
					conn,
					req.params.cycle,
					query,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(roles){
					res.send(roles);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Role.get(
					conn,
					req.params.cycle,
					req.params.role,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(role){
					res.send(role);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Role.save(
					conn,
					req.params.cycle,
					req.params.role,
					req.body,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(role){
					res.send(role);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Role.update(
					conn,
					req.params.cycle,
					req.params.role,
					req.body,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(role){
					res.send(role);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Role.create(
					conn,
					req.params.cycle,
					req.body,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(role){
					res.status(201).send(role);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Role.delete(
					conn,
					req.params.cycle,
					req.params.role,
					req.user && req.user.admin  ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(role){
					res.send(role);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
