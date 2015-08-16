'use strict';

var util = require('util');
var errors = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/cycle'));


// EmbeddedModel Constructor
// -------------------------

function Status (data, parent) {
	return EmbeddedModel.call(this, data, parent)
	.then(function(self) {

		// check authorizations
		if(!self.parent.authorizations['cycle/statuses:read'])
			return Promise.reject(new errors.ForbiddenError());

		return self;
	});
}


// EmbeddedModel Configuration
// ---------------------------

Status.key = 'statuses';
Status.collections = {};
Status.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/cycle#/definitions/status', data, {useDefault: true, removeAdditional: true});
};
Status.create = function(conn, data, parent) {
	
	if(!parent.authorizations['cycle/statuses:write'])
		return Promise.reject(new errors.ForbiddenError());

	return new Status(data, parent)
	.then(function(status) {
		return status.save(conn);
	});
};


// Public Methods
// --------------

util.inherits(Status, EmbeddedModel);


// check authorizations for update
Status.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.parent.authorizations['cycle/statuses:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.update.call(this, conn, delta);
};

// check authorizations for delete
Status.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['cycle/statuses:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(this, conn);
};


module.exports = Status;