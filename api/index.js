'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var expressJwt = require('express-jwt');


module.exports = function(config, app, components){
	var resources = {
		db: require('./lib/util/db.js')(config.db)
	}

	// generic middleware
	app.use(bodyParser());


	// add res helpers
	app.use(require('./lib/util/res.js'));


	// add authentication
	app.use(expressJwt({ secret: config.auth.secret, skip: ['/tokens','/tokens/','/users','/users/']}));
	app.use(function(err, req, res, next){
		if (err.constructor.name === 'UnauthorizedError')
			return res.error(401, {message: 'Unauthorized'});
		next();
	});


	// authentication
	require('./lib/token.js')(config, app, resources);


	// users
	require('./lib/users.js')(config, app, resources);


	// programs
	// require('./lib/programs.js')(config, app, resources);


	// projects
	// require('./lib/users.js')(config, app, resources);


	// flows
	// require('./lib/users.js')(config, app, resources);

};