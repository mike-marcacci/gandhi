var r = require('rethinkdb');
var passwords = require('../utils/passwords.js');
var jwt = require('jsonwebtoken');

module.exports = function(config, app, resources){
	app.post('/tokens', function(req, res, next){

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

				if(!cursor.hasNext()){
					resources.db.release(connection);
					return res.error(404, "User not found");
				}

				// get the first record
				cursor.next(function(err, user){
					resources.db.release(connection);

					if(err)
						return res.error(err);

					if(!passwords.test(req.body.password, user.password))
						return res.error(400, "Incorrect password");

					// send the user a token
					return res.data(201, {
						token: jwt.sign({admin: user.admin}, config.auth.secret, { expiresInMinutes: 24*60, subject: user.id })
					});
				});
			});
		});
	});
};
