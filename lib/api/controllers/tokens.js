'use strict';

var Promise = require('bluebird');
var errors  = require('../errors');
var using   = Promise.using;

var Users   = new require('../collections/Users');
var users   = new Users();

module.exports = function(config, resources) {
	return {
		post: function(req, res, next) {

			// validate request
			if (!req.body.email)
				return next(new errors.ValidationError('Email is required to generate a token'));

			// make the email case insensitive
			var email = req.body.email.toLowerCase();

			// grab a db conn
			return using(resources.db.disposer(), function(conn) {

				// look for a user by email
				return users.query(conn, {email: email})
				.then(function(users){

					// no such user
					if(!users.length) return Promise.reject(new errors.NotFoundError('User not found.'));

					// lack of email uniqueness!!!
					if(users.length > 1) return Promise.reject(new Error('Multiple users found with the email address "' + email + '"' ));

					var user = users[0];

					// Token
					// -----

					if(typeof req.body.token !== 'undefined'){

						// validate request
						if(typeof req.body.token !== 'string')
							return Promise.reject(new errors.UnauthorizedError('Invalid token.'));

						// verify token
						return resources.auth.verifyToken(req.body.token)
						.catch(function(err){
							return Promise.reject(new errors.UnauthorizedError('Invalid token.'));
						})

						.then(function(decoded) {

							// only exchange for same user or an admin
							if(user.id !== decoded.sub && !decoded.admin) return Promise.reject(new errors.ForbiddenError());

							// sign the token
							return resources.auth.signToken({admin: user.admin}, { expiresInMinutes: 24*60, subject: user.id });
						});
					}


					// Password
					// --------

					if(typeof req.body.password != 'undefined'){

						// validate request
						if(typeof req.body.password !== 'string' || req.body.password === '')
							return Promise.reject(new errors.UnauthorizedError('Invalid password.'));

						// verify the password
						return user.verifyPassword(req.body.password)
						.catch(function(err){
							return Promise.reject(new errors.UnauthorizedError('Incorrect password.'));
						})

						// sign the token
						.then(function(){
							return resources.auth.signToken({admin: user.admin}, { expiresInMinutes: 24*60, subject: user.id });
						});
					}


					// Recovery Token
					// --------------

					if(typeof req.body.recovery_token !== 'undefined'){

						// validate request
						if(typeof user.recovery_token !== 'string')
							return Promise.reject(new errors.UnauthorizedError('No recovery token set.'));

						// verify recovery token content
						return user.verifyRecoveryToken(req.body.recovery_token)
						.catch(function(err){
							return Promise.reject(new errors.UnauthorizedError('Invalid recovery token.'));
						})

						// verify recovery token expiration
						.then(function(){
							var recovery_token = JSON.parse(new Buffer(req.body.recovery_token, 'base64').toString('utf8'));
							if(!recovery_token.expiration || recovery_token.expiration < Date.now())
								return Promise.reject(new errors.UnauthorizedError('Expired recovery token.'));
						})

						// update the user
						.then(function(){
							return user.update(conn, {recovery_token: null}, true);
						})

						// sign the token
						.then(function(){
							return resources.auth.signToken({admin: user.admin}, { expiresInMinutes: 24*60, subject: user.id });
						});
					}


					// Email
					// -----

					// generate the token
					var recovery_token = new Buffer(JSON.stringify({
							email: user.email,
							expiration: Date.now() + 3600000, // 1 hour from now
							secret: resources.auth.random(64)
						})).toString('base64');

					// update the user
					return user.update(conn, {recovery_token: recovery_token}, true)

					// email recovery token to user
					.then(function(user){
						return resources.mail({
							to: user.email,
							subject: 'Your Recovery Token',
							html: resources.emailTemplates.recovery({
								user: user,
								link: req.protocol + '://' + (req.headers.host || req.hostname) + config.root + '/#/recovery?recovery_token=' + recovery_token
							})
						});
					})

					// don't return anything to the user
					.then(function(){
						return null;
					});
				});
			})

			// send the token
			.then(function(token) {
				res.status(201).send({token: token});
			})

			// send an error
			.catch(function(err){
				next(err);
			});
		}
	};
};
