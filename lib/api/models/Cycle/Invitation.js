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

function Invitation (conn, data, parent) {
	return EmbeddedModel.call(this, conn, data, parent)
	.then(function(self) {

		// check authorizations
		if(!self.parent.authorizations['cycle/invitations:read'])
			return Promise.reject(new errors.ForbiddenError());

		// cycle_id
		self.cycle_id = self.parent.id;

		return self;
	});
}


// EmbeddedModel Configuration
// ---------------------------

Invitation.key = 'invitations';
Invitation.collections = {};
Invitation.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/cycle#/definitions/invitation', data, {useDefault: true, removeAdditional: true});
};
Invitation.create = function(conn, data, parent) {

	if(!parent.authorizations['cycle/invitations:write'])
		return Promise.reject(new errors.ForbiddenError());

	// generate a new uuid
	data.id = uuid();

	var err = Invitation.validate(data);
	if(err) return Promise.reject(new errors.ValidationError('The input is invalid.', err));

	return new Invitation(conn, data, parent)
	.then(function(invitation) {
		return invitation.save(conn);
	});
};


// Public Methods
// --------------

util.inherits(Invitation, EmbeddedModel);


// check authorizations for update
Invitation.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.parent.authorizations['cycle/invitations:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.update.call(self, conn, delta);
};

// check authorizations for delete
Invitation.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['cycle/invitations:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(self, conn);
};


module.exports = Invitation;
