'use strict';

var Pool = require('generic-pool').Pool;
var r = require('rethinkdb');

module.exports = function(options, max, min, idleTimeoutMillis) {
	return Pool({
		name: 'rethinkdb',
		create: function(callback) {
			return r.connect(options, callback);
		},
		destroy: function(connection) {
			return connection.close();
		},
		log: false,
		min: min || 2,
		max: max || 10,
		idleTimeoutMillis: idleTimeoutMillis || 30000
	});
};