'use strict';

var Promise    = require('bluebird');
var uuid       = require('../utils/uuid');
var controller = require('../controller.js');
var errors     = require('../errors.js');
var using      = Promise.using;

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
			.catch(next)
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
			.catch(next)
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
			.catch(next)
		},

		create: function(req, res, next) {
			return using(resources.db.disposer(), function(conn) {

				// can only be created by admin
				if(!req.admin)
					return new Promise.reject(new errors.ForbiddenError('Only an admin can create projects.'));

				// generate a new uuid
				req.body.id = uuid();

				// create the project
				return Project.create(conn, req.body, req.admin || req.user)
			})

			.then(function(project) {
				res.status(201).send(prepare(project));
			})
			.catch(next)
		},

		delete: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('projects:' + req.params.project, 1000), function(conn) {
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)
				.then(function(project) {

					// TODO: check for dependant projects

					return project.delete(conn);
				});
			})

			.then(function(project) {
				res.send(prepare(project));
			})
			.catch(next)
		}

	};
};
