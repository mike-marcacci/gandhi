'use strict';

var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');

module.exports = function(config, app){
	var resources = {
		db: require('./api/utils/db.js')(config.db)
	};

	// TODO: if DB does not exist, set it up!

	// add middleware
	app.use(config.root + '/api', bodyParser.urlencoded({extended: true}));
	app.use(config.root + '/api', bodyParser.json());
	app.use(config.root + '/api', require('res-error')({log: config.log}));
	app.use(config.root + '/api', require('./api/middleware/auth.js')(config.auth, resources));

	// add the endpoints
	fs.readdirSync(__dirname + '/api/endpoints/').forEach(function(file){
	  if(file.indexOf('.js') === (file.length - 3))
	    require(__dirname + '/api/endpoints/' + file)(config, app, resources);
	});

	// redirect the root
	app.get(config.root, function(req, res){
		res.set('Location', config.root + '/app');
		res.send(302);
	})

	// TODO: serve angular links

	// TODO: serve components

	// TODO: inject components & dependencies

	// serve static files
	app.use(config.root + '/app', express.static(__dirname + '/app'));
	app.use(config.root + '/files', express.static(__dirname + '/files'));

};
