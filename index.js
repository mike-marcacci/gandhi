'use strict';

var fs = require('fs');
var r = require('rethinkdb');
var _ = require('lodash');
var crypto = require('crypto');
var express = require('express'); require('express-namespace');
var config = require('./config.json');

var passwords = require('./lib/util/passwords.js');
var db = require('./lib/util/db.js')(config.db);

var app = express();
app.use(express.bodyParser());

// Allow all CORS
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

app.namespace(config.root, function(){
	app.get('/users', function(req, res){
		res.headers = {'Content-Type': 'application/json'};
		res.send(users);
	});

	app.get('/users/:user', function(req, res){
		res.headers = {'Content-Type': 'application/json'};
		return users.some(function(user){
			if(user.id != req.params.user)
				return false;

			return res.send(user);
		}) || res.send(404, null);
	});

	app.get('/users/:user/projects', function(req, res){
		res.headers = {'Content-Type': 'application/json'};
		res.send(projects);
	});

	app.post('/users/:user/projects', function(req, res){
		console.log(req.body);
		res.headers = {'Content-Type': 'application/json'};
		res.send(req.body);
	});

	app.get('/programs', function(req, res){
		res.headers = {'Content-Type': 'application/json'};
		res.send(programs);
	});

	app.get('/programs/:program', function(req, res){
		res.headers = {'Content-Type': 'application/json'};
		return programs.some(function(program){
			if(program.id != req.params.program)
				return false;

			return res.send(program);
		}) || res.send(404, null);
	});

	app.get('/projects', function(req, res){
		res.headers = {'Content-Type': 'application/json'};
		res.send(projects);
	});

	app.get('/projects/:project', function(req, res){
		res.headers = {'Content-Type': 'application/json'};
		return projects.some(function(project){
			if(project.id != req.params.project)
				return false;

			return res.send(project);
		}) || res.send(404, null);
	});


	app.post('/files/', function(req, res){

		var response = {};
		_.each(req.files, function(file){
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

	app.listen(3000);

});

