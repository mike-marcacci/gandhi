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

function Status (data, parent) {
	return EmbeddedModel.call(this, data, parent);
}


// EmbeddedModel Configuration
// ---------------------------

Status.key = 'statuses';
Status.collections = {};
Status.validate = function(data) {};



// Public Methods
// --------------

util.inherits(Status, EmbeddedModel);


// TODO: check authorizations for cycle/assignments:write


module.exports = Status;