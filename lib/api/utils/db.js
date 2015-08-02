'use strict';

var Promise = require('bluebird');
var Pool = require('generic-pool').Pool;
var r = require('rethinkdb');

module.exports = function(options, max, min, idleTimeoutMillis) {
	var pool = Pool({
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

	pool.disposer = function(){
		return Promise.fromNode(pool.acquire.bind(pool))
		.disposer(function(conn){
			pool.release(conn);
		});
	};

	return pool;
};