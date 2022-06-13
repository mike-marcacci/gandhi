'use strict';

const fs = require('fs')

module.exports = {
	root: '',
	db: {
		host: 'rethinkdb',
		db: `gandhi_${(Math.random() + 1).toString(36).substring(7)}`
	},
	pool: {
		max: 1,
		min: 1,
		timeout: 30000
	},
	redis: {
		host: 'redis',
		port: 6379
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
