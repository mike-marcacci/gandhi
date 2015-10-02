'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var p = require('json-pointer');
var li = require('li');
var qs = require('qs');

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

// add the `in` operator
operators.in = function(f, row) {
	var path = Array.isArray(f.path) ? f.path : p.parse(f.path);
	var cursor = row;
	path.forEach(function(segment){
		cursor = cursor(segment);
	});

	return r.expr(f.value).contains(cursor);
};

// add the `contains` operator
operators.contains = function(f, row) {
	var path = Array.isArray(f.path) ? f.path : p.parse(f.path);
	var cursor = row;
	path.forEach(function(segment){
		cursor = cursor(segment);
	});

	return cursor.contains(f.value);
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

function parseSorts(sort) {
	try {
		sort = JSON.parse(sort);
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
}

function parseFilters(filters) {

	try {
		filters = Array.isArray(filters) ? filters.map(function(f){ return JSON.parse(f); }) : JSON.parse(filters);
	} catch(e){ return []; }

	if(!Array.isArray(filters))
		filters = [filters];

	return filters.map(function(f){
		if(!operators[f.op]) return;
		
		try {
			return function(row){
				return operators[f.op](f, row);
			};
		} catch(e){ return; }
	})

	// remove empty functions
	.filter(function(i){return i;});
}


module.exports = {
	parseQuery: function(raw) {
		var parsed = {
			skip: 0,
			limit: 50
		};

		// search
		if(typeof raw.search === 'string') {
			parsed.search = raw.search;
		}

		// filter
		if(raw.filter) {
			var filter = parseFilters(raw.filter);
			if(filter.length) parsed.filter = filter;
		}

		// sort
		if(raw.sort) {
			var sort = parseSorts(raw.sort);
			if(sort.length) parsed.sort = sort;
		}

		// limit
		if(raw.per_page) {
			var perPage = parseInt(raw.per_page, 10);
			if(!isNaN(perPage)) parsed.limit = perPage;
		}

		// skip
		if(raw.page) {
			var page = parseInt(raw.page, 10);
			if(page) parsed.skip = (page - 1) * parsed.limit;
		}

		return parsed;
	},

	makePageHeaders: function(skip, limit, total, basePath, baseQuery) {
		var page = Math.ceil(skip / limit) + 1;

		var pages = {
			first: 1,
			last: Math.ceil(total / limit)
		};

		if(skip > 0)
			pages.prev = page - 1;

		if(skip < total - limit)
			pages.next = page + 1;


		// build each link
		var links = _.mapValues(pages, function(value){
			return basePath + '?' + qs.stringify(_.extend({},
				baseQuery,
				{
					page: value,
					per_page: limit
				}
			));
		});

		return {
			Pages: JSON.stringify(pages),
			Link: li.stringify(links)
		};
	},


	// includes should be in the format {assignments: true, stages: ['2d84ee0c-175b-4ec1-ab32-ae9dd854f5d8']}
	parseIncludes: function(raw, map) {
		if(!raw) return null;
		try {
			if(typeof raw === 'string') raw = JSON.parse(raw);
		} catch(e) {}

		if(typeof raw === 'string') raw = [raw];

		// must be an array
		if(!Array.isArray(raw)) return null;

		// filter out bad includes
		return _.uniq(raw.filter(function(i){
			return typeof i === 'string' && map[i];
		}));
	}
};
