'use strict';

var Promise     = require('bluebird');
var controller  = require('../../controller');
var errors      = require('../../errors');
var using       = Promise.using;

var Cycles      = require('../../collections/Cycles');
var cycles      = new Cycles();

var Stage       = require('../../models/Cycle/Stage');

function prepare(record) {
	return record;
}

module.exports = function(config, resources) {




	// This contains globally accessible components
	// TODO: this feels really dirty, and breaks some of the separation of responsibility
	// that the models provide. I need to think through a cleaner way to configure this.
	Stage.components = resources.components;







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

				// query the stages
				.then(function(cycle) {
					return cycle.stages.query(conn, query);
				});
			})

			.then(function(stages) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					cycles.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(stages));
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

				// get the stage
				.then(function(cycle){
					return cycle.stages.get(conn, req.params.stage);
				});
			})

			.then(function(stage) {
				res.send(prepare(stage));
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

				if(typeof req.body.id !== 'undefined' && req.body.id !== req.params.stage)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the stage
				.then(function(cycle){
					return cycle.stages.get(conn, req.params.stage);
				})

				// update the stage
				.then(function(stage){
					return stage.update(conn, req.body);
				});
			})
			.then(function(cycle) {
				res.send(prepare(cycle));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		create: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				if(req.body.id !== req.params.stage)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// create the stage
				.then(function(cycle){
					return cycle.stages.create(conn, req.body);
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

				// get the stage
				.then(function(cycle) {
					return cycle.stages.get(conn, req.params.stage);
				})

				// delete the stage
				.then(function(stage){
					return stage.delete(conn);
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
