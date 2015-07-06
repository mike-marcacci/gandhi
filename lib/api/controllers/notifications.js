'use strict';

var Q = require('q');
var _ = require('lodash');
var r = require('rethinkdb');

var controller = require('../controller.js');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// parse the query
				var query = controller.parseQuery(req.query);

				// restrict to a given user
				if(req.params.user || req.query.user)
					query.userId = req.params.user || req.query.user;

				resources.collections.Notification.query(
					conn,
					query,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
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
					.send(notifications);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Notification.get(
					conn,
					req.params.notification,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(notification){
					res.send(notification);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Notification.save(
					conn,
					req.params.notification,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(notification){
					res.send(notification);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Notification.update(
					conn,
					req.params.notification,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(notification){
					res.send(notification);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Notification.create(
					conn,
					req.body,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(notification){

					// send the response
					res.status(201).send(notification);

					// get the email address
					return Q.when(
						notification.user_id == req.user.id
						? req.user.email
						: r.table('users').get(notification.user_id)('email').run(conn)
					)

					// email notification to the user
					.then(function(email){
						resources.mail({
							to: email,
							subject: notification.subject,
							html: resources.emailTemplates.notification({
								content: notification.content
							})
						})
					});
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Notification.delete(
					conn,
					req.params.notification,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user ? {id: req.user.id} : false
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(notification){
					res.send(notification);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
