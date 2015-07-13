'use strict';

var util = require('util');
var EmbeddedCollection = require('../../EmbeddedCollection');
var Invitation = require('../../models/cycle/Invitation');

function Invitations (data, parent) {
	this.model = Invitation;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Invitations, EmbeddedCollection);

// TODO: check authorizations for cycle/invitations:read

module.exports = Invitations;