'use strict';

var Promise = require('bluebird');
var util    = require('util');
var uuid    = require('../utils/uuid');
var Model   = require('../Model');

var scrypt  = require('scrypt');
var scryptParams = scrypt.paramsSync(0.1);


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

	// lowercase email
	if(typeof data.email === 'string')
		data.email = data.email.toLowerCase();

	// hash password
	if(typeof data.password === 'string') try {
		data.password = scrypt.kdfSync(data.password, scryptParams).toString('base64');
	} catch(err) {
		return Promise.reject(err);
	}

	// hash recovery token
	if(typeof data.recovery_token === 'string') try {
		data.recovery_token = scrypt.kdfSync(data.recovery_token, scryptParams).toString('base64');
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

	// lowercase email
	if(typeof delta.email === 'string')
		delta.email = delta.email.toLowerCase();

	// hash password
	if(typeof delta.password === 'string') try {
		delta.password = scrypt.kdfSync(delta.password, scryptParams).toString('base64');
	} catch(err) {
		return Promise.reject(err);
	}

	// hash recovery token
	if(typeof delta.recovery_token === 'string') try {
		delta.recovery_token = scrypt.kdfSync(delta.recovery_token, scryptParams).toString('base64');
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
	return scrypt.verifyKdf(new Buffer(self.password, 'base64'), password);
};


User.prototype.verifyRecoveryToken = function(token) {
	var self = this;
	return scrypt.verifyKdf(new Buffer(self.recovery_token, 'base64'), token);
};


module.exports = User;
