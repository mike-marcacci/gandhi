var r = require('rethinkdb');
var passwords = require('./util/passwords.js');
var jwt = require('jsonwebtoken');

module.exports = function(config, app, resources){
	app.post('/tokens', function(req, res, next){

		// validate request
		if (!req.body.email || !req.body.password)
			return res.send(400, {message: 'Email and password are required to generate a token'});

		// grab a db connection
		resources.db.acquire(function(err, connection) {
			if(err)
				return res.send(500, err);

			// look for a user by email
			r.table('users').filter({email: req.body.email}).limit(1).run(connection, function(err, cursor){
				if(err){
					resources.db.release(connection);
					return res.send(500, err);
				}

				if(!cursor.hasNext()){
					resources.db.release(connection);
					return res.send(404, "User not found");
				}

				// get the first record
				cursor.next(function(err, user){
					resources.db.release(connection);

					if(err)
						return res.send(500, err);

					if(!passwords.test(req.body.password, user.password))
						return res.send(401, "Incorrect password");

					// send the entire user packaged in a token
					return res.send(201, {
						token: jwt.sign(user, config.auth.secret, { expiresInMinutes: 24*60 })
					});
				});
			});
		});
	});
};
