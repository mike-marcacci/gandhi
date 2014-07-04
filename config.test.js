'use strict';

var crypto = require('crypto');

module.exports = {
	root: '',
	db: {
		host: '127.0.0.1',
		db: 'gandhi'
	},
	auth: {
		secret: 'rubber bunny'
	},
	mail: {

	},
	components: {
		message: {
			directory: __dirname + '/components/message',
			config: {}
		},
		form: {
			directory: __dirname + '/components/form',
			config: {}
		}
	},
	files: {
		directory: __dirname + '/files'
	},
	port: 3000,
	log: false
};
