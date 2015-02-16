'use strict';

var Q = require('q');
var _ = require('lodash');
var controller = require('../controller.js');

module.exports = function(config, resources) {


	var map = {
		assignments: resources.collections.CycleAssignment,
		exports: resources.collections.Export,
		roles: resources.collections.Role,
		stages: resources.collections.Stage,
		statuses: resources.collections.Status,
		triggers: resources.collections.Trigger
	};



	function getIncludes(conn, cycle, req){
		var includes = controller.parseIncludes(req.query.includes, map);
		if(!includes) return cycle;

		// fetch the includes
		return Q.all(_.map(includes, function(key){
			return map[key].query(
				conn,
				cycle.id,
				null,
				req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
			);
		}).filter(function(n){ return n; }))

		// append to the cycle
		.then(function(results){
			includes.forEach(function(key, i){
				cycle[key] = _.indexBy(results[i], 'id');
			});
			return cycle;
		});
	}



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
				.then(function(cycles){
					return Q.all(cycles.map(function(cycle){
						return getIncludes(conn, cycle, req);
					}));
				})
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
				.then(function(project){
					return getIncludes(conn, project, req);
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

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.save(
					conn,
					req.params.cycle,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.then(function(project){
					return getIncludes(conn, project, req);
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

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.update(
					conn,
					req.params.cycle,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.then(function(project){
					return getIncludes(conn, project, req);
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

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.create(
					conn,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.then(function(project){
					return getIncludes(conn, project, req);
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
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.delete(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.then(function(project){
					return getIncludes(conn, project, req);
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
