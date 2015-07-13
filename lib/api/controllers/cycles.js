'use strict';

var uuid       = require('../utils/uuid');
var controller = require('../controller');
var Cycle      = require('../models/Cycle');
var Cycles     = require('../collections/Cycles');
var cycles     = new Cycles();

module.exports = function(config, resources) {

	// TODO: process includes

	return {
		query: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// parse the query
				var query = controller.parseQuery(req.query);

				cycles.query(
					conn,
					query,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
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

				cycles.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
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

		save: function(req, res, next){
			return res.status(405).send();
		},

		update: function(req, res, next){

			// TODO: acquire lock
			
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				cycles.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
				)
				.then(function(cycle){
					return cycle.update(conn, req.body);
				})
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

		create: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// generate a new uuid
				req.body.id = uuid();

				// save the cycle
				return new Cycle(req.body, req.user)
				.then(function(cycle){
					return cycle.save(conn);
				})
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

			// TODO: acquire lock
			
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				cycles.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
				)
				.then(function(cycle){
					return cycle.delete(conn);
				})
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
