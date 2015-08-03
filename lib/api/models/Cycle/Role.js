'use strict';

var util = require('util');
var Q = require('q');
var errors = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/cycle'));


// EmbeddedModel Constructor
// -------------------------

function Role (data, parent) {
	return EmbeddedModel.call(this, data, parent);
}


// EmbeddedModel Configuration
// ---------------------------

Role.key = 'roles';
Role.collections = {};
Role.validate = function(data) {};
Role.create = function(data, parent) {
	return new Role(data, parent);
};


// Public Methods
// --------------

util.inherits(Role, EmbeddedModel);


// TODO: check authorizations for cycle/assignments:write


module.exports = Role;