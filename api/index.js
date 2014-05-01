'use strict';

var _ = require('lodash');
var fs = require('fs');
var express = require('express');
var expressJwt = require('express-jwt');
var pathToRegex = require('./lib/util/pathToRegex.js');


module.exports = function(config, app, components){
	var resources = {
		db: require('./lib/util/db.js')(config.db)
	}

	app.use(function(req, res, next) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

		// intercept OPTIONS method
		if ('OPTIONS' == req.method) {
			res.send(200);
		} else {
			next();
		}
	});

	// generic middleware
	app.use(express.bodyParser());


	// add res helpers
	app.use(require('./lib/util/res.js'));


	// add authentication
	app.use(function(req, res, next){

		var exclude = {
			'/api/tokens': ['post'],
			'/api/users': ['post']
		};

		if(pathToRegex('/api/*').test(req.url))
			return expressJwt({ secret: config.auth.secret, skip: ['/api/tokens','/api/tokens/','/api/users','/api/users/']})(req, res, next)

		next();
	});
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
	require('./lib/projects.js')(config, app, resources);


	// flows
	// require('./lib/flows.js')(config, app, resources);

	app.post('/files/', function(req, res){

		var response = {};
		_.each(req.files, function(file){

			console.log(file)

			var data = fs.readFileSync(file.path);

			// TODO: hash the file

			response[file.fieldName] = {
				path: '/files/' + Date.now() + '-' + file.originalFilename
			};

			fs.writeFileSync(__dirname + response[file.fieldName].path);
		});

		// TODO: record this in the DB along with the user, etc

		res.send(200, response);

	});

};