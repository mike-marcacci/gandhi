'use strict';

var r       = require('rethinkdb');
var Promise = require('bluebird');
var errors  = require('../errors');

var Notification = require('../models/Notification');

function Notifications(){}

Notifications.prototype.query = function(conn, query, user) {

	// Filter Notifications
	// --------------------

	var notifications = r.table('notifications');

	// OPTIMIZATION: restrict to own notifications for non-admin users
	if(user !== true)
		notifications = notifications.filter({user_id: user.id});

	// restrict to user
	if(typeof query.userId === 'string')
		notifications = notifications.filter({user_id: query.userId});

	// filter
	if(query.filter) query.filter.forEach(function(f){
		notifications = notifications.filter(f);
	});

	// search
	if(typeof query.search === 'string' && query.search.length)
		notifications = notifications.filter(r.or(
			r.row('name').downcase().match(query.search.toLowerCase()),
			r.row('email').downcase().match(query.search.toLowerCase())
		));


	// Build Result
	// ------------

	var result = notifications;

	// sort
	if(query.sort)
		result = result.orderBy.apply(result, query.sort);

	// skip
	if(query.skip)
		result = result.skip(query.skip);

	// limit
	if(query.limit)
		result = result.limit(query.limit);

	return r.expr({

		// get the total results count
		total: notifications.count(),

		// get the processed notifications
		notifications: result.coerceTo('array')

	}).run(conn)

	// return as an array
	.then(function(results){
		return Promise.filter(results.notifications.map(function(data){
			return new Notification(conn, data, user)
			.catch(function(err){

				// suppress ForbiddenError
				if(err instanceof errors.ForbiddenError)
					return null;

				// re-throw all other errors
				return Promise.reject(err);
			});
		}), function(c){ return !!c; })
		.then(function(notifications){
			notifications.total = results.total;
			return notifications;
		});
	});
};


Notifications.prototype.get = function(conn, id, user) {
	return r.table('notifications').get(id).run(conn).then(function(data) {
		if(!data) return Promise.reject(new errors.NotFoundError());
		return new Notification(conn, data, user);
	});
};


Notifications.prototype.create = function(conn, data, user) {
	return Notification.create(conn, data, user);
};


module.exports = Notifications;
