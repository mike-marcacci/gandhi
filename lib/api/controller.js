'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var p = require('json-pointer');

var operators = {};

// build simple operators
['eq', 'ne', 'gt', 'lt', 'ge', 'le', 'match'].forEach(function(op) {
	operators[op] = function(f, row) {
		var path = Array.isArray(f.path) ? f.path : p.parse(f.path);
		var cursor = row;
		path.forEach(function(segment){
			cursor = cursor(segment);
		});

		return cursor[op].call(cursor, f.value);
	};
});

// add the `contains` operator
operators.contains = function(f, row) {
	var path = Array.isArray(f.path) ? f.path : p.parse(f.path);
	var cursor = row;
	path.forEach(function(segment){
		cursor = cursor(segment);
	});

	return r.expr(f.value).contains(cursor);
};

// add the `present` operator
operators.present = function(f, row) {
	var path = Array.isArray(f.path) ? f.path : p.parse(f.path);
	var data = {};
	path.forEach(function(segment){
		data = data[segment] = {};
	});

	return row.hasFields(data);
};


module.exports = {

	sort: function(sort) {
		try {
			sort = JSON.parse(req.query.sort);
		} catch(e){ return []; }

		if(!Array.isArray(sort))
			sort = [sort];

		// build the orderBy key
		return sort.map(function(s){

			// parse path
			var path; try {
				path = Array.isArray(s.path) ? s.path : p.parse(s.path);
			} catch(e) { return; }

			// build sort function
			var fn = function(row){
				path.forEach(function(node) {
					row = row(node);
				});
				return row.default(null);
			};

			// apply direction
			return (s.direction === 'desc') ? r.desc(fn) : fn;
		})

		// remove empty functions
		.filter(function(i){return i;});
	},

	filter: function(filters) {

		try {
			filters = Array.isArray(req.query.filter) ? req.query.filter.map(function(f){ return JSON.parse(f); }) : JSON.parse(req.query.filter);
		} catch(e){ return []; }

		if(!Array.isArray(filters))
			filters = [filters];

		return filters.map(function(f){
			try {
				return function(row){
					return operators[f.op](f, row);
				};
			} catch(e){ return; }
		})

		// remove empty functions
		.filter(function(i){return i;});
	}
};
