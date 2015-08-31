'use strict';

var util          = require('util');
var Promise       = require('bluebird');
var errors        = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/project'));


// EmbeddedModel Constructor
// -------------------------

function Assignment (conn, data, parent) {
	return EmbeddedModel.call(this, conn, data, parent)
	.then(function(self) {

		// admin or own assignment
		if(self.parent.role === true || self.parent.user.id === self.id)
			return self;

		// check project authorizations
		if(!self.parent.authorizations['project/assignments:read'])
			return Promise.reject(new errors.ForbiddenError());

		// check visibility
		return self.parent.cycle.roles.get(conn, self.role_id)
		.catch(function(err) {
			return Promise.reject(new errors.ForbiddenError());
		})
		.then(function(role) {

			if(!role.visible[self.parent.role.id])
				return Promise.reject(new errors.ForbiddenError());

			// project_id
			self.project_id = self.parent.id;

			return self;
		});

	});
}


// EmbeddedModel Configuration
// ---------------------------

Assignment.key = 'assignments';
Assignment.collections = {};
Assignment.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/project#/definitions/assignment', data, {useDefault: true, removeAdditional: true});
};
Assignment.create = function(conn, data, parent) {
	
	if(!parent.authorizations['project/assignments:write'])
		return Promise.reject(new errors.ForbiddenError());

	var err = Assignment.validate(data);
	if(err) return Promise.reject(new errors.ValidationError('The input is invalid.', err));

	return Promise.resolve(parent.role === true)
	.then(function(admin) {
		if(admin) return;

		// check assignability of role
		return parent.cycle.roles.get(conn, data.role_id)
		.catch(function(err) {
			return Promise.reject(new errors.ForbiddenError());
		})
		.then(function(role) {
			if(role.assignable[parent.role.id])
				return Promise.reject(new errors.ForbiddenError());
		});
	})

	.then(function(){
		return new Assignment(conn, data, parent);
	})
	.then(function(assignment) {
		return assignment.save(conn);
	});
};


// Public Methods
// --------------

util.inherits(Assignment, EmbeddedModel);


// check authorizations for update
Assignment.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.parent.authorizations['project/assignments:write'])
		return Promise.reject(new errors.ForbiddenError());

	return Promise.resolve(self.parent.role === true)
	.then(function(admin) {
		if(admin) return;

		// check assignability of old role
		return self.parent.cycle.roles.get(conn, self.role_id)
		.catch(function(err) {
			return Promise.reject(new errors.ForbiddenError());
		})
		.then(function(oldRole) {
			if(oldRole.assignable[self.parent.role.id])
				return Promise.reject(new errors.ForbiddenError());
		})

		.then(function() {
			if(typeof delta.role_id === 'undefined' || delta.role_id === self.role_id) return;

			// check assignability of new role
			return self.parent.cycle.roles.get(conn, delta.role_id)
			.catch(function(err) {
				return Promise.reject(new errors.ForbiddenError());
			})
			.then(function(newRole) {
				if(newRole.assignable[self.parent.role.id])
					return Promise.reject(new errors.ForbiddenError());
			});
		});
	})

	.then(function() {
		return EmbeddedModel.prototype.update.call(self, conn, delta);
	});
};

// check authorizations for delete
Assignment.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['project/assignments:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(self, conn);
};


module.exports = Assignment;