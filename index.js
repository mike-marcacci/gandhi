'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var fs = require('fs');
var express = require('express'); require('express-namespace');

var config = require('./config.json');
var resources = {
	db: require('./api/utils/db.js')(config.db)
};

var app = express();



// configure app
app.configure(function() {
	app.use(express.logger());
	app.use(require('./api/middleware/cors.js')({}, resources));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(require('./api/utils/res.js'));
	app.use(require('./api/middleware/auth.js')(config.auth, resources));
	app.use(app.router);
	app.use(config.root + '/app', express.static(__dirname + '/app'));
	app.use(config.root + '/files', express.static(__dirname + '/files'));
});

// add API endpoints
app.namespace(config.root + '/api', function(){

	// add tokens endpoints
	require('./api/endpoints/tokens.js')(config, app, resources);

	// add programs endpoints
	require('./api/endpoints/programs.js')(config, app, resources);

	// add users endpoints
	require('./api/endpoints/users.js')(config, app, resources);

	// add projects endpoints
	require('./api/endpoints/projects.js')(config, app, resources);

	app.listen(config.port);
	
});

