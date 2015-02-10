'use strict';

var _ = require('lodash');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// TODO: build query from req.query
				var query = {};

				resources.collections.Stage.query(
					conn,
					req.params.cycle,
					query,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(stages){
					res.send(stages);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Stage.get(
					conn,
					req.params.cycle,
					req.params.stage,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(stage){
					res.send(stage);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Stage.save(
					conn,
					req.params.cycle,
					req.params.stage,
					req.body,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(stage){
					res.send(stage);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Stage.update(
					conn,
					req.params.cycle,
					req.params.stage,
					req.body,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(stage){
					res.send(stage);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Stage.create(
					conn,
					req.params.cycle,
					req.body,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(stage){
					res.status(201).send(stage);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Stage.delete(
					conn,
					req.params.cycle,
					req.params.stage,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(stage){
					res.send(stage);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
