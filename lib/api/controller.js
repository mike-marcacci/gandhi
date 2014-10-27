var _ = require('lodash');
var r = require('rethinkdb');
var qs = require('qs');
var li = require('li');
var bedroll = require('bedroll')({});

module.exports = {
	sort: function(req, query) {
		var sort;
		try {
			sort = JSON.parse(req.query.sort);
		} catch(e){
			return query;
		}

		return query.orderBy(bedroll.sort(sort));
	},
	filter: function(req, query) {
		var filter;
		try {
			filter = JSON.parse(req.query.filter);
		} catch(e){
			return query;
		}

		return query.filter(bedroll.filter(filter));
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