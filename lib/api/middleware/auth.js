'use strict';

var r = require('rethinkdb');
var jwt = require('jsonwebtoken');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer');


module.exports = function(config, resources){

	// configure passport
	passport.use(new BearerStrategy(function(token, done) {
		jwt.verify(token, config.secret, function(err, decoded) {

			if(err)
				return done(err);

			if(!decoded.sub)
				return done('No subject encoded in token.');

			resources.db.acquire(function(err, conn) {
				if(err)
					return done(err);

				// get users from the DB
				r.table('users').get(decoded.sub).run(conn, function(err, user){
					resources.db.release(conn);

					if(err)
						return done(err);

					if(!user)
						return done('Invalid subject encoded in token.');

					return done(null, user);
				});
			});
		});
	}));

	// return the initialized middleware
	return passport.initialize();
};
