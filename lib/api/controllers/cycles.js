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

				resources.collections.Cycle.query(
					conn,
					query,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycles){

					// set pagination headers
					return res.set(controller.makePageHeaders(
						query.skip,
						query.limit,
						cycles.total,
						req.path,
						req.query
					))

					// send the results
					.send(cycles);
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
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
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
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
