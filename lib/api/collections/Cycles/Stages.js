'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Stage = require('../../models/cycle/Stage');

function Stages (data, parent) {
	this.model = Stage;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Stages, EmbeddedCollection);

Stages.prototype.query = function(query) {
	var self = this;

	if(!self.parent.authorizations['cycle/stages:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.query.call(self, query);
};

Stages.prototype.get = function(id) {
	var self = this;

	if(!self.parent.authorizations['cycle/stages:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.get.call(self, id);
};

module.exports = Stages;