'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Status = require('../../models/cycle/Status');

function Statuses (data, parent) {
	this.model = Status;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Statuses, EmbeddedCollection);

Statuses.prototype.query = function(query) {
	var self = this;

	if(!self.parent.authorizations['cycle/statuses:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.query.call(self, query);
};

Statuses.prototype.get = function(id) {
	var self = this;

	if(!self.parent.authorizations['cycle/statuses:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.get.call(self, id);
};

module.exports = Statuses;