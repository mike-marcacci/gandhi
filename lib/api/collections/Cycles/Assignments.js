'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Assignment = require('../../models/Cycle/Assignment');

function Assignments (data, parent) {
	this.model = Assignment;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Assignments, EmbeddedCollection);

Assignments.prototype.query = function(conn, query) {
	var self = this;

	if(!self.parent.authorizations['cycle/assignments:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.query.call(self, conn, query);
};

module.exports = Assignments;