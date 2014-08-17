'use strict';

var fs = require('fs');
var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');

module.exports = function(config, app){
	var router = express.Router();

	// add resources
	var resources = {
		db: require('./api/utils/db.js')(config.db),
		validator: require('jjv')(),
		mail: require('nodemailer').createTransport(config.mail.transport, config.mail.mailOptions),
		conditions: {},
		listeners: {},
		components: {}
	};

	// customize validator
	resources.validator.addType('date', function (v) {
	  return !isNaN(Date.parse(v));
	});

	resources.validator.addTypeCoercion('date', function (v) {
	  return new Date(v);
	});

	// add schemas
	fs.readdirSync(__dirname + '/api/schemas/').forEach(function(file){
		if(file.indexOf('.json') !== (file.length - 5))
			return;

		var schema = require(__dirname + '/api/schemas/' + file);
		resources.validator.addSchema(schema.id, schema);
	});

	// add middleware
	router.use('/api', bodyParser.urlencoded({extended: true}));
	router.use('/api', bodyParser.json());
	router.use('/api', require('res-error')({log: config.log}));
	router.use('/api', require('./api/middleware/auth.js')(config.auth, resources));

	// add the endpoints
	fs.readdirSync(__dirname + '/api/endpoints/').forEach(function(file){
		if(file.indexOf('.js') === (file.length - 3))
			require(__dirname + '/api/endpoints/' + file)(config, router, resources);
	});

	/*******************************
	 * BEGIN Dependency Management *
	 *******************************/

	// make sure bower directory exists
	try { fs.mkdirSync(__dirname + '/app/assets/bower'); } catch(e) {}

	// add gandhi modules
	var bowerJson = require('../bower.json');
	config.modules.forEach(function(directory){

		// add client side
		if(fs.existsSync(directory + '/bower.json')){
			var json = require(directory + '/bower.json');

			// symlink into bower
			try { fs.unlinkSync(__dirname + '/app/assets/bower/' + json.name); } catch(e) {}
			fs.symlinkSync(directory, __dirname + '/app/assets/bower/' + json.name, 'dir');

			bowerJson.dependencies[json.name] = __dirname + '/app/assets/bower/' + json.name;

			// add the angular module
			if(typeof json.module == 'string')
				bowerJson.modules.push(json.module);
		}

		// add server side
		if(fs.existsSync(directory + '/package.json')){
			require(directory)(router, resources);
		}
	});

	// install dependencies
	require('bower').commands.install();

	// get all the bower deps
	var deps = require('wiredep')({ bowerJson: bowerJson});
	var main = '';

	// require all the js files
	main += deps.js.map(function(file){
		return fs.readFileSync(file);
	}).join('\n') + '\n';

	// build the gandhi module
	main += 'document.write(\'<script type="text/javascript">angular.module("gandhi", ["' + bowerJson.modules.join('","') + '"])</script>\');' + '\n';

	// require source files
	main += bowerJson.main.map(function(file){
		return fs.readFileSync(__dirname + '/app/' + file);
	}).join('\n') + '\n';

	// require all the css files
	var styles = deps.css.map(function(file){
		return fs.readFileSync(file);
	}).join('\n') + '\n';

	// --------------------------------------

	// serve the main.js
	router.get('/main.js', function(req, res){
		res.set('Content-Type','text/javascript');
		res.send(main);
	});

	// serve the main.css
	router.get('/main.css', function(req, res){
		res.set('Content-Type','text/css');
		res.send(styles);
	});



	/*****************************
	 * END Dependency Management *
	 *****************************/

	// serve static files
	router.use(express.static(__dirname + '/app'));

	// apply the router
	app.use(config.root, router);
};
