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
	self.updated = data.updated || Date.now();
	self.created = data.created || Date.now();
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

	// save to the database
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
	sanitized.updated = Date.now();

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




// chainable event emitter stuff
// -----------------------------
//
// TODO: move to its own package and use _.assign to apply its methods to the Model prototype.


Model.prototype.on = function(name, fn) {
	var self = this;

	if(typeof self.listeners === 'undefined')
		Object.defineProperty(self, 'listeners', { value: {} });

	self.listeners[name] = self.listeners[name] || [];

	// don't add the same listener twice
	if(self.listeners[name].indexOf(fn) !== -1)
		return false;

	// add the listener
	self.listeners[name].push(fn);
	return true;
};


Model.prototype.off = function(name, fn) {
	var self = this;

	if(typeof self.listeners === 'undefined')
		Object.defineProperty(self, 'listeners', { value: {} });

	// remove all listeners to name
	if(typeof fn === 'undefined')
		return delete self.listeners[name];

	// there are no listeners to name
	if(!Array.isArray(self.listeners[name]) || !self.listeners[name].length)
		return false;

	var i = self.listeners[name].indexOf(fn);

	// fn is not listening to name
	if(i === -1)
		return false;

	// remove the listener
	self.listeners[name].splice(i, 1);
	return true;
};


Model.prototype.emit = function(name) {
	var self = this;
	var args = arguments;

	if(typeof self.listeners === 'undefined')
		Object.defineProperty(self, 'listeners', { value: {} });

	// no listeners
	if(!self.listeners[name] || !self.listeners[name].length)
		return Promise.resolve([]);

	// call all listeners in parallel
	return Promise.settle(self.listeners[name].map(function(listener) {
		return listener.apply(self, args);
	}));
};





module.exports = Model;