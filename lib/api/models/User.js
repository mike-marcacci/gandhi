'use strict';

var Promise = require('bluebird');
var util    = require('util');
var uuid    = require('../utils/uuid');
var Model   = require('../Model');

var scrypt  = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../schemas/user'));


// Model Constructor
// -----------------

function User (conn, data) {
	var self = this;

	if(typeof data === 'undefined')
		throw new Error('All constructor arguments are required by Model constructors.');

	return Model.call(self, conn, data);
}


// Model Configuration
// -------------------

User.table = 'users';
User.collections = {};
User.reconstruct = function(conn, data, old) {
	return new User(conn, data);
};
User.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/user', data, {useDefault: true, removeAdditional: true});
};
User.create = function(conn, data) {

	// generate a new uuid
	data.id = uuid();

	// hash password
	if(typeof data.password === 'string') try {
		data.password = scrypt.hash(data.password, scrypt.params(0.1));
	} catch(err) {
		return Promise.reject(err);
	}

	// hash recovery token
	if(typeof data.recovery_token === 'string') try {
		data.recovery_token = scrypt.hash(data.recovery_token, scrypt.params(0.1));
	} catch(err) {
		return Promise.reject(err);
	}

	return new User(conn, data)
	.then(function(user){
		return user.save(conn);
	});
};



// Public Methods
// --------------

util.inherits(User, Model);


User.prototype.update = function(conn, delta) {
	var self = this;

	// TODO: check authorizations for update

	// hash password
	if(typeof delta.password === 'string') try {
		delta.password = scrypt.hash(delta.password, scrypt.params(0.1));
	} catch(err) {
		return Promise.reject(err);
	}

	// hash recovery token
	if(typeof delta.recovery_token === 'string') try {
		delta.recovery_token = scrypt.hash(delta.recovery_token, scrypt.params(0.1));
	} catch(err) {
		return Promise.reject(err);
	}

	return Model.prototype.update.call(self, conn, delta);
};


User.prototype.delete = function(conn) {
	var self = this;

	// TODO: check authorizations for delete

	return Model.prototype.delete.call(self, conn);
};


User.prototype.verifyPassword = function(password) {
	var self = this;

	return new Promise(function(resolve, reject, notify){
		scrypt.verify(new Buffer(self.password, 'base64'), password, function(err, res){
			if(err) reject(err); else resolve(res);
		});
	});
};


User.prototype.verifyRecoveryToken = function(token) {
	var self = this;

	return new Promise(function(resolve, reject, notify){
		scrypt.verify(new Buffer(self.recovery_token, 'base64'), token, function(err, res){
			if(err) reject(err); else resolve(res);
		});
	});
};


module.exports = User;
