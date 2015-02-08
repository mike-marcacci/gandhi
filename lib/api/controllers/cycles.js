'use strict';

var _ = require('lodash');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// TODO: build query from req.query
				var query = {};

				resources.collections.Cycle.query(
					conn,
					query,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycles){

					// TODO: apply pagination headers

					res.send(cycles);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycle){
					res.send(cycle);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.save(
					conn,
					req.params.cycle,
					req.body,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycle){
					res.send(cycle);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.update(
					conn,
					req.params.cycle,
					req.body,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycle){
					res.send(cycle);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.create(
					conn,
					req.body,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycle){
					res.status(201).send(cycle);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.delete(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycle){
					res.send(cycle);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
