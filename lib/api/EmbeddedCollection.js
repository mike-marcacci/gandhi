'use strict';

var _ = require('lodash');

function EmbeddedCollection (model, data, parent) {
	this.model = model;
	this.data = data;
	this.parent = parent;
}

EmbeddedCollection.prototype.query = function(query, user) {
	var self = this;
	return _(self.data)

	.filter(function(o) {
		// TODO: apply filters
	})

	.map(function(o) {
		return new this.model(o, self.parent);
	})

	.unwrap();
};

EmbeddedCollection.prototype.get = function(id) {
	if(this.data[id]) return new this.model(this.data[id], this.parent);
	return null;
};
