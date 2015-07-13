'use strict';

var _ = require('lodash');
var Q = require('q');

var errors = require('./errors');


// EmbeddedModel Constructor
// -------------------------

function EmbeddedModel (data, parent) {
	var self = this;

	if(typeof self.constructor.key !== 'string')
		throw new Error('The embedded model constructor ' + self.constructor.name + ' must have a `key` string configured.');

	if(typeof self.constructor.collections !== 'object')
		throw new Error('The embedded model constructor ' + self.constructor.name + ' must have a `collections` object configured.');
	
	if(typeof self.constructor.validate !== 'function')
		throw new Error('The embedded model constructor ' + self.constructor.name + ' must have a `validate` function configured.');

	if(typeof data === 'undefined' || typeof parent === 'undefined')
		throw new Error('All constructor arguments are required by Model constructors.');

	// parent
	Object.defineProperty(self, 'parent', {
		value: parent
	});

	// add embedded collections
	_.each(self.constructor.collections, function(Collection, key) {
		Object.defineProperty(self, key, {
			value: new Collection(data[key], self)
		});
	});

	// attach data
	_.defaults(self, data);

	return Q.when(self);
}



// EmbeddedModel Configuration
// ---------------------------
// The following must be set on all model constructors; failure to set these will
// result in a thrown error:
//
// EmbeddedModel.key = '';
// EmbeddedModel.collections = {};
// EmbeddedModel.validate = function(data) {};



// Public Methods
// --------------

EmbeddedModel.prototype.save = function(conn) {
	var self = this;

	// apply raw collection data
	var data = _.defaults(_.mapValues(self.constructor.collections, function(v, k) {
		return self[k].data;
	}), self);

	// validate against schema
	var err = self.constructor.validate(data);
	if(err) return Q.reject(new errors.ValidationError('The input is invalid.', err));

	// update the parent's raw collection data
	self.parent[self.constructor.key].data[self.id] = data;

	// reconstruct self with new data
	return Q.when(new self.constructor(data, self.parent));
};


EmbeddedModel.prototype.update = function(conn, delta) {
	var self = this;

	// ignore any collections
	var sanitized = {};
	for (var k in delta)
		if(typeof self.constructor.collections[k] === 'undefined')
			sanitized[k] = sanitized[k];

	// merge into self
	_.merge(self, sanitized, function(objectValue, sourceValue) {
		if (Array.isArray(objectValue)) return objectValue;
	});

	// save
	return self.save(conn);
};


EmbeddedModel.prototype.delete = function(conn) {
	var self = this;
	delete self.parent[self.constructor.key].data[self.id];
	return Q.when(self);
};


module.exports = EmbeddedModel;
