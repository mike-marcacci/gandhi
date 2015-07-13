'use strict';

var util = require('util');
var EmbeddedCollection = require('../../EmbeddedCollection');
var Status = require('../../models/cycle/Status');

function Statuses (data, parent) {
	this.model = Status;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Statuses, EmbeddedCollection);

// TODO: check authorizations for cycle/statuses:read

module.exports = Statuses;