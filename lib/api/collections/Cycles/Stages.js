'use strict';

var util = require('util');
var EmbeddedCollection = require('../../EmbeddedCollection');
var Stage = require('../../models/cycle/Stage');

function Stages (data, parent) {
	this.model = Stage;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Stages, EmbeddedCollection);

// TODO: check authorizations for cycle/stages:read

module.exports = Stages;