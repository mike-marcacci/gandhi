'use strict';

var _          = require('lodash');
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




	// This contains globally accessible components
	// TODO: this feels really dirty, and breaks some of the separation of responsibility
	// that the models provide. I need to think through a cleaner way to configure this.
	Project.actions = resources.actions;







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
				)

				// parse embedded models
				.then(function(projects) {
					var includes = controller.parseIncludes(req.query.includes, Project);

					// nothing to include
					if(!includes) return projects;

					// include embedded models
					return Promise.map(projects, function(project) {
						var result = _.assign({}, project);
						return Promise.map(includes, function(field) {
							return project[field].query(conn, {})
							.then(function(c) {
								result[field] = _.indexBy(c, 'id');
							});
						})
						.then(function() {
							return result;
						});
					})

					// attach total
					.then(function(results) {
						results.total = projects.total;
						return results;
					});
				});
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
					return Project.create(conn, req.body, cycle, user);
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
