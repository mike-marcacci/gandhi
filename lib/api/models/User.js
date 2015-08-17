'use strict';

var Q      = require('q');
var util   = require('util');
var uuid   = require('../utils/uuid');
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
User.create = function(conn, data) {

	// generate a new uuid
	data.id = uuid();

	// hash password
	if(typeof data.password === 'string') try {
		data.password = scrypt.hash(data.password, scrypt.params(0.1));
	} catch(err) {
		return Q.reject(err);
	}

	// hash recovery token
	if(typeof data.recovery_token === 'string') try {
		data.recovery_token = scrypt.hash(data.recovery_token, scrypt.params(0.1));
	} catch(err) {
		return Q.reject(err);
	}

	return new User(data)
	.then(function(user){
		return user.save(conn);
	});
};



// Public Methods
// --------------

util.inherits(User, Model);


User.prototype.update = function(conn, delta) {
	var self = this;

	// hash password
	if(typeof delta.password === 'string') try {
		delta.password = scrypt.hash(delta.password, scrypt.params(0.1));
	} catch(err) {
		return Q.reject(err);
	}

	// hash recovery token
	if(typeof delta.recovery_token === 'string') try {
		delta.recovery_token = scrypt.hash(delta.recovery_token, scrypt.params(0.1));
	} catch(err) {
		return Q.reject(err);
	}

	return Model.prototype.update.call(self, conn, delta);
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
