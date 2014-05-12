var r = require('rethinkdb');
var passwords = require('../utils/passwords.js');
var jwt = require('jsonwebtoken');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer');


module.exports = function(config, resources){

	// configure passport
	return passport.use(new BearerStrategy(function(token, done) {
		jwt.verify(token, config.auth.secret, function(err, decoded) {
			if(err)
				return done(err);

			return done(null, decoded);
		});
	}));
}
