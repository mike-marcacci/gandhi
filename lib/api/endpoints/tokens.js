'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var scrypt = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';

module.exports = function(config, router, resources){
	router.post('/api/tokens', function(req, res, next){

		// validate request
		if (!req.body.email)
			return res.error(400, 'Email is required to generate a token');

		// make the email case insensitive
		req.body.email = req.body.email.toLowerCase();

		// grab a db conn
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// look for a user by email
			r.table('users').filter({email: req.body.email}).limit(1).run(conn, function(err, cursor){
				if(err){
					resources.db.release(conn);
					return res.error(err);
				}

				cursor.toArray(function(err, users){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					if(!users.length)
						return res.error(404, 'User not found.');

					var user = users[0];

					// exchange authentication token
					if(typeof req.body.token !== 'undefined'){

						if(typeof req.body.token !== 'string')
							return res.error(401, 'Invalid token.');

						return jwt.verify(req.body.token, config.auth.secret, function(err, decoded) {

							if(err)
								return res.error(401, 'Invalid token.');

							// exchange for same user or an admin
							if(user.id !== decoded.sub && !decoded.admin)
								return res.error(403);

							// send the user a token
							return res.status(201).send({
								token: jwt.sign({admin: user.admin}, config.auth.secret, { expiresInMinutes: 24*60, subject: user.id })
							});
						});
					}

					// authenticate by password
					if(typeof req.body.password != 'undefined'){

						if(typeof req.body.password !== 'string' || req.body.password == '')
							return res.error(401, 'Invalid password.');

						return scrypt.verify(new Buffer(user.password, 'base64'), req.body.password, function(err){
							if(err)
								return res.error(401, 'Incorrect password.');

							// send the user a token
							return res.status(201).send({
								token: jwt.sign({admin: user.admin}, config.auth.secret, { expiresInMinutes: 24*60, subject: user.id })
							});
						});
					}

					// authenticate by recovery token
					if(typeof req.body.recovery_token != 'undefined'){
						if(typeof user.recovery_token != 'string')
							return res.error(401, 'No recovery token set.');

						return scrypt.verify(new Buffer(user.recovery_token, 'base64'), req.body.recovery_token, function(err){
							if(err)
								return res.error(401, 'Invalid recovery token.');

							var recovery_token = JSON.parse(new Buffer(req.body.recovery_token, 'base64').toString('utf8'));

							if(!recovery_token.expiration || recovery_token.expiration < Date.now())
								return res.error(401, 'Expired recovery token.');

							// authenticate by email (recovery token)
							return resources.db.acquire(function(err, conn) {
								if(err)
									return res.error(err);

								// update the user
								r.table('users').get(user.id).update({recovery_token: null}).run(conn, function(err, results){
									resources.db.release(conn);

									if(err)
										return res.error(err);

									return res.status(201).send({
										token: jwt.sign({admin: user.admin}, config.auth.secret, { expiresInMinutes: 24*60, subject: user.id })
									});
								});
							});
						});
					}

					// authenticate by email (recovery token)
					resources.db.acquire(function(err, conn) {
						if(err)
							return res.error(err);

						// generate the token
						var recovery_token = new Buffer(JSON.stringify({
								email: user.email,
								expiration: Date.now() + 3600000, // 1 hour from now
								secret: crypto.randomBytes(256).toString('base64')
							})).toString('base64');

						// update the user
						r.table('users').get(user.id).update({
							recovery_token: scrypt.hash(recovery_token, scrypt.params(0.1))
						}, {returnChanges: true}).run(conn, function(err, results){
							resources.db.release(conn);

							if(err)
								return res.error(err);

							if(!results.changes[0] || !results.changes[0].new_val.recovery_token)
								return res.error(500, 'Failed to update user with recovery token');

							// email recovery token to user
							resources.mail({
								to: user.email,
								subject: 'Your Recovery Token',
								html: resources.emailTemplates.recovery({
									user: results.changes[0].new_val,
									link: req.protocol + '://' + (req.headers.host || req.hostname) + config.root + '/#/recovery?recovery_token=' + recovery_token
								}),
							})
							.catch(function(err){
								return res.error(err);
							})
							.then(function(info){
								return res.status(201).send();
							});
						});
					});
				});
			});
		});
	});
};
