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

function Stage (data, parent) {
	return EmbeddedModel.call(this, data, parent);
}


// EmbeddedModel Configuration
// ---------------------------

Stage.key = 'stages';
Stage.collections = {};
Stage.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', data, {useDefault: true, removeAdditional: true});
};
Stage.create = function(conn, data, parent) {
	
	if(!parent.authorizations['cycle/stages:write'])
		return Promise.reject(new errors.ForbiddenError());

	return new Stage(data, parent)
	.then(function(stage) {
		return stage.save(conn);
	});
};


// Public Methods
// --------------

util.inherits(Stage, EmbeddedModel);


// check authorizations for update
Stage.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.parent.authorizations['cycle/stages:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.update.call(this, conn, delta);
};

// check authorizations for delete
Stage.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['cycle/stages:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(this, conn);
};


module.exports = Stage;