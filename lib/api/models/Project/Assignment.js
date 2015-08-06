'use strict';

var util = require('util');
var errors = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/project'));


// EmbeddedModel Constructor
// -------------------------

function Assignment (data, parent) {
	return EmbeddedModel.call(this, data, parent);
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

	return new Assignment(data, parent)
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

	return EmbeddedModel.prototype.update.call(this, conn, delta);
};

// check authorizations for delete
Assignment.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['project/assignments:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(this, conn);
};


module.exports = Assignment;