'use strict';

var fs = require('fs');
var crypto = require('crypto');

module.exports = {
	// This is the root path for the portal, without trailing slash. It
	// might be used to host your system at www.example.com/portal.
	root: '',

	// These are the connection details for RethinkDB.
	db: {
		host: '127.0.0.1',
		db: 'gandhi'
	},

	// To make things run faster, we keep a pool of Rethinkdb connections
	// inside each process. You can tune the pool's settings here.
	pool: {
		max: 30,
		min: 1,
		timeout: 30000
	},

	// These are the connection details for Redis.
	redis: {
		host: '127.0.0.1',
		port: 6379
	},

	// When gandhi can't use an atomic operation to alter a document in
	// rethinkdb, we need to lock it so we don't try to process multiple
	// writes at the same time. You can tune the lock settings here.
	lock: {
		retry: 100,
		timeout: 30000
	},

	// Authentication is made persistant by ust of Json Web Tokens. You
	// must provide a secret for cryptographically signing these tokens.
	// Make sure this stays secret, or an attacker could impersonate
	// system users.
	auth: {
		secret: ''
	},

	// Gandhi used nodemailer to support almost any mail sending option
	// out there. You can configure it here. Learn more at:
	// https://github.com/andris9/Nodemailer
	mail: {
		transport: {
			service: 'Mandrill',
			auth: {
				user: 'mike.marcacci@gmail.com',
				pass: '0eCce8d2FKfLrTxiFYOReg'
			}
		},
		defaults: {
			from: 'test@test.gandhi.io'
		}
	},

	// Gandhi uses a module system to add new functionality. In fact,
	// many core components are actually written as modules. This must
	// be an array of paths to the various different modules you wish
	// to use.
	//
	// In this example, we programatically build a list of modules from
	// the modules directlry.
	modules: fs.readdirSync(__dirname + '/lib/modules').map(function(dir){
		return __dirname + '/lib/modules/' + dir;
	}),

	// Where do you want to store uploaded files? Right now, this only
	// supports using the local filesystem or NFS, but in the future
	// it will support other options like S3 and CloudFiles
	files: {
		directory: __dirname + '/uploads'
	},

	// On what port do you want gandhi to listen? In our opinion, it's
	// best to run apps behind something like NGINX, but there's nothing
	// stoppingy you from just running directly on port 80.
	port: 3000
};

// get or set the secret
var secret = __dirname + '/secret.txt';
if(fs.existsSync(secret)) {
	module.exports.auth.secret = fs.readFileSync(secret, {encoding: 'base64'});
} else {
	module.exports.auth.secret = crypto.randomBytes(256).toString('base64');
	fs.writeFileSync(secret, module.exports.auth.secret);
}
