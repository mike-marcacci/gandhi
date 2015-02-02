'use strict';

var _ = require('lodash');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Status.query(
					conn,
					req.params.cycle,
					req.query,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(statuses){
					res.send(statuses);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Status.get(
					conn,
					req.params.cycle,
					req.params.status,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(status){
					res.send(status);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Status.save(
					conn,
					req.params.cycle,
					req.params.status,
					req.body,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(status){
					res.send(status);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Status.update(
					conn,
					req.params.cycle,
					req.params.status,
					req.body,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(status){
					res.send(status);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Status.create(
					conn,
					req.params.cycle,
					req.body,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(status){
					res.send(status);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Status.delete(
					conn,
					req.params.cycle,
					req.params.status,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(status){
					res.send(status);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
