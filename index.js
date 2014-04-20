// 'use strict';

global.console = require('winston');

var express = require('express'); require('express-namespace');
var fs = require('fs');

var config = require('./config.json');
var app = express();

// components
var components = {};
require("fs").readdirSync(__dirname + '/components').forEach(function(dir){

	// require them server side
	if(fs.existsSync(dir+'/api/index.js')){
		components[dir] = require(__dirname + '/components/' + dir+'/api/index.js');
	}

	// serve them for client side
	if(fs.existsSync(dir+'/portal')){
		app.use('/components/'+dir, express.static(__dirname + '/components/'+dir+'/portal'));
	}
});

// add the api
require('./api/index.js')(config, app, components);

// serve the portal
app.use(express.static(__dirname + '/portal/'));

app.listen(3000);