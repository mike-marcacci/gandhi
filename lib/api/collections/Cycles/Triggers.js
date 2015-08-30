'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Trigger = require('../../models/Cycle/Trigger');

function Triggers (data, parent) {
	this.model = Trigger;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Triggers, EmbeddedCollection);

Triggers.prototype.query = function(conn, query) {
	var self = this;

	if(!self.parent.authorizations['cycle/triggers:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.query.call(self, conn, query);
};

module.exports = Triggers;