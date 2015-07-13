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

function Assignment (data, parent) {
	return EmbeddedModel.call(this, data, parent);
}


// EmbeddedModel Configuration
// ---------------------------

Assignment.key = 'assignments';
Assignment.collections = {};
Assignment.validate = function(data) {};



// Public Methods
// --------------

util.inherits(Assignment, EmbeddedModel);


// TODO: check authorizations for cycle/assignments:write


module.exports = Assignment;