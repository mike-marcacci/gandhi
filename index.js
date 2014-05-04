'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var fs = require('fs');
var express = require('express'); require('express-namespace');

var config = require('./config.json');
var resources = {
	db: require('./lib/utils/db.js')(config.db)
}

var app = express();

app.use(express.logger('dev')); // TODO: dev only

app.use(express.bodyParser());
app.use(express.methodOverride());

// add res.error and res.data methods
app.use(require('./lib/utils/res.js'));

// allow all CORS
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

// add endpoints
app.namespace(config.root, function(){

	// add programs endpoints
	require('./lib/endpoints/programs.js')(config, app, resources);

	// add users endpoints
	require('./lib/endpoints/users.js')(config, app, resources);

	// add projects endpoints
	require('./lib/endpoints/projects.js')(config, app, resources);

	app.listen(config.port);
	
});
