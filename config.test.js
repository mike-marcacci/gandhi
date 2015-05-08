'use strict';

var fs = require('fs');
var crypto = require('crypto');

module.exports = {
	root: '',
	db: {
		host: 'localhost',
		db: 'gandhi'
	},
	pool: {
		max: 1,
		min: 1,
		timeout: 30000
	},
	redis: {
		host: process.env.REDIS_PORT_6379_TCP_ADDR || '127.0.0.1',
		port: process.env.REDIS_PORT_6379_TCP_PORT || 6379
	},
	lock: {
		retry: 50,
		timeout: 30000
	},
	auth: {
		secret: 'rubber bunny'
	},
	mail: {
		transport: null,
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
	log: false
};
