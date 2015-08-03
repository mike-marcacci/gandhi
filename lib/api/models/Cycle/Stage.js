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

function Stage (data, parent) {
	return EmbeddedModel.call(this, data, parent);
}


// EmbeddedModel Configuration
// ---------------------------

Stage.key = 'stages';
Stage.collections = {};
Stage.validate = function(data) {};
Stage.create = function(data, parent) {
	return new Stage(data, parent);
};


// Public Methods
// --------------

util.inherits(Stage, EmbeddedModel);


// TODO: check authorizations for cycle/assignments:write


module.exports = Stage;