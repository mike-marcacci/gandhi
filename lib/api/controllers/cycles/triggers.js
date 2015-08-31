'use strict';

var Promise     = require('bluebird');
var controller  = require('../../controller');
var errors      = require('../../errors');
var using       = Promise.using;

var Cycles      = require('../../collections/Cycles');
var cycles      = new Cycles();

var Projects    = require('../../collections/Projects');
var projects    = new Projects();

function prepare(record) {
	return record;
}

module.exports = function(config, resources) {
	return {
		query: function(req, res, next) {
			
			// parse the query
			var query = controller.parseQuery(req.query);

			// get the cycle
			return using(resources.db.disposer(), function(conn) {
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// query the triggers
				.then(function(cycle) {
					return cycle.triggers.query(conn, query);
				});
			})

			.then(function(triggers) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					cycles.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(triggers));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		get: function(req, res, next) {

			// get the cycle
			return using(resources.db.disposer(), function(conn) {
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the trigger
				.then(function(cycle){
					return cycle.triggers.get(conn, req.params.trigger);
				});
			})

			.then(function(trigger) {
				res.send(prepare(trigger));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		save: function(req, res, next) {
			return res.status(405).send();
		},

		update: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				if(typeof req.body.id !== 'undefined' && req.body.id !== req.params.trigger)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the trigger
				.then(function(cycle){
					return cycle.triggers.get(conn, req.params.trigger);
				})

				// update the trigger
				.then(function(trigger){
					return trigger.update(conn, req.body);
				})

				// update all effected projects
				.then(function(trigger) {
					return projects.query(conn, {cycleId: trigger.parent.id}, true)
					.then(function(projects) {
						return Promise.all(projects.map(function(project) {
							return project.update(conn, {});
						}));
					})
					.then(function(){
						return trigger;
					});
				});
			})
			.then(function(trigger) {
				res.send(prepare(trigger));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		create: function(req, res, next) {
			return using(resources.db.disposer(), function(conn) {

				if(req.body.id !== req.params.trigger)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// create the trigger
				.then(function(cycle){
					return cycle.triggers.create(conn, req.body);
				});
			})

			.then(function(cycle) {
				res.status(200).send(prepare(cycle));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		delete: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the trigger
				.then(function(cycle) {
					return cycle.triggers.get(conn, req.params.trigger);
				})

				// delete the trigger
				.then(function(trigger){
					return trigger.delete(conn);
				});
			})
			.then(function(cycle) {
				res.send(prepare(cycle));
			})
			.catch(function(err) {
				return next(err);
			});
		}

	};
};
