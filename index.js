'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var fs = require('fs');
var express = require('express'); require('express-namespace');

var config = require('./config.json');
var resources = {
	db: require('./lib/utils/db.js')(config.db)
};

var app = express();



// configure app
app.configure(function() {
	app.use(express.logger());
	app.use(require('./lib/middleware/cors.js')({}, resources));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(require('./lib/utils/res.js'));
	app.use(require('./lib/middleware/auth.js')(config.auth, resources));
	app.use(app.router);
	app.use(express.static(__dirname + '/files'));
});

// add endpoints
app.namespace(config.root, function(){

	// add tokens endpoints
	require('./lib/endpoints/tokens.js')(config, app, resources);

	// add programs endpoints
	require('./lib/endpoints/programs.js')(config, app, resources);

	// add users endpoints
	require('./lib/endpoints/users.js')(config, app, resources);

	// add projects endpoints
	require('./lib/endpoints/projects.js')(config, app, resources);

	app.listen(config.port);
	
});
