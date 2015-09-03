'use strict';

var fs = require('fs');
var _ = require('lodash');
var Q = require('q');
var Redis = require('ioredis');
var express = require('express');
var bodyParser = require('body-parser');

module.exports = function(config){
	var router = express.Router();

	// stub out a transporter if none is specified
	var transporter = config.mail.transport ?
		require('nodemailer').createTransport(config.mail.transport)
		: { sendMail: function(data, callback) { return callback(null, data); } };

	/*************
	 * Resources *
	 *************/

	// add resources
	var resources = {
		db: require('./api/utils/db.js')(config.db, config.pool.max, config.pool.min, config.pool.timeout),
		redis: new Redis(config.redis),
		mail: Q.nfbind(function(data, callback) {
			_.defaults(data, config.mail.defaults);
			return transporter.sendMail(data, callback);
		}),
		testers: {},
		listeners: {},
		components: {},
		emailTemplates: {},
		actions: {}
	};

	// add lock
	resources.redlock = new (require('redlock'))([resources.redis], {
		retryCount: 5,
		retryDelay: 500
	});

	// add auth
	resources.auth = require('./api/utils/auth.js')(config, resources);


	/*************************
	 * Dependency Management *
	 *************************/

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
			try { fs.symlinkSync(directory, __dirname + '/app/assets/bower/' + json.name, 'dir'); } catch(e) {}

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
	require('bower').commands.install(undefined, undefined, { cwd: __dirname + '/../' });

	// get all the bower deps
	var deps = require('wiredep')({
		bowerJson: bowerJson,
		cwd: __dirname + '/../',
		exclude: bowerJson.exclude
	});
	var main = '';

	// require all the js files
	main += deps.js.map(function(file){
		return fs.readFileSync(file);
	}).join('\n') + '\n';

	// build the gandhi module
	main += 'angular.module("gandhi", ["' + bowerJson.modules.join('","') + '"]);' + '\n';

	// require source files
	main += bowerJson.main.map(function(file){
		return fs.readFileSync(__dirname + '/app/' + file);
	}).join('\n') + '\n';

	// require all the css files
	var styles = deps.css.map(function(file){
		return 'document.write(\'<link rel="stylesheet" type="text/css" href="' + file.replace(new RegExp('^'+__dirname+'/app/'), '') + '" />\');';
	}).join('\n') + '\n';


	/***********
	 * Routing *
	 ***********/

	// add middleware
	router.use('/api', bodyParser.urlencoded({extended: true}));
	router.use('/api', bodyParser.json());
	router.use('/api', require('./api/middleware/auth.js')(config.auth, resources));

	// TODO: this is stupidly inefficient, but auth is done in a route-specific way right now. Let's fix that in the future and drop passport.
	router.use('/api', function(req, res, next) {
		Object.defineProperty(req, 'admin', {
			get: function(){
				return req.user ? req.user.admin && req.query.admin === 'true' : false;
			}
		});
		
		return next();
	});

	// add the endpoints
	fs.readdirSync(__dirname + '/api/endpoints/').forEach(function(file){
		if(file.indexOf('.js') === (file.length - 3))
			require(__dirname + '/api/endpoints/' + file)(config, router, resources);
	});

	// serve main.js
	router.get('/main.js', function(req, res) {
		res.set('Content-Type','text/javascript');
		res.send(main);
	});

	// serve styles.js
	router.get('/styles.js', function(req, res) {
		res.set('Content-Type','text/javascript');
		res.send(styles);
	});

	// get the embed script
	var embed = fs.readFileSync(__dirname + '/app/embed.js');
	router.get('/embed.js', function(req, res, next) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		res.send(embed + '(\'' + (req.get('host') + config.root)  + '\',\'' + (req.params.id || 'gandhi') + '\');');
	});

	// serve static files
	router.use('/modules', express.static(__dirname + '/modules'));
	router.use(express.static(__dirname + '/app'));

	// error handling
	router.use(function(err, req, res, next) {

		// make sure to respond if we haven't yet
		if(!res._headerSent) res.status(err.httpStatusCode || 500).send(

			// don't show system errors to the client
			(typeof err.toJSON === 'function') ?
				err
				: {error: 'Error', message: 'An unknown error occurred.'}

		);

		// // log the error
		// console[err.logLevel || 'error']({
		// 	error: err,
		// 	request: {
		// 		method: req.method,
		// 		url: req.url,
		// 		params: req.params,
		// 		body: req.body
		// 	},
		// 	response: {
		// 		statusCode: res.statusCode,
		// 		body: res.body
		// 	}
		// });

		if(!err.logLevel || err.logLevel == 'error') {
			console.log(err);
			console.log(err.stack);
		}
	});


	return router;
};
