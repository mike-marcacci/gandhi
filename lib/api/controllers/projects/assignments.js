'use strict';

var Promise     = require('bluebird');
var controller  = require('../../controller');
var errors      = require('../../errors');
var using       = Promise.using;

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

			// get the project
			return using(resources.db.disposer(), function(conn) {
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// query the assignments
				.then(function(project) {
					return project.assignments.query(conn, query);
				});
			})

			.then(function(assignments) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					projects.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(assignments));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		get: function(req, res, next) {

			// get the project
			return using(resources.db.disposer(), function(conn) {
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// get the assignment
				.then(function(project){
					return project.assignments.get(conn, req.params.assignment);
				});
			})

			.then(function(assignment) {
				res.send(prepare(assignment));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		save: function(req, res, next) {
			return using(resources.db.disposer(), function(conn) {

				if(req.body.id !== req.params.assignment)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the project
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// create the assignment
				.then(function(project){
					return project.assignments.create(conn, req.body);
				});
			})

			.then(function(project) {
				res.status(200).send(prepare(project));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		update: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('projects:' + req.params.project, 1000), function(conn) {

				if(typeof req.body.id !== 'undefined' && req.body.id !== req.params.assignment)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the project
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// get the assignment
				.then(function(project){
					return project.assignments.get(conn, req.params.assignment);
				})

				// update the assignment
				.then(function(assignment){
					return assignment.update(conn, req.body);
				});
			})
			.then(function(project) {
				res.send(prepare(project));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		create: function(req, res, next) {
			return res.status(405).send();
		},

		delete: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('projects:' + req.params.project, 1000), function(conn) {

				// get the project
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// get the assignment
				.then(function(project) {
					return project.assignments.get(conn, req.params.assignment);
				})

				// delete the assignment
				.then(function(assignment){
					return assignment.delete(conn);
				});
			})
			.then(function(project) {
				res.send(prepare(project));
			})
			.catch(function(err) {
				return next(err);
			});
		}

	};
};
