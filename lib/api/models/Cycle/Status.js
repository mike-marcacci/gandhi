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

function Status (conn, data, parent) {
	return EmbeddedModel.call(this, conn, data, parent)
	.then(function(self) {

		// check authorizations
		if(!self.parent.authorizations['cycle/statuses:read'])
			return Promise.reject(new errors.ForbiddenError());

		// cycle_id
		self.cycle_id = self.parent.id;

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

	// generate a new uuid
	data.id = uuid();

	var err = Status.validate(data);
	if(err) return Promise.reject(new errors.ValidationError('The input is invalid.', err));

	return new Status(conn, data, parent)
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

	return EmbeddedModel.prototype.update.call(self, conn, delta);
};

// check authorizations for delete
Status.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['cycle/statuses:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(self, conn);
};


module.exports = Status;
