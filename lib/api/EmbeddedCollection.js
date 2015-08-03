'use strict';

var _       = require('lodash');
var Promise = require('bluebird');
var errors  = require('./errors');

function EmbeddedCollection (data, parent) {
	if(typeof this.model !== 'function')
		throw new Error('An EmbeddedCollection constructor must have a `model` function configured.');
	
	this.data = data;
	this.parent = parent;
}

EmbeddedCollection.prototype.query = function(query) {
	var self = this;
	return Promise.filter(
		_.map(self.data, function(o) {
			return new self.model(o, self.parent);
		}),
		function(o) {

			// TODO: apply filters
			
			return true;
		}
	);
};

EmbeddedCollection.prototype.get = function(id) {
	var self = this;

	if(!self.data[id])
		return Promise.reject(new errors.NotFoundError(self.model.name + ' not found.'));

	return Promise.resolve(new self.model(self.data[id], self.parent));
};

EmbeddedCollection.prototype.create = function(conn, data) {
	var self = this;

	return self.model.create(conn, data, self.parent);
};

module.exports = EmbeddedCollection;
