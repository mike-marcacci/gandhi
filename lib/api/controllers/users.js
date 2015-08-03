'use strict';

var Q          = require('q');
var r          = require('rethinkdb');
var jwt        = require('jsonwebtoken');
var uuid       = require('../utils/uuid');
var controller = require('../controller.js');
var errors     = require('../errors.js');
var using      = require('bluebird').using;

var User       = require('../models/User');
var Users      = require('../collections/Users');
var users      = new Users();

function prepare(record) {
	if(Array.isArray(record)) return record.map(prepare);
	delete record.password;
	delete record.recovery_token;
	return record;
}

module.exports = function(config, resources) {




	function lockEmail(email) {
		if(!email) return null;
		return resources.redlock.disposer('emails:' + email, 500);
	}




	return {
		query: function(req, res, next){
			
			// parse the query
			var query = controller.parseQuery(req.query);

			return using(resources.db.disposer(), function(conn){

				// get assignment filters
				var project_id = req.params.project || req.query.project;
				var cycle_id = req.params.cycle || req.query.cycle;

				if(project_id && cycle_id)
					return next(new errors.ValidationError('A users list may be restricted either by `project_id` or `cycle_id`, but not both.'));


				// TODO: filter by project assignments

				// TODO: filter by cycle assignments


				return users.query(
					conn,
					query
				);
			})
			.then(function(users){

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					users.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(users));
			})
			.catch(function(err){
				return next(err);
			});
		},

		get: function(req, res, next){
			return using(resources.db.disposer(), function(conn){
				return users.get(
					conn,
					req.params.user
				);
			})
			.then(function(user){
				res.send(prepare(user));
			})
			.catch(function(err){
				return next(err);
			});
		},

		save: function(req, res, next){
			return res.status(405).send();
		},

		update: function(req, res, next){
			return using(resources.db.disposer(), resources.redlock.disposer('users:' + req.params.user, 1000), lockEmail(req.body.email), function(conn){
				return users.get(
					conn,
					req.params.user
				)
				.then(function(user){

					// can only be updated by admin or self
					if(!req.admin && req.user.id !== user.id)
						return new Q.reject(new errors.ForbiddenError('Only an admin can update other users.'));

					// only an admin can mark another user as admin
					if(typeof req.body.admin === 'boolean' && req.body.admin !== req.user.admin && !req.admin)
						return new Q.reject(new errors.ForbiddenError('Only an admin can change a user\'s admin status.'));

					// make sure that the email is unique
					return Q.when( typeof req.body.email === 'undefined' ? null : 
						r.table('users').filter({email: req.body.email || ''}).limit(1).coerceTo('array').run(conn).then(function(conflicts){
							if(conflicts.length && conflicts[0].id !== req.params.user)
								return Q.reject(new errors.ConflictError('An account already exists with the provided email address.'));
						})
					)

					// update the user
					.then(function(){
						return user.update(conn, req.body);
					});
				});
			})
			.then(function(user){
				res.send(prepare(user));
			})
			.catch(function(err){
				return next(err);
			});
		},

		create: function(req, res, next){
			return using(resources.db.disposer(), lockEmail(req.body.email), function(conn){






				// authorization
				// -------------

				return Q.Promise(function(resolve, reject, notify){

					// not currently logged in
					if(typeof req.headers.authorization !== 'string' || !req.headers.authorization.length)
						return resolve(null);

					// curreny logged in
					return jwt.verify(req.headers.authorization.slice(7, req.headers.authorization.length), config.auth.secret, function(err, decoded){
						if(err) return reject(err.name === 'TokenExpiredError' ?
							new errors.UnauthorizedError('Authorization token has expired.')
							: new errors.UnauthorizedError());

						if(!decoded.sub)
							return reject(new errors.UnauthorizedError('No subject encoded in token.'));

						// get the current user
						return users.get(conn, decoded.sub)
						.then(function(user){
							if(!user)
								return reject(new errors.UnauthorizedError('Invalid subject encoded in token.'));

							req.user = user;
							return resolve(user);
						})
						.catch(function(err){
							return reject(err);
						});
					});
				})






				// account creation
				// ----------------

				.then(function(){

					// only an admin can already be logged in
					if(req.user && !req.user.admin)
						return Q.reject(new errors.ForbiddenError('Only an admin may create other users while logged in.'));

					// only an admin can create another admin
					if(req.body.admin && (!req.user || !req.user.admin || !req.query.admin))
						return Q.reject(new errors.ForbiddenError('Only an admin may create other admin user.'));

					// generate a new uuid
					req.body.id = uuid();

					// create (and validate) the user
					return User.create(req.body)

					// make sure email is unique!
					.then(function(user){
						return r.table('users').filter({email: req.body.email || ''}).limit(1).count().run(conn)
						.then(function(count){
							return count ? Q.reject(new errors.ConflictError('An account already exists with the provided email address.')) : user;
						});
					});
				})


				// save the user
				.then(function(user){
					return user.save(conn);
				});
			})
			.then(function(user){
				res.status(201).send(prepare(user));
			})
			.catch(function(err){
				return next(err);
			});
		},

		delete: function(req, res, next){
			return using(resources.db.disposer(), lockEmail(req.body.email), function(conn){
				return users.get(
					conn,
					req.params.user,
					req.user && req.user.admin && req.query.admin === 'true' ? true : (req.user || false)
				)
				.then(function(user){
					
					// can only be deleted by admin
					if(!req.admin)
						return new Q.reject(new errors.ForbiddenError());

					return user.delete(conn);
				});
			})
			.then(function(user){
				res.send(prepare(user));
			})
			.catch(function(err){
				return next(err);
			});
		}

	};
};
