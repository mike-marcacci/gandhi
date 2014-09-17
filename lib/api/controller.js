var _ = require('lodash');
var r = require('rethinkdb');
var op = require('objectpath');
var qs = require('qs');
var li = require('li');

var filters = ['gt', 'lt', 'gte', 'le', 'ge', 'eq', 'not', 'contains'];

module.exports = {
	sort: function(req, query) {
		if(typeof req.query.sort !== 'string')
			return query

		var pointer = r.row;
		op.parse(req.query.sort).forEach(function(key){
			pointer = pointer(key);
		});
		return req.query.direction === 'desc' ? query.orderBy(r.desc(pointer)) : query.orderBy(pointer);
	},
	filter: function(req, query) {
		if(!req.query.filter)
			return query;

		_.each(req.query.filter, function(expr, path) {

			// make sure a method is specified
			if(typeof expr !== 'object')
				return;

			_.each(expr, function(value, method){
				// ignore non-whitelisted methods
				if(filters.indexOf(method) === -1)
					return;

				// try to parse the value as json
				try { value = JSON.parse(value); } catch(e){}

				// apply the filter methods
				var pointer = r.row;
				op.parse(path).forEach(function(key){
					pointer = pointer(key);
				});

				// apply the filter
				query = query.filter(pointer[method](value));
			});
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
}