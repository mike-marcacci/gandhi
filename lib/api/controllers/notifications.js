'use strict';

var Promise    = require('bluebird');
var controller = require('../controller.js');
var errors     = require('../errors.js');
var using      = Promise.using;

var Notification  = require('../models/Notification');
var Notifications = require('../collections/Notifications');
var notifications = new Notifications();

var Users = require('../collections/Users');
var users = new Users();

function prepare(record) {
	if(Array.isArray(record)) return record.map(prepare);
	delete record.password;
	delete record.recovery_token;
	return record;
}

module.exports = function(config, resources) {
	return {
		query: function(req, res, next){
			
			// parse the query
			var query = controller.parseQuery(req.query);

			// restrict to the provided given user
			if(req.params.user || req.query.user)
				query.userId = req.params.user || req.query.user;

			return using(resources.db.disposer(), function(conn){
				return notifications.query(
					conn,
					query,
					req.admin || req.user
				);
			})
			.then(function(notifications){

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					notifications.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(notifications));
			})
			.catch(next);
		},

		get: function(req, res, next){
			return using(resources.db.disposer(), function(conn){
				return notifications.get(
					conn,
					req.params.notification,
					req.admin || req.user
				);
			})
			.then(function(notification){
				res.send(prepare(notification));
			})
			.catch(next);
		},

		save: function(req, res, next){
			return res.status(405).send();
		},

		update: function(req, res, next){
			return using(resources.db.disposer(), resources.redlock.disposer('notifications:' + req.params.notification, 1000), function(conn){
				return notifications.get(
					conn,
					req.params.notification,
					req.admin || req.user
				)
				.then(function(notification){
					return notification.update(conn, req.body);
				});
			})
			.then(function(notification){
				res.send(prepare(notification));
			})
			.catch(next);
		},

		create: function(req, res, next){
			return using(resources.db.disposer(), function(conn){
				return Notification.create(conn, req.body, req.admin || req.user)
				.then(function(notification){
					return users.get(conn, notification.user_id, true)

					// email recovery token to user
					.then(function(user){
						return resources.mail({
							to: user.email,
							subject: notification.subject,
							html: notification.content
						});
					})

					.then(function(){
						res.status(201).send(prepare(notification));
					});
				});
			})
			.catch(next);
		},

		delete: function(req, res, next){
			return using(resources.db.disposer(), resources.redlock.disposer('notifications:' + req.params.notification, 1000), function(conn){
				return notifications.get(
					conn,
					req.params.notification,
					req.admin || req.user
				)
				.then(function(notification){
					
					// can only be deleted by admin
					if(!req.admin)
						return new Promise.reject(new errors.ForbiddenError());

					return notification.delete(conn);
				});
			})
			.then(function(notification){
				res.send(prepare(notification));
			})
			.catch(next);
		}

	};
};
