'use strict';

var r = require('rethinkdb');
var jwt = require('jsonwebtoken');
var scrypt = require('scrypt');

module.exports = function(config, app, resources){
	app.post(config.root + '/api/tokens', function(req, res, next){

		// validate request
		if (!req.body.email || !req.body.password)
			return res.error(400, 'Email and password are required to generate a token');

		// make the email case insensitive
		req.body.email = req.body.email.toLowerCase();

		// grab a db connection
		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);

			// look for a user by email
			r.table('users').filter({email: req.body.email}).limit(1).run(connection, function(err, cursor){
				if(err){
					resources.db.release(connection);
					return res.error(err);
				}

				cursor.toArray(function(err, users){
					resources.db.release(connection);

					if(err)
						return res.error(err);

					if(!users.length)
						return res.error(404, 'User not found');

					var user = users[0];
					scrypt.verify(new Buffer(user.password, 'base64'), req.body.password, function(err){
						if(err)
							return res.error(401, 'Incorrect password');

						// send the user a token
						return res.send(201, {
							token: jwt.sign({admin: user.admin}, config.auth.secret, { expiresInMinutes: 24*60, subject: user.id })
						});
					});
				});
			});
		});
	});
};
