'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var qs = require('qs');
var li = require('li');

var controller = require('../controller.js');
var collections = ['statuses','roles','assignments','invitations','triggers','stages','exports'];

var cycleModel = require('../models/cycles.js');

function prepare(o){
	if(_.isArray(o))
		return _.map(o, prepare);

	return _.assign(o, {href: 'api/cycles/' + o.id});
}

function sanitize(o){
	delete o.id;
	delete o.href;
	delete o.role;
	delete o.open;
	for (var i = collections.length - 1; i >= 0; i--) {
		delete o[collections[i]];
	}
}

module.exports = function(config, resources) {
	return {
		post: function(req, res, next) {
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// sanitize the input
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', req.body, {useDefault: true});
			if(err) return next({code: 400, message: err});

			// set timestamps
			req.body.created = req.body.updated = r.now().toEpochTime();

			resources.db.acquire(function(err, conn) {
				if(err) return next(err);

				// insert the cycle
				r.table('cycles')
				.insert(req.body, {returnChanges: true})
				('changes').nth(0)('new_val')

				// build the cycle
				.do(function(cycle){
					return cycleModel.read(r.expr({id: req.user.id, admin: req.user.admin}), cycle);
				})

				// sanitize the cycle
				.do(function(cycle){
					return cycleModel.sanitize(cycle);
				})

				.run(conn)
				.then(function(cycle){
					return res.status(201).send(prepare(cycle));
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var per_page = parseInt(req.query.per_page, 10) || 50;
				var page = parseInt(req.query.page, 10) || 1;
				var query = {
					skip: (page - 1) * per_page,
					limit: per_page
				};

				// filter
				var filter = controller.filter(req.query.filter);
				if(filter.length) query.filter = filter;

				// search
				if(typeof req.query.search === 'string' && req.query.search.length)
					query.search = req.query.search

				// sort
				var sort = controller.sort(req.query.sort);
				if(sort.length) query.sort = sort;


				resources.collections.Cycle.query(
					conn,
					req.params.cycle,
					query,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycles){

					// Apply Pagination Headers
					var pages = {
						first: 1,
						last: Math.ceil(cycles.total / per_page)
					};

					if(page > 1) pages.prev = page - 1;
					if(page < pages.last) pages.next = page + 1;

					res.set('Pages', JSON.stringify(pages));
					res.set('Link', li.stringify(_.mapValues(pages, function(value){
						return req.path + '?' + qs.stringify(_.extend({}, req.query, {page: value, per_page: per_page}));
					})));

					// Send
					res.send(cycles);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next) {
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.get(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(trigger){
					res.send(trigger);
				})
				.catch(function(err){
					return next(err);
				});
			});

		},

		patch: function(req, res, next) {
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// sanitize the input
				sanitize(req.body);

				resources.collections.Cycle.update(
					conn,
					req.params.cycle,
					req.body,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycle){
					res.send(cycle);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		// TODO: now that the document is split into multiple endpoints, we need to figure out what a PUT should do
		put: function(req, res, next) {
			return next(405);
		},

		delete: function(req, res, next) {
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Cycle.delete(
					conn,
					req.params.cycle,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(cycle){
					res.send(cycle);
				})
				.catch(function(err){
					return next(err);
				});
			});
		}

	};
};
