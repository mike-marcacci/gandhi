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

function Invitation (data, parent) {
	return EmbeddedModel.call(this, data, parent);
}


// EmbeddedModel Configuration
// ---------------------------

Invitation.key = 'invitations';
Invitation.collections = {};
Invitation.validate = function(data) {};
Invitation.create = function(data, parent) {
	return new Invitation(data, parent);
};


// Public Methods
// --------------

util.inherits(Invitation, EmbeddedModel);


// TODO: check authorizations for cycle/assignments:write


module.exports = Invitation;