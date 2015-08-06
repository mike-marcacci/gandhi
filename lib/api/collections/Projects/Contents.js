'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Content = require('../../models/Project/Content');

function Contents (data, parent) {
	this.model = Content;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Contents, EmbeddedCollection);

Contents.prototype.query = function(query) {
	var self = this;

	if(!self.parent.authorizations['project/contents:read'])
		return Promise.reject(new errors.ForbiddenError());

	if(!self.visible)
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.query.call(self, query);
};

Contents.prototype.get = function(id) {
	var self = this;

	if(!self.parent.authorizations['project/contents:read'])
		return Promise.reject(new errors.ForbiddenError());

	if(!self.visible)
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.get.call(self, id);
};

module.exports = Contents;