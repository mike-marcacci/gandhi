'use strict';

var Promise = require('bluebird');
var util    = require('util');
var Model   = require('../Model');
var uuid    = require('../utils/uuid');
var errors  = require('../errors');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../schemas/file'));


// Model Constructor
// -----------------

function File (conn, data, user) {
	var self = this;

	if(typeof data === 'undefined' || typeof user === 'undefined')
		throw new Error('All constructor arguments are required by Model constructors.');

	// user
	Object.defineProperty(self, 'user', {
		value: user
	});

	return Model.call(self, conn, data);
}


// Model Configuration
// -------------------

File.table = 'files';
File.collections = {};
File.reconstruct = function(conn, data, old) {
	return new File(conn, data, old.user);
};
File.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/file', data, {useDefault: true, removeAdditional: true});
};
File.create = function(conn, data, user) {

	// generate a new uuid
	data.id = uuid();

	return new File(conn, data, user)
	.then(function(file){
		return file.save(conn);
	});
};



// Public Methods
// --------------

util.inherits(File, Model);


// restrict to admin for delete
File.prototype.delete = function(conn) {
	var self = this;

	// restrict to admin
	if(self.user !== true)
		return Promise.reject(new errors.ForbiddenError());

	return Model.prototype.delete.call(self, conn);
};


module.exports = File;
