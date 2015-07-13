'use strict';

var util = require('util');
var Model = require('../Model');

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

	Model.call(self, data);
}



// Model Configuration
// -------------------

User.table = 'users';
User.collections = {};
User.reconstruct = function(data, old) {
	return new User(data);
}
User.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/user', data, {useDefault: true, removeAdditional: true});
};



// Public Methods
// --------------

util.inherits(User, Model);


// TODO: check authorizations for update

// TODO: check authorizations for delete


module.exports = User;
