'use strict';

var Q      = require('q');
var util   = require('util');
var Model  = require('../Model');

var scrypt = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../schemas/user'));


// Model Constructor
// -----------------

function User (data) {
	var self = this;

	if(typeof data === 'undefined')
		throw new Error('All constructor arguments are required by Model constructors.');

	// hash password
	if(typeof data.password === 'string') try {
		scrypt.hash(data.password, scrypt.params(0.1));
	} catch(err) {
		return Q.reject(err);
	}

	// hash recovery token
	if(typeof data.recovery_token === 'string') try {
		scrypt.hash(data.recovery_token, scrypt.params(0.1));
	} catch(err) {
		return Q.reject(err);
	}

	return Model.call(self, data);
}



// Model Configuration
// -------------------

User.table = 'users';
User.collections = {};
User.reconstruct = function(data, old) {
	return new User(data);
};
User.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/user', data, {useDefault: true, removeAdditional: true});
};



// Public Methods
// --------------

util.inherits(User, Model);


User.prototype.update = function(conn, delta) {
	return Model.call(this, conn, delta);
};


User.prototype.verifyPassword = function(password) {
	var self = this;

	return Q.Promise(function(resolve, reject, notify){
		scrypt.verify(new Buffer(self.password, 'base64'), password, function(err, res){
			if(err) reject(err); else resolve(res);
		});
	});
};


User.prototype.verifyRecoveryToken = function(token) {
	var self = this;

	return Q.Promise(function(resolve, reject, notify){
		scrypt.verify(new Buffer(self.recovery_token, 'base64'), token, function(err, res){
			if(err) reject(err); else resolve(res);
		});
	});
};


// TODO: check authorizations for update

// TODO: check authorizations for delete


module.exports = User;
