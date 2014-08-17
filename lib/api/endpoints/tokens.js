'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var jwt = require('jsonwebtoken');
var scrypt = require('scrypt');
var crypto = require('crypto');

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

						if(typeof req.body.password !== 'string')
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

						if(req.body.recovery_token != user.recovery_token)
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
					}

					// authenticate by email (recovery token)
					resources.db.acquire(function(err, conn) {
						if(err)
							return res.error(err);

						// update the user
						r.table('users').get(user.id).update({
							recovery_token: new Buffer(JSON.stringify({
								expiration: Date.now() + 3600000, // 1 hour from now
								secret: crypto.randomBytes(256).toString('base64')
							})).toString('base64')
						}, {returnVals: true}).run(conn, function(err, results){
							resources.db.release(conn);

							if(err)
								return res.error(err);

							if(!results.new_val || !results.new_val.recovery_token)
								return res.error(500, 'Failed to update user with recovery token');

							// TODO: email recovery token to user
							resources.mail.sendMail(_.defaults({
								to: user.email,
								subject: 'Your Recovery Token',
								text: results.new_val.recovery_token,
							}, config.mail.messageOptions));

							return res.status(201).send(null);
						});
					});
				});
			});
		});
	});
};
