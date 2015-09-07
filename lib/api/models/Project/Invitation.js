'use strict';

var util          = require('util');
var Promise       = require('bluebird');
var uuid          = require('../../utils/uuid');
var errors        = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/project'));


// EmbeddedModel Constructor
// -------------------------

function Invitation (conn, data, parent) {
	return EmbeddedModel.call(this, conn, data, parent)
	.then(function(self) {

		// check authorizations
		if(!self.parent.authorizations['project/invitations:read'])
			return Promise.reject(new errors.ForbiddenError());

		// project_id
		self.project_id = self.parent.id;

		// admin
		if(self.parent.role === true)
			return self;

		// get the role
		return self.parent.cycle.roles.get(conn, self.role_id)
		.then(function(role){

			// check visibility
			if(self.parent.role !== true && (!self.parent.role || !role.visible[self.parent.role.id]))
				return Promise.reject(new errors.ForbiddenError());

			return self;
		});
	});
}


// EmbeddedModel Configuration
// ---------------------------

Invitation.key = 'invitations';
Invitation.collections = {};
Invitation.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/project#/definitions/invitation', data, {useDefault: true, removeAdditional: true});
};
Invitation.create = function(conn, data, parent) {

	if(!parent.authorizations['project/invitations:write'])
		return Promise.reject(new errors.ForbiddenError());

	// generate a new uuid
	data.id = uuid();

	var err = Invitation.validate(data);
	if(err) return Promise.reject(new errors.ValidationError('The input is invalid.', err));

	return new Invitation(conn, data, parent)
	.then(function(invitation) {

		// get the role
		return invitation.parent.cycle.roles.get(conn, invitation.role_id)
		.then(function(role){

			// check assignability
			if(invitation.parent.role !== true && (!invitation.parent.role || !role.assignable[invitation.parent.role.id]))
				return Promise.reject(new errors.ForbiddenError());

			return invitation.save(conn);
		});
	});
};


// Public Methods
// --------------

util.inherits(Invitation, EmbeddedModel);


// check authorizations for update
Invitation.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.parent.authorizations['project/invitations:write'])
		return Promise.reject(new errors.ForbiddenError());

	// get the old and new roles
	return Promise.resolve([
		self.parent.cycle.roles.get(conn, self.role_id),
		self.parent.cycle.roles.get(conn, delta.role_id || self.role_id)
	])
	.spread(function(oldRole, newRole){

		// check assignability of old role
		if(self.parent.role !== true && (!self.parent.role || !oldRole.assignable[self.parent.role.id]))
			return Promise.reject(new errors.ForbiddenError());

		// check assignability of new role
		if(self.parent.role !== true && (!self.parent.role || !newRole.assignable[self.parent.role.id]))
			return Promise.reject(new errors.ForbiddenError());

		return EmbeddedModel.prototype.update.call(self, conn, delta);
	})

	// convert NotFoundError to ValidationError
	.catch(function(err) {
		return Promise.reject((err.name === 'NotFoundError') ?
			new errors.ValidationError('Unable to proceed: the role does not exist.')
			: err
		);
	});
};

// check authorizations for delete
Invitation.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['project/invitations:write'])
		return Promise.reject(new errors.ForbiddenError());

	// admin
	if(self.parent.role === true)
		return EmbeddedModel.prototype.delete.call(self, conn);

	// get the role
	return self.parent.cycle.roles.get(conn, self.role_id)
	.then(function(role){

		// check assignability
		if(self.parent.role !== true && (!self.parent.role || !role.assignable[self.parent.role.id]))
			return Promise.reject(new errors.ForbiddenError());

		return EmbeddedModel.prototype.delete.call(self, conn);
	});

};


module.exports = Invitation;
