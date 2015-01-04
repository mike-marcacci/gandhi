'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var controller = require('../controller.js');
var collections = ['statuses','roles','assignments','invitations','triggers','stages','exports'];

function prepare(o){
	if(_.isArray(o))
		return _.map(o, prepare);

	return _.omit(_.assign(o, {href: 'api/notifications/' + o.id}), collections);
}

function sanitize(o){
	delete o.id;
	delete o.href;
	for (var i = collections.length - 1; i >= 0; i--) {
		delete o[collections[i]];
	}
}

module.exports = function(config, resources) {
	return {
		post: function(req, res, next) {
			if(!req.user) return next(401);

			// sanitize the input
			sanitize(req.body);

			// default the user id
			if(!req.body.user_id) req.body.user_id = req.user.id;

			// validate permissions
			if(!req.user.admin && req.body.user_id !== req.user.id) return next({code: 403, message: 'Only an admin may send a notification to another user.'});

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/notification', req.body, {useDefault: true});
			if(err) return next({code: 400, message: err});

			// set timestamps
			req.body.created = req.body.updated = r.now().toEpochTime();

			resources.db.acquire(function(err, conn) {
				if(err) return next(err);

				// insert the notification
				r.table('notifications')
				.insert(req.body, {returnChanges: true})
				('changes').nth(0)('new_val')
				.run(conn)
				.then(function(notification){

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
					})

					// send the response
					.then(function(info){
						return res.status(201).send(prepare(notification));
					});
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		list: function(req, res, next) {
			if(!req.user) return next(401);

			var query = r.table('notifications');

			// restrict non-admin users to own notificationns
			if(!req.user.admin)
				query = query.filter(r.row('user_id').eq(req.user.id));

			// filter by user
			if(req.params.user || req.query.user)
				query = query.filter({user_id: req.params.user || req.query.user});

			// filter
			query = controller.filter(req, query);

			// search
			if(req.query.search && req.query.search !== '')
				query = query.filter(r.row('subject').downcase().match(req.query.search.toLowerCase()));

			// sort
			query = controller.sort(req, query);

			resources.db.acquire(function(err, conn) {
				if(err) return next(err);

				var per_page = parseInt(req.query.per_page, 10) || 50;
				var page = parseInt(req.query.page, 10) || 1;

				r.expr({
					// get the total results count
					total: query.count(),
					// get the results for this page
					notifications: query.skip(per_page * (page - 1)).limit(per_page).coerceTo('array')
				})
				.run(conn)
				.then(function(results){
					// set pagination headers
					controller.paginate(req, res, page, per_page, results.total);
					res.send(prepare(results.notifications));
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		get: function(req, res, next) {
			if(!req.user) return next(401);

			return resources.db.acquire(function(err, conn) {
				if(err) return next(err);

				// get notifications from the DB
				var query = r.table('notifications').get(req.params.notification);

				query
				.run(conn)
				.then(function(notification){

					// hide others' notifications from non-admin users
					if(!notification || (!req.user.admin && req.user.id !== notification.user_id))
						return next(404);

					return res.send(prepare(notification));
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		patch: function(req, res, next) {
			if(!req.user) return next(401);

			// sanitize the input
			sanitize(req.body);

			// validate permissions
			if(!req.user.admin) {
				if(req.body.user_id !== req.user.id) return next({code: 403, message: 'Only an admin may send a notification to another user.'});

				// non-admins cannot update these properties
				delete req.body.user_id;
				delete req.body.subject;
				delete req.body.content;
			}

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/notification', req.body, {checkRequired: false});
			if(err) return next({code: 400, message: err});

			// set timestamps
			delete req.body.created;
			req.body.updated = r.now().toEpochTime();

			resources.db.acquire(function(err, conn) {
				if(err) return next(err);


				(
					req.user.admin

					// admin
					? r.table('notifications').get(req.params.notification).update(req.body, {returnChanges: true})

					// restrict to own notifications
					: r.branch(
						notification('user_id').ne(req.user.id),
						r.error('{"code": 404}'),
						notification.update(req.body, {returnChanges: true})
					)
				)
				('changes').nth(0)('new_val')
				.run(conn)
				.then(function(notification){
					if(!notification) return next(404);
					return res.send(prepare(notification));
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		// TODO: implement
		put: function(req, res, next) {
			return next(405);
		},

		delete: function(req, res, next) {
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403, 'Only administrators may delete a notification.');

			resources.db.acquire(function(err, conn) {
				if(err) return next(err);

				// ensure that no projects depend on this notification
				r.table('notifications')
				.get(req.params.notification)
				.delete({returnChanges: true})
				('changes').nth(0)('old_val')
				.run(conn)
				.then(function(notification){
					return res.send(prepare(notification));
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		}

	}
};
