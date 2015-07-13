'use strict';

var _ = require('lodash');
var Q = require('q');
var errors = require('./errors');

function EmbeddedCollection (data, parent) {
	if(typeof this.model !== 'function')
		throw new Error('An EmbeddedCollection constructor must have a `model` function configured.');
	
	this.data = data;
	this.parent = parent;
}

EmbeddedCollection.prototype.query = function(query, user) {
	var self = this;
	return Q.when(
		_(self.data)
		.map(function(o) {
			return new self.model(o, self.parent);
		})
		.filter(function(o) {
			// TODO: apply filters
			return true;
		})
		.value()
	);
};

EmbeddedCollection.prototype.get = function(id) {
	var self = this;

	if(!self.data[id])
		return Q.reject(new errors.NotFoundError(self.model.name + ' not found.'));

	return Q.when(new self.model(self.data[id], self.parent));
};

module.exports = EmbeddedCollection;
