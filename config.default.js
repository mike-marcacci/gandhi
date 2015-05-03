'use strict';

var fs = require('fs');
var crypto = require('crypto');

module.exports = {
	root: '',
	db: {
		host: '127.0.0.1',
		db: 'gandhi'
	},
	pool: {
		max: 30,
		min: 1,
		timeout: 30000
	},
	redis: {
		host: '127.0.0.1'
	},
	auth: {
		secret: ''
	},
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
	modules: fs.readdirSync(__dirname + '/lib/modules').map(function(dir){
		return __dirname + '/lib/modules/' + dir;
	}),
	files: {
		directory: __dirname + '/uploads'
	},
	port: 3000,
	log: true
};

// get or set the secret
var secret = __dirname + '/secret.txt';
if(fs.existsSync(secret)) {
	module.exports.auth.secret = fs.readFileSync(secret, {encoding: 'base64'});
} else {
	module.exports.auth.secret = crypto.randomBytes(256).toString('base64');
	fs.writeFileSync(secret, module.exports.auth.secret);
}
