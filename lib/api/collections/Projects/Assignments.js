'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Assignment = require('../../models/Project/Assignment');

function Assignments (data, parent) {
	this.model = Assignment;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Assignments, EmbeddedCollection);

Assignments.prototype.query = function(query) {
	var self = this;

	if(!self.parent.authorizations['project/assignments:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.query.call(self, query);
};

Assignments.prototype.get = function(id) {
	var self = this;

	if(self.parent.user !== true && self.parent.user.id !== id && !self.parent.authorizations['project/assignments:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.get.call(self, id);
};

module.exports = Assignments;