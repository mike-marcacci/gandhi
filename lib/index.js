'use strict';

var fs = require('fs');
var glob = require('glob');
var _ = require('lodash');
var Q = require('q');
var express = require('express');
var bodyParser = require('body-parser');

var cache = require('./api/utils/cache.js');

module.exports = function(config){
	var router = express.Router();
	var transporter = require('nodemailer').createTransport(config.mail.transport);

	/*************
	 * Resources *
	 *************/

	// add resources
	var resources = {
		db: require('./api/utils/db.js')(config.db, config.pool.max, config.pool.min, config.pool.timeout),
		redis: require('redis').createClient(config.redis.port, config.redis.host),
		mail: Q.nfbind(function(data, callback) {
			_.defaults(data, config.mail.defaults);
			return transporter.sendMail(data, callback);
		}),
		validator: require('jjv')(),
		testers: {},
		listeners: {},
		components: {},
		collections: {},
		emailTemplates: {},
		actions: {}
	};

	// add lock
	resources.lock = require('./api/utils/lock.js')(config, resources);

	// add auth
	resources.auth = require('./api/utils/auth.js')(config, resources);

	// add schemas
	resources.validator.defaultOptions.removeAdditional = true;
	glob.sync(__dirname + '/api/schemas/*.json').forEach(function(file){
		var schema = require(file);
		resources.validator.addSchema(schema);
	});

	// add collections
	glob.sync(__dirname + '/api/collections/*.js').forEach(function(file){
		var collection = require(file);
		resources.collections[collection.name] = collection(config, resources);
	});

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

	// add the endpoints
	fs.readdirSync(__dirname + '/api/endpoints/').forEach(function(file){
		if(file.indexOf('.js') === (file.length - 3))
			require(__dirname + '/api/endpoints/' + file)(config, router, resources);
	});

	// serve main.js
	router.get('/main.js', function(req, res){
		res.set('Content-Type','text/javascript');
		res.send(main);
	});

	// serve styles.js
	router.get('/styles.js', function(req, res){
		res.set('Content-Type','text/javascript');
		res.send(styles);
	});

	// serve static files
	router.use('/modules', express.static(__dirname + '/modules'));
	router.use(express.static(__dirname + '/app'));

	// error handling
	router.use(function(err, req, res, next){

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
			console.log(err)
			console.log(err.stack)
		}
	});


	// TEMPORARY!!!
	// Purge project cache every minute. This must be replaced by proper cache invalidation due to trigger events.

	// var cacheInterval;
	// router.purgeCache = function() {
	// 	if(!cacheInterval) cacheInterval = setInterval(function(){
	// 		resources.db.acquire(function(err, conn){
	// 			if(err) return;

	// 			// purge project cache
	// 			cache(conn).finally(function(){
	// 				resources.db.release(conn);
	// 			});

	// 		});
	// 	}, 60000);
	// };



	return router;
};
