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
		transport: 'SMTP',
		mailOptions: {
			service: 'Mandrill',
			auth: {
				user: 'mike.marcacci@gmail.com',
				pass: '0eCce8d2FKfLrTxiFYOReg'
			}
		},
		messageOptions: {
			from: 'test@test.gandhi.io'
		}
	},
	extensions: {
		message: {
			name: 'message',
			directory: __dirname + '/lib/components/message/',
			config: {}
		}
	},
	files: {
		directory: __dirname + '/files'
	},
	port: 3000,
	log: true
};
