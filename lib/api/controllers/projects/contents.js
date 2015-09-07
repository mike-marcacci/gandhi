'use strict';

var Promise     = require('bluebird');
var controller  = require('../../controller');
var errors      = require('../../errors');
var using       = Promise.using;

var Projects    = require('../../collections/Projects');
var projects    = new Projects();

var Content     = require('../../models/Project/Content');

function prepare(record) {
	return record;
}

module.exports = function(config, resources) {




	// This contains globally accessible components
	// TODO: this feels really dirty, and breaks some of the separation of responsibility
	// that the models provide. I need to think through a cleaner way to configure this.
	Content.components = resources.components;







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

				// query the contents
				.then(function(project) {
					return project.contents.query(conn, query);
				});
			})

			.then(function(contents) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					projects.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(contents));
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

				// get the content
				.then(function(project){
					return project.contents.get(conn, req.params.content);
				});
			})

			.then(function(content) {
				res.send(prepare(content));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		save: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('projects:' + req.params.project, 1000), function(conn) {

				if(req.body.id !== req.params.content)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the project
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// create the content
				.then(function(project){
					return project.contents.create(conn, req.body);
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

				if(typeof req.body.id !== 'undefined' && req.body.id !== req.params.content)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the project
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// get the content
				.then(function(project){
					return project.contents.get(conn, req.params.content);
				})

				// update the content
				.then(function(content){
					return content.update(conn, req.body);
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
			return res.status(405).send();
		}

	};
};
