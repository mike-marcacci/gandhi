'use strict';

var r = require('rethinkdb');
var Q = require('q');
var collection = require('../collection.js');

var uuid = require('../utils/uuid.js');
var errors = require('../errors.js');

// var blacklist = ['password','recovery_token'];
// var whitelist = ['id', 'email', 'name', 'href', 'admin', 'created','updated'];

module.exports = function User(config, resources) {
	return {
		query: queryUsers,
		get: getUser,
		create: createUser,
		save: saveUser,
		update: updateUser,
		delete: deleteUser
	};

	function queryUsers(conn, query, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// Filter Users
		// -------------

		var users = r.table('users');

		// email
		if(typeof query.email === 'string' && query.email.length)
			users = users.filter({email: query.email});

		// filter
		if(query.filter) query.filter.forEach(function(f){
			users = users.filter(f);
		});

		// search
		if(typeof query.search === 'string' && query.search.length)
			users = users.filter(r.or(
				r.row('name').downcase().match(query.search.toLowerCase()),
				r.row('email').downcase().match(query.search.toLowerCase())
			));


		// Build Result
		// ------------

		var result = users;

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
			total: users.count(),

			// get the processed users
			users: result.coerceTo('array')

		}).run(conn)

		// return as an array
		.then(function(results){
			results.users.total = results.total;
			return results.users;
		})

		// parse errors
		.catch(collection.throwError);
	}


	function getUser(conn, userId, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		return r.table('users').get(userId).do(function(user){

			// get the user
			return r.branch(
				user.not(),
				r.error('{"error": "NotFoundError", "message": "User not found."}'),
				user
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function createUser(conn, data, user){

		// secure admin permissions
		if(user !== true && data.admin)
			return Q.reject(new errors.ForbiddenError('You are not authorized to give admin status.'));
		
		// validate id
		if(data.id) return Q.reject(new errors.ValidationError('No id should be set.'));

		// validate user
		var err = resources.validator.validate('http://www.gandhi.io/schema/user', data, {useDefault: true});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// get the user
		return r.expr(data).merge({
			id: uuid(),
			email: data.email.toLowerCase(),
			password: resources.auth.hashPassword(data.password || resources.auth.random()),
			created: r.now().toEpochTime(),
			updated: r.now().toEpochTime()
		}).do(function(write){

			// find other users with the same email
			return r.branch(
				r.table('users').filter(function(u){ return u('email').eq(write('email')).and(u('id').ne(write('id'))); }).limit(1).count().gt(0),
				r.error('{"error": "ConflictError", "message": "An account already exists with this email"}'),

				// save the user
				r.branch(
					r.table('users').insert(write)('errors').gt(0),
					r.error('{"error": "Error", "message": "Error writing to the database."}'),

					// return new value
					write
				)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function updateUser(conn, userId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// secure other users
		if(user !== true && user.id !== userId)
			return Q.reject(new errors.ForbiddenError('Non-admin users may only update themselves.'));

		// secure admin permissions
		if(user !== true && data.admin)
			return Q.reject(new errors.ForbiddenError('You are not authorized to give admin status.'));
		
		// validate id
		if(typeof data.id !== 'undefined' && userId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate user
		var err = resources.validator.validate('http://www.gandhi.io/schema/user', data, {checkRequired: false});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// get the user
		return r.table('users').get(userId).do(function(user){
			var delta = r.expr(data).merge({
				updated: r.now().toEpochTime(),
				created: user('created').default(r.now().toEpochTime())
			});

			// encrypt password
			if(data.password)
				delta = delta.merge({password: resources.auth.hashPassword(data.password)});

			// normalize the email
			if(data.email)
				delta = delta.merge({email :data.email.toLowerCase()});

			// update the user
			var update = r.table('users').get(userId).update(delta, {returnChanges: true}).do(function(result){
				return r.branch(
					result('errors').gt(0),
					r.error('{"error": "Error", "message": "Error writing to the database."}'),

					// return new value
					result('changes').nth(0)('new_val')
				);
			});


			return r.branch(
				user.not(),
				r.error('{"error": "NotFoundError", "message": "User not found."}'),

				// TODO: if/when different authentication mechanisms are introduced, we will
				// want to break out primary authentication keys (email, Google ID, etc) into
				// their own tables and use RethinkDB's primary key constraint for uniqueness

				!data.email ?

					// email not updated
					update

					// find other users with the same email
					: r.branch(
						r.table('users').filter(function(u){ return u('email').eq(delta('email')).and(u('id').ne(delta('id'))); }).limit(1).count().gt(0),
						r.error('{"error": "ConflictError", message": "An account already exists with this email"}'),

						update
					)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function saveUser(conn, userId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());

		// secure other users
		if(user !== true && user.id !== userId)
			return Q.reject(new errors.ForbiddenError('Non-admin users may only update themselves.'));

		// secure admin permissions
		if(user !== true && data.admin)
			return Q.reject(new errors.ForbiddenError('You are not authorized to give admin status.'));
		
		// validate id
		if(userId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate user
		var err = resources.validator.validate('http://www.gandhi.io/schema/user', data, {useDefault: true});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// get the user
		return r.table('users').get(userId).do(function(user){
			var delta = r.expr(data).merge({
				email: data.email.toLowerCase(),
				password: resources.auth.hashPassword(data.password || resources.auth.random()),
				created: user('created').default(r.now().toEpochTime()),
				updated: r.now().toEpochTime()
			});

			return r.branch(
				user.not(),
				r.error('{"error": "NotFoundError", "message": "User not found."}'),
				user.merge(delta).do(function(write){

					// find other users with the same email
					return r.branch(
						r.table('users').filter(function(u){ return u('email').eq(write('email')).and(u('id').ne(write('id'))); }).limit(1).count().gt(0),
						r.error('{"error": "ConflictError", message": "An account already exists with this email"}'),

						// save the user
						r.branch(
							r.table('users').get(userId).replace(write)('errors').gt(0),
							r.error('{"error": "Error", "message": "Error writing to the database."}'),

							// return new value
							write
						)
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function deleteUser(conn, userId, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());
		if(user.id === userId) return Q.reject(new errors.ForbiddenError('You cannot delete your own admin account.'));

		// get the user
		return r.table('users').get(userId).do(function(user){
			return r.branch(
				user.not(),
				r.error('{"error": "NotFoundError", "message": "User not found."}'),

				// delete the user
				r.branch(
					r.table('users').get(userId).delete()('errors').gt(0),
					r.error('{"error": "Error", "message": "Error writing to the database."}'),

					// return old value
					user
				)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}

};
