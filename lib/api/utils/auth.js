'use strict';

var Promise = require('bluebird');
var jwt     = require('jsonwebtoken');
var crypto  = require('crypto');

module.exports = function(config, resources) {
	return {
		random: function(length){
			return crypto.randomBytes(length || 64).toString('base64');
		},
		verifyToken: function(token) {
			return new Promise(function(resolve, reject, notify){
				jwt.verify(token, config.auth.secret, function(err, res) {
					if(err) reject(err); else resolve(res);
				});
			});
		},
		signToken: function(data, options) {
			return jwt.sign(data, config.auth.secret, options);
		}
	};
};
