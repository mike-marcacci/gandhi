'use strict';

var fs = require('fs');
var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');

module.exports = function(config, app){

	// files to be loaded client side
	var files = [
		'assets/ckeditor/ckeditor.js',
		'assets/bower/lodash/dist/lodash.js',
		'assets/bower/angular/angular.js',
		'assets/bower/angular-sanitize/angular-sanitize.js',
		'assets/bower/angular-ui-router/release/angular-ui-router.js',
		'assets/bower/restangular/dist/restangular.js',
		'assets/bower/ng-file-upload/angular-file-upload.js',
		'assets/bower/ng-ckeditor/ng-ckeditor.js',
		'assets/bower/ng-table/ng-table.js',
		'index.js',
		'portal/index.js',
		'portal/user/index.js',
		'portal/projects/index.js',
		'admin/index.js',
		'admin/users/index.js',
		'admin/cycles/index.js',
		'admin/projects/index.js',
		'admin/reports/index.js'
	];

	// add resources
	var resources = {
		db: require('./api/utils/db.js')(config.db),
		validator: require('jjv')(),
		mail: require('nodemailer').createTransport(config.mail.transport,config.mail.mailOptions),
		components: {}
	};

	// TODO: if DB does not exist, set it up!

	// add schemas
	fs.readdirSync(__dirname + '/api/schemas/').forEach(function(file){
		if(file.indexOf('.json') === (file.length - 5)){
			var schema = require(__dirname + '/api/schemas/' + file);
			resources.validator.addSchema(schema.id, schema);
		}
	});

	// add components
	_.each(config.components, function(c, name){
		var component = require(c.directory + '/gandhi.json');

		// add to resources
		resources.components[name] = require(c.directory + '/' + component.api.main);

		// add client side deps
		files = _.union(files, component.files);

		// serve up static files
		app.use(config.root + '/app/components/' + name, express.static(c.directory));
	});

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

	// redirect root to the app
	app.get(config.root, function(req, res){
		res.set('Location', config.root + '/app');
		res.send(302);
	});

	// add all client side deps into main.js
	app.get(config.root + '/app/main.js', function(req, res){
		res.set('Content-Type','text/javascript');
		res.send(files.map(function(f){return 'document.write(\'<script type="text/javascript" src="'+f+'"></script>\');';}).join('\n'));
	});

	// serve static files
	app.use(config.root + '/app', express.static(__dirname + '/app'));
	app.use(config.root + '/files', express.static(__dirname + '/files'));
};
