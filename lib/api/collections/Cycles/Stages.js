'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Stage = require('../../models/Cycle/Stage');

function Stages (data, parent) {
	this.model = Stage;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Stages, EmbeddedCollection);

Stages.prototype.query = function(conn, query) {
	var self = this;

	if(!self.parent.authorizations['cycle/stages:read'])
		return Promise.reject(new errors.ForbiddenError());

	// sort by order
	query.sort = 'order';

	return EmbeddedCollection.prototype.query.call(self, conn, query);
};

module.exports = Stages;