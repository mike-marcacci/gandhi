'use strict';

var fs = require('fs');
var cluster = require('cluster');


// the config
var config = process.argv.length > 2 ?

	// config from argument
	require(['/','.'].indexOf(process.argv[2][0]) === -1 ? './' + process.argv[2] : process.argv[2])
	: fs.existsSync(__dirname + '/config.json') || fs.existsSync(__dirname + '/config.js') || fs.existsSync(__dirname + '/config/index.js') ?

		// config in root directory
		require('./config')

		// default config
		: require('./config.default.js');


var gandhi = require('./lib/index.js')(config);


// the master
if (cluster.isMaster) {

	// setup the environment
	require('./setup/index.js')(config)

	// spawn child processes
	for (var i = 0; i < require('os').cpus().length; i++) {
		cluster.fork();
	}

	// replace a dead child
	cluster.on('exit', function(child, code, signal) {
		console.error('Child process ' + child.process.pid + ' died with code ' + code +'. Restarting...');
		cluster.fork();
	});
}




// the child processes
else {

	var app = require('express')();

	// bring in gandhi
	app.use(config.root, gandhi);

	// this needs to be here because Angular is stupid, and fails to use any sensible query string
	// format... we need to find a better way to fix this, probably on the client side.
	app.set('query parser', 'simple');

	app.listen(config.port);

}

