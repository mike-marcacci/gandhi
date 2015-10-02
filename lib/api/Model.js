'use strict';

var r       = require('rethinkdb');
var _       = require('lodash');
var Promise = require('bluebird');
var errors  = require('./errors');


// Model Constructor
// -----------------

function Model (conn, data) {
	var self = this;

	if(typeof self.constructor.table !== 'string')
		throw new Error('The model constructor ' + self.constructor.name + ' must have a `table` string configured.');

	if(typeof self.constructor.collections !== 'object')
		throw new Error('The model constructor ' + self.constructor.name + ' must have a `collections` object configured.');
	
	if(typeof self.constructor.reconstruct !== 'function')
		throw new Error('The model constructor ' + self.constructor.name + ' must have a `reconstruct` function configured.');
	
	if(typeof self.constructor.validate !== 'function')
		throw new Error('The model constructor ' + self.constructor.name + ' must have a `validate` function configured.');
	
	if(typeof self.constructor.create !== 'function')
		throw new Error('The model constructor ' + self.constructor.name + ' must have a `create` function configured.');

	// add embedded collections
	_.each(self.constructor.collections, function(Collection, key) {
		Object.defineProperty(self, key, {
			value: new Collection(data[key] || {}, self)
		});
	});

	// attach data
	self.updated = data.updated || (Date.now() / 1000);
	self.created = data.created || (Date.now() / 1000);
	_.defaults(self, data);

	return Promise.resolve(self);
}



// Model Configuration
// -------------------
// The following must be set on all model constructors; failure to set these will
// result in a thrown error:
//
// Model.table = '';
// Model.collections = {};
// Model.reconstruct = function(data, old) {};
// Model.validate = function(data) {};
// Model.create = function(data) {};



// Public Methods
// --------------

Model.prototype.raw = function(conn) {
	var self = this;

	// apply raw collection data
	var data = _.defaults(_.mapValues(self.constructor.collections, function(v, k) {
		return self[k].data;
	}), self);

	// validate against schema
	var err = self.constructor.validate(data);
	if(err) return Promise.reject(new errors.ValidationError('The input is invalid.', err));

	return Promise.resolve(data);
};


Model.prototype.save = function(conn) {
	var self = this;

	return self.raw(conn)
	.then(function(data){

		// save to the database
		return r.table(self.constructor.table).insert(data, {conflict: 'replace'}).run(conn)

		// reconstruct self with new data
		.then(function(){
			return self.constructor.reconstruct(conn, data, self);
		});
	});
};


Model.prototype.update = function(conn, delta) {
	var self = this;

	// ignore any collections
	var sanitized = {};
	for (var k in delta)
		if(typeof self.constructor.collections[k] === 'undefined')
			sanitized[k] = delta[k];

	// manage timestamps
	delete sanitized.created;
	sanitized.updated = Date.now() / 1000;

	// merge into self
	_.merge(self, sanitized, function(objectValue, sourceValue) {
		if (Array.isArray(objectValue)) return objectValue;
	});

	// save
	return self.save(conn);
};


Model.prototype.delete = function(conn) {
	var self = this;

	// delete the record
	return r.table(self.constructor.table).get(self.id).delete().run(conn)

	// return the old value
	.then(function(){
		return self;
	});
};





module.exports = Model;