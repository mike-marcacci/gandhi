'use strict';

var Promise    = require('bluebird');
var uuid       = require('../utils/uuid');
var controller = require('../controller.js');
var errors     = require('../errors.js');
var using      = Promise.using;

var Cycles     = require('../collections/Cycles');
var cycles     = new Cycles();

var Project    = require('../models/Project');
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

			// restrict to user
			if(typeof req.query.user === 'string')
				query.userId = req.query.user;

			// restrict to cycle
			if(typeof req.query.cycle === 'string')
				query.cycleId = req.query.cycle;

			return using(resources.db.disposer(), function(conn) {
				return projects.query(
					conn,
					query,
					req.admin || req.user
				);
			})

			.then(function(projects) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					projects.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(projects));
			})
			.catch(next);
		},

		get: function(req, res, next) {
			return using(resources.db.disposer(), function(conn) {
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				);
			})

			.then(function(project) {
				res.send(prepare(project));
			})
			.catch(next);
		},

		save: function(req, res, next) {
			return res.status(405).send();
		},

		update: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('projects:' + req.params.project, 1000), function(conn) {
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)
				.then(function(project) {

					// process triggers
					project.on('trigger', function(name, conn, trigger_id, event) {
						
						// TODO: actually do something with the triggers here

					});

					return project.update(conn, req.body);
				});
			})

			.then(function(project) {
				res.send(prepare(project));
			})
			.catch(next);
		},

		create: function(req, res, next) {
			return using(resources.db.disposer(), function(conn) {
				var user = req.admin || req.user;

				// get the cycle
				return cycles.get(conn, req.body.cycle_id, user)
				.then(function(cycle) {

					// generate a new uuid
					req.body.id = uuid();

					// create the project
					return Project.create(conn, req.body, cycle, user, [['trigger', function(name, conn, trigger_id, event){

						// TODO: actually do something with the triggers here

					}]]);
				});
			})

			.then(function(project) {
				res.status(201).send(prepare(project));
			})
			.catch(next);
		},

		delete: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('projects:' + req.params.project, 1000), function(conn) {
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)
				.then(function(project) {
					return project.delete(conn);
				});
			})

			.then(function(project) {
				res.send(prepare(project));
			})
			.catch(next);
		}

	};
};
