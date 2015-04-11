'use strict';

var r = require('rethinkdb');
var Q = require('q');

var collection = require('../collection.js');

module.exports = function Notification(config, resources) {
	return {
		query: queryNotifications,
		get: getNotification,
		create: createNotification,
		save: saveNotification,
		update: updateNotification,
		delete: deleteNotification
	};

	function queryNotifications(conn, query, user){
		if(!user) return Q.reject(401);

		// Filter Notifications
		// -------------

		var notifications = r.table('notifications');

		// hide others' from non-admin users
		if(user !== true)
			notifications = notifications.filter(r.row('user_id').eq(user.id));

		// filter by another user's ID
		else if(query.userId)
			notifications = notifications.filter(r.row('user_id').eq(query.userId));

		// filter
		if(query.filter) query.filter.forEach(function(f){
			notifications = notifications.filter(f);
		});

		// search
		if(typeof query.search === 'string' && query.search.length)
			notifications = notifications.filter(r.row('title').downcase().match(query.search.toLowerCase()));


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
			results.notifications.total = results.total;
			return results.notifications;
		});
	}


	function getNotification(conn, notificationId, user){
		if(!user) return Q.reject(401);
		return r.table('notifications').get(notificationId).do(function(notification){

			// get the notification
			return r.branch(
				notification.not(),
				r.error('{"code": 404, "message": "Notification not found."}'),

				// show any notification to an admin
				user === true ?
				notification

				// restrict non-admins to own notifications
				: r.branch(
					notification('user_id').ne(user.id),
					r.error('{"code": 403, "message": "You do not have permission to view this notification."}'),
					notification
				)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function createNotification(conn, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(data.id) return Q.reject({code: 400, message: 'Notification must not already have an id.'});

		// validate notification
		var err = resources.validator.validate('http://www.gandhi.io/schema/notification', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		var delta = r.expr(data).merge({
			id: r.uuid(),
			created: r.now().toEpochTime(),
			updated: r.now().toEpochTime()
		});

		// insert the notification
		return delta.do(function(write){
			return r.table('notifications').insert(write).do(function(result){
				return r.branch(
					result('errors').gt(0),
					r.error('{"code": 500, "message": "Error writing to the database."}'),

					// return new value
					write
				);
			});
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function updateNotification(conn, notificationId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && notificationId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate notification
		var err = resources.validator.validate('http://www.gandhi.io/schema/notification', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		// get the notification
		return r.table('notifications').get(notificationId).do(function(notification){
			var delta = r.expr(data).merge({
				updated: r.now().toEpochTime(),
				created: notification('created').default(r.now().toEpochTime())
			});

			return r.branch(
				notification.not(),
				r.error('{"code": 404, "message": "Notification not found."}'),

				// update the notification
				r.table('notifications').get(notificationId).update(delta, {returnChanges: true}).do(function(result){
					return r.branch(
						result('errors').gt(0),
						r.error('{"code": 500, "message": "Error writing to the database."}'),

						// return new value
						result('changes').nth(0)('new_val')
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function saveNotification(conn, notificationId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(notificationId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate notification
		var err = resources.validator.validate('http://www.gandhi.io/schema/notification', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// get the notification
		return r.table('notifications').get(notificationId).do(function(notification){
			var delta = r.expr(data).merge({
				created: notification('created').default(r.now().toEpochTime()),
				updated: r.now().toEpochTime()
			});
			
			return r.branch(
				notification.not(),
				r.error('{"code": 404, "message": "Notification not found."}'),

				// update the notification
				notification.merge(delta).do(function(write){
					return r.branch(
						r.table('notifications').get(notificationId).replace(write)('errors').gt(0),
						r.error('{"code": 500, "message": "Error writing to the database."}'),

						// return new value
						write
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function deleteNotification(conn, notificationId, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);
		return r.table('notifications').get(notificationId).do(function(notification){

			// get the notification
			return r.branch(
				notification.not(),
				r.error('{"code": 404, "message": "Notification not found."}'),

				// delete the notification
				r.branch(
					r.table('notifications').get(notificationId).delete()('errors').gt(0),
					r.error('{"code": 500, "message": "Error writing to the database."}'),

					// return old value
					notification
				)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}

};
