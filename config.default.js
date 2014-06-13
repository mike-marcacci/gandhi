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
	components: {
		directory: __dirname + '/components'
	},
	files: {
		directory: __dirname + '/files'
	},
	port: 3000
};
