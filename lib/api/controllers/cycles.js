'use strict';

var _          = require('lodash');
var Promise    = require('bluebird');
var controller = require('../controller.js');
var errors     = require('../errors.js');
var using      = Promise.using;

var Cycle      = require('../models/Cycle');
var Cycles     = require('../collections/Cycles');
var cycles     = new Cycles();

var Projects   = require('../collections/Projects');
var projects   = new Projects();

function prepare(record) {
	return record;
}

module.exports = function(config, resources) {
	return {
		query: function(req, res, next) {
			
			// parse the query
			var query = controller.parseQuery(req.query);

			return using(resources.db.disposer(), function(conn) {
				return cycles.query(
					conn,
					query,
					req.admin || req.user
				);
			})

			.then(function(cycles) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					cycles.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(cycles));
			})
			.catch(next);
		},

		get: function(req, res, next) {
			return using(resources.db.disposer(), function(conn) {
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				);
			})

			.then(function(cycle) {
				res.send(prepare(cycle));
			})
			.catch(next);
		},

		save: function(req, res, next) {
			return res.status(405).send();
		},

		update: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)
				.then(function(cycle) {
					return cycle.update(conn, req.body);
				});
			})

			.then(function(cycle) {
				res.send(prepare(cycle));
			})
			.catch(next);
		},

		create: function(req, res, next) {
			return using(resources.db.disposer(), function(conn) {

				// duplicate an existing cycle
				if(req.query.copy) return cycles.get(conn, req.query.copy, req.admin || req.user)
				.then(function(basis) { return basis.raw(); })
				.then(function(raw) {
					return Cycle.create(conn, _.assign(raw, req.body), req.admin || req.user);
				});


				// create cycle from scratch
				return Cycle.create(conn, req.body, req.admin || req.user);
			})

			.then(function(cycle) {
				res.status(201).send(prepare(cycle));
			})
			.catch(next);
		},

		delete: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)
				.then(function(cycle) {
					return projects.query(conn, {cycleId: cycle.id}, true)
					.then(function(projects) {

						// make sure the cycle doesn't have any projects
						if(projects.length)
							return Promise.reject(new errors.LockedError('Unable to delete a cycle that has projects.'));

						return cycle.delete(conn);
					});
				});
			})

			.then(function(cycle) {
				res.send(prepare(cycle));
			})
			.catch(next);
		}

	};
};
