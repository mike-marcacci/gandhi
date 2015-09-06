'use strict';

var Promise = require('bluebird');
var jwt     = require('jsonwebtoken');
var crypto  = require('crypto');

var scrypt  = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';


module.exports = function(config, resources) {
	return {
		random: function(length){
			return crypto.randomBytes(length || 64).toString('base64');
		},
		hashPassword: function(plain) {
			return scrypt.hash(plain, scrypt.params(0.1));
		},
		verifyPassword: function(plain, truth) {
			return new Promise(function(resolve, reject, notify){
				scrypt.verify(new Buffer(truth, 'base64'), plain, function(err, res){
					if(err) reject(err); else resolve(res);
				});
			});
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
