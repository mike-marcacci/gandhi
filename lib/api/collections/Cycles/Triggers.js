'use strict';

var util = require('util');
var EmbeddedCollection = require('../../EmbeddedCollection');
var Trigger = require('../../models/cycle/Trigger');

function Triggers (data, parent) {
	this.model = Trigger;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Triggers, EmbeddedCollection);

// TODO: check authorizations for cycle/triggers:read

module.exports = Triggers;