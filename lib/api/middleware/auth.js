'use strict';

var jwt = require('jsonwebtoken');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer');

var errors = require('../errors');
var Users = require('../collections/Users');
var users = new Users();

module.exports = function(config, resources){

	// configure passport for JWT
	passport.use(new BearerStrategy(function(token, done) {
		jwt.verify(token, config.secret, function(err, decoded) {
			if(err) return done(err.name === 'TokenExpiredError' ?
				new errors.UnauthorizedError('Authorization token has expired.')
				: new errors.UnauthorizedError());

			if(!decoded.sub)
				return done(new errors.UnauthorizedError('No subject encoded in token.'));

			resources.db.acquire(function(err, conn) {
				if(err) return done(err);

				return users.get(conn, decoded.sub)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(user){
					return done(null, user);
				})
				.catch(function(err){
					return done(err);
				});

			});
		});
	}));

	// return the initialized middleware
	return passport.initialize();
};
