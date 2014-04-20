var r = require('rethinkdb');
var jjv = require('jjv');
var jwt = require('jsonwebtoken');
var password = require('./util/passwords.js');
var expressJwt = require('express-jwt');

var env = jjv();
var schema = require('./schema/user.json');

module.exports = function(config, app, resources){

	app.post('/api/users', function(req, res, next){

		// validate the input
		var err = env.validate(schema, req.body, {checkRequired: true, useDefault: true});

		if(err){
			err.message = "Invalid request";
			return res.error(400, err, true);
		}

		// add timestamps
		req.body.created = req.body.updated = r.now();

		// encrypt the password
		req.body.password = password.encrypt(req.body.password);

		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);

			// verify email is not already taken
			r.table('users').filter({email: req.body.email}).limit(1).run(connection, function(err, cursor){
				if(err)
					return res.error(err);

				if(cursor.hasNext())
					return res.error(409, "An account already exists with this email");

				// insert the user
				r.table('users').insert(req.body, {returnVals: true}).run(connection, function(err, result){
					resources.db.release(connection);

					if(err)
						return res.error(err);

					var user = result.new_val;

					// if not currently logged, authenticate as this user
					var meta = req.headers.authentication ? {} : {token: jwt.sign(user, config.auth.secret, { expiresInMinutes: 24*60 })};

					// generate a token for the newly created user
					return res.data(203, user, meta);
				});
			});
		});
	});

	app.get('/api/users', expressJwt({ secret: config.auth.secret }), function(req, res, next){
		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);
					
			r.table('users').run(connection, function(err, cursor){
				if(err){
					resources.db.release(connection);
					return res.error(err);
				}

				// output as an array
				cursor.toArray(function(err, users){
					resources.db.release(connection);

					if(err)
						return res.error(err);

					return res.data(users);
				});
			});
		});
	});

	app.get('/api/user/:id?', function(req, res, next){
		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);

			// if no id is set, use the logged-in user id
			var id = req.params.id || req.user.id;

			// TODO: ACL

			// get the user by id
			r.table('users').get(id).run(connection, function(err, user){
				return res.data(200, user);
			});
		});
	});

	app.patch('/api/user/:id?', function(req, res, next){

		// validate the input
		var err = env.validate(schema, req.body, {checkRequired: false, useDefault: true});

		if(err){
			err.message = "Invalid request";
			return res.error(400, err, true);
		}

		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);

			// if no id is set, use the logged-in user id
			var id = req.params.id || req.user.id;

			// TODO: ACL

			// get the user by id
			r.table('users').get(id).update(req.body, {returnVals: true}).run(connection, function(err, result){
				if(err)
					return res.error(err);

					var user = result.new_val;

					// if not currently logged, authenticate as this user
					var meta = req.headers.authentication ? {} : {token: jwt.sign(user, config.auth.secret, { expiresInMinutes: 24*60 })};

					// generate a token for the newly created user
					return res.data(203, user, meta);
			});
		});
	});
};