'use strict';

var Q = require('q');
var errors = require('../errors.js');

module.exports = function(config, resources) {
	return {
		post: function(req, res, next) {

			// validate request
			if (!req.body.email)
				return next(new errors.ValidationError('Email is required to generate a token'));

			// make the email case insensitive
			var email = req.body.email.toLowerCase();

			// grab a db conn
			resources.db.acquire(function(err, conn) {
				if(err) return next(err);

				// look for a user by email
				resources.collections.User.query(conn, {email: email}, true)

				// no such user
				.then(function(users){
					if(!users.length) return Q.reject(new errors.NotFoundError('User not found.'));

					var user = users[0];

					// Token
					// -----

					if(typeof req.body.token !== 'undefined'){

						// validate request
						if(typeof req.body.token !== 'string')
							return Q.reject(new errors.UnauthorizedError('Invalid token.'));

						// verify token
						return resources.auth.verifyToken(req.body.token)
						.catch(function(err){
							return Q.reject(new errors.UnauthorizedError('Invalid token.'));
						})

						.then(function(decoded) {

							// only exchange for same user or an admin
							if(user.id !== decoded.sub && !decoded.admin) return Q.reject(new errors.ForbiddenError());

							// sign the token
							return resources.auth.signToken({admin: user.admin}, { expiresInMinutes: 24*60, subject: user.id });
						});
					}


					// Password
					// --------

					if(typeof req.body.password != 'undefined'){

						// validate request
						if(typeof req.body.password !== 'string' || req.body.password === '')
							return Q.reject(new errors.UnauthorizedError('Invalid password.'));

						// verify the password
						return resources.auth.verifyPassword(req.body.password, user.password)
						.catch(function(err){
							return Q.reject(new errors.UnauthorizedError('Invalid password.'));
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
							return Q.reject(new errors.UnauthorizedError('No recovery token set.'));

						// verify recovery token content
						return resources.auth.verifyPassword(req.body.recovery_token, user.recovery_token)
						.catch(function(err){
							return Q.reject(new errors.UnauthorizedError('Invalid recovery token.'));
						})

						// verify recovery token expiration
						.then(function(){
							var recovery_token = JSON.parse(new Buffer(req.body.recovery_token, 'base64').toString('utf8'));
							if(!recovery_token.expiration || recovery_token.expiration < Date.now())
								return Q.reject(new errors.UnauthorizedError('Expired recovery token.'));
						})

						// update the user
						.then(function(){
							return resources.collections.User.update(conn, user.id, {recovery_token: null}, true);
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
					return resources.collections.User.update(conn, user.id, {recovery_token: resources.auth.hashPassword(recovery_token)}, true)
					.catch(function(err){
						return Q.reject(err);
					})

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
				})

				// release the connection
				.finally(function(){
					resources.db.release(conn);
				})

				// send the token
				.then(function(token) {
					res.status(201).send({token: token});
				})

				// send an error
				.catch(function(err){
					next(err);
				});
			});
		}
	};
};
