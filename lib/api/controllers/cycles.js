'use strict';

var url = require('url');
var qs = require('qs');
var li = require('li');
var _ = require('lodash');
var r = require('rethinkdb');
var op = require('objectpath');

function sanitize(o){
	if(_.isArray(o))
		return _.map(o, sanitize);

	return _.assign(o, {href: '/api/cycles/' + o.id});
}

module.exports = function(config, resources) {
	return {
		create: function(req, res) {
			if(!req.user)
				return res.error(401);

			// only admin can create a cycle
			if(!req.user.admin)
				return res.error(403);

			// validate request against schema
			var err = resources.validator.validate('cycle', req.body, {useDefault: true});
			if(err)
				return res.error({code: 400, message: err});

			// set timestamps
			req.body.created = req.body.updated = r.now();

			// transform dates
			if(typeof req.body.open === 'string')
				req.body.open = new Date(req.body.open);

			if(typeof req.body.close === 'string')
				req.body.close = new Date(req.body.close);

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// insert the cycle
				r.table('cycles').insert(req.body, {returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var cycle = result.new_val;

					return res.status(201).send(cycle);
				});
			});
		},
		list: function(req, res) {
			if(!req.user)
				return res.error(401);

			// get the cycles from the DB
			var query = r.table('cycles');

			// hide drafts fron non-admin users
			if(!req.user.admin)
				query = query.filter(r.row('status').eq('draft').not());

			// only include open cycles
			if(req.query.open && req.query.open !== 'false')
				query = query.filter(r.row('open').eq(true).or(r.row('open').ne(false).and(r.row('open').lt(r.now()))).and(r.row('close').eq(false).or(r.row('open').gt(r.now()))));

			// filter
			if(req.query.filter)
				query = query.filter(_.transform(req.query.filter, function(base, value, path) {
					try { value = JSON.parse(value); } catch(e){}
					var o = op.parse(path), l = o.length - 1, cursor = base;
					for (var i in o) {
						cursor = cursor[o[i]] = i < l ? {} : value;
					}
					return base;
				}));

			// search
			if(req.query.search && req.query.search !== '')
				query = query.filter(r.row('title').downcase().match(req.query.search.toLowerCase()));

			// sort
			if(typeof req.query.sort === 'string') {
				var pointer = r.row;
				op.parse(req.query.sort).forEach(function(key){
					pointer = pointer(key);
				});
				query = req.query.direction === 'desc' ? query.orderBy(r.desc(pointer)) : query.orderBy(pointer);
			}

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				var per_page = parseInt(req.query.per_page, 10) || 50;
				var page = parseInt(req.query.page, 10) || 1;

				r.expr({
					// get the total results count
					total: query.count(),
					// get the results for this page
					cycles: query.skip(per_page * (page - 1)).limit(per_page).coerceTo('array')
				}).run(conn, function(err, results){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var cycles = results.cycles;
					var pages = {
						first: 1,
						last: Math.ceil(results.total / per_page)
					};

					if(page > 1)
						pages.prev = page - 1;

					if(page < pages.last)
						pages.next = page + 1;

					res.set('Pages', JSON.stringify(pages));
					res.set('Link', li.stringify(_.mapValues(pages, function(value){
						return req.path + '?' + qs.stringify(_.extend({}, req.query, {page: value, per_page: per_page}));
					})));
					res.send(sanitize(cycles));
				});
			});
		},
		show: function(req, res) {
			if(!req.user)
				return res.error(401);

			var id;

			if(req.params.cycle) // get by ID
				id = req.params.cycle;
			else if(req.params.project) // get by project
				id = r.table('projects').get(req.params.project)('cycle_id');
			else
				return res.error(400);

			return resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get cycles from the DB
				r.table('cycles').get(id).run(conn, function(err, cycle){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					// hide draft cycles from non-admin users
					if(!cycle || (!req.user.admin && cycle.status === 'draft'))
						return res.error(404);

					return res.send(sanitize(cycle));
				});
			});
		},
		update: function(req, res) {
			if(!req.user)
				return res.error(401);

			if(!req.user.admin)
				return res.error(403, 'Only administrators may update a cycle.');

			// validate request against schema
			var err = resources.validator.validate('cycle', req.body, {checkRequired: false});
			if(err)
				return res.error({code: 400, message: err});

			// set timestamps
			delete req.body.created;
			req.body.updated = r.now();

			// transform dates
			if(typeof req.body.open === 'string')
				req.body.open = new Date(req.body.open);

			if(typeof req.body.close === 'string')
				req.body.close = new Date(req.body.close);
			
			// remove indexed objects with null values
			var without = {};
			_.each(['events', 'flow', 'roles', 'statuses', 'users'], function(index){
				_.each(req.body[index], function(value, id){
					if(value !== null)
						return;

					without[index] = without[index] || {};
					without[index][id] = true;
					delete req.body[index][id];
				});
			});

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get cycles from the DB
				r.table('cycles').get(req.params.cycle).replace(r.row.without(without).merge(req.body), {returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var cycle = result.new_val;

					return res.send(sanitize(cycle));
				});
			});
		},
		replace: function(req, res) {
			if(!req.user)
				return res.error(401);

			if(!req.user.admin)
				return res.error(403, 'Only administrators may replace a cycle.');

			// validate request against schema
			var err = resources.validator.validate('cycle', req.body, {useDefault: true});
			if(err)
				return res.error({code: 400, message: err});

			// set timestamps
			req.body.created = r.row('created');
			req.body.updated = r.now();

			// transform dates
			if(typeof req.body.open === 'string')
				req.body.open = new Date(req.body.open);

			if(typeof req.body.close === 'string')
				req.body.close = new Date(req.body.close);

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get cycles from the DB
				r.table('cycles').get(req.params.cycle).replace(req.body, {returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var cycle = result.new_val;

					return res.send(sanitize(cycle));
				});
			});
		},
		destroy: function(req, res) {
			if(!req.user)
				return res.error(401);

			if(!req.user.admin)
				return res.error(403, 'Only administrators may delete a cycle.');

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);
				
				return r.branch(r.table('projects').filter({cycle_id: req.params.cycle}).limit(1).count().eq(0),
					r.table('cycles').get(req.params.cycle).delete({returnVals: true}),
					null
				).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					if(result === null)
						return res.error(400, 'The cycle cannot be destroyed because projects depend on it.');

					var cycle = result.old_val;

					return res.send(sanitize(cycle));
				});
			});
		}
	};
}
