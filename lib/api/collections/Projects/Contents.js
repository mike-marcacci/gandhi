'use strict';

var _       = require('lodash');
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

Contents.prototype.query = function(conn, query) {
	var self = this;

	if(!self.parent.authorizations['project/contents:read'])
		return Promise.reject(new errors.ForbiddenError());

	return Promise.all([
		self.parent.cycle.stages.query(conn, {}),
		EmbeddedCollection.prototype.query.call(self, conn, query)
	])
	.spread(function(stages, contents) {
		stages = _.indexBy(stages, 'id');
		return _.sortBy(contents, function(content) {
			return stages[content.id] ? stages[content.id].order : 0;
		});
	})
};

module.exports = Contents;