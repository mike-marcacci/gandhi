'use strict';

var util          = require('util');
var Promise       = require('bluebird');
var uuid          = require('../../utils/uuid');
var errors        = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/cycle'));


// EmbeddedModel Constructor
// -------------------------

function Role (conn, data, parent) {
	return EmbeddedModel.call(this, conn, data, parent)
	.then(function(self) {

		// check authorizations
		if(!self.parent.authorizations['cycle/roles:read'])
			return Promise.reject(new errors.ForbiddenError());

		// cycle_id
		self.cycle_id = self.parent.id;

		return self;
	});
}


// EmbeddedModel Configuration
// ---------------------------

Role.key = 'roles';
Role.collections = {};
Role.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/cycle#/definitions/role', data, {useDefault: true, removeAdditional: true});
};
Role.create = function(conn, data, parent) {

	if(!parent.authorizations['cycle/roles:write'])
		return Promise.reject(new errors.ForbiddenError());

	// generate a new uuid
	data.id = uuid();

	var err = Role.validate(data);
	if(err) return Promise.reject(new errors.ValidationError('The input is invalid.', err));

	return new Role(conn, data, parent)
	.then(function(role) {
		return role.save(conn);
	});
};


// Public Methods
// --------------

util.inherits(Role, EmbeddedModel);


// check authorizations for update
Role.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.parent.authorizations['cycle/roles:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.update.call(self, conn, delta);
};

// check authorizations for delete
Role.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['cycle/roles:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(self, conn);
};


module.exports = Role;
