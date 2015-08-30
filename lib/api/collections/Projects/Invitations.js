'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Invitation = require('../../models/Project/Invitation');

function Invitations (data, parent) {
	this.model = Invitation;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Invitations, EmbeddedCollection);

Invitations.prototype.query = function(conn, query) {
	var self = this;

	if(!self.parent.authorizations['project/invitations:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.query.call(self, conn, query);
};

module.exports = Invitations;