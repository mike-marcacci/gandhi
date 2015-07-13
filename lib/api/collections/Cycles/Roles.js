'use strict';

var util = require('util');
var EmbeddedCollection = require('../../EmbeddedCollection');
var Role = require('../../models/cycle/Role');

function Roles (data, parent) {
	this.model = Role;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Roles, EmbeddedCollection);

// TODO: check authorizations for cycle/roles:read

module.exports = Roles;