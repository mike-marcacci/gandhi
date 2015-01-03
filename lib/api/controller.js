'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var p = require('json-pointer');
var qs = require('qs');
var li = require('li');

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
	sort: function(req, query) {
		var sort; try {
			sort = JSON.parse(req.query.sort);
		} catch(e){ return query; }

		if(!Array.isArray(sort))
			sort = [sort];

		return query.orderBy.apply(query, sort

			// build the orderBy key
			.map(function(s){

				// parse path
				var path; try {
					path = Array.isArray(s.path) ? s.path : p.parse(s.path);
				} catch(e) { return; }

				// apply path
				var fn = function(row){
					path.forEach(function(node) {
						row = row(node);
					});

					return row.default(null);
				};

				// apply direction
				if(s.direction === 'desc')
					return r.desc(fn);
				
				return fn;
			})

			// remove empty orderBy keys
			.filter(function(i){return i;})
		);
	},
	filter: function(req, query) {
		var filters; try {
			filters = JSON.parse(req.query.filter);
		} catch(e){ return query; }

		if(!Array.isArray(filters))
			filters = [filters];

		filters.forEach(function(f){
			try {
				query = query.filter(function(row){
					return operators[f.op](f, row);
				});
			} catch(e){}
		});

		return query;
	},
	paginate: function(req, res, page, per_page, total) {
		var pages = {
			first: 1,
			last: Math.ceil(total / per_page)
		};

		if(page > 1)
			pages.prev = page - 1;

		if(page < pages.last)
			pages.next = page + 1;

		res.set('Pages', JSON.stringify(pages));
		res.set('Link', li.stringify(_.mapValues(pages, function(value){
			return req.path + '?' + qs.stringify(_.extend({}, req.query, {page: value, per_page: per_page}));
		})));
	}
};
