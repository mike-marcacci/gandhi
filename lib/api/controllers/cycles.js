'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

var controller = require('../controller.js');

function prepare(o){
	if(_.isArray(o))
		return _.map(o, prepare);

	// TODO: show/hide assignments based on role

	return _.assign(o, {href: 'api/cycles/' + o.id});
}

function sanitize(o){
	delete o.href;
	delete o.id;
}

module.exports = function(config, resources) {
	var collections = ['statuses','roles','assignments','invitations','events','stages','exports'];
	return _.extend(

		// Cycles Collection
		// -----------------

		{
			post: function(req, res, next) {
				if(!req.user) return next(401);
				if(!req.user.admin) return next(403);

				// sanitize the input
				sanitize(req.body);

				// validate request against schema
				var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', req.body, {useDefault: true});
				if(err) return next({code: 400, message: err});

				// set timestamps
				req.body.created = req.body.updated = r.now();

				// transform dates
				if(typeof req.body.open === 'string')
					req.body.open = new Date(req.body.open);

				if(typeof req.body.close === 'string')
					req.body.close = new Date(req.body.close);

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// insert the cycle
					r.table('cycles').insert(req.body, {returnChanges: true}).run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);

						var cycle = result.changes[0].new_val;

						return res.status(201).send(cycle);
					});
				});
			},

			list: function(req, res, next) {
				if(!req.user) return next(401);

				// get the cycles from the DB
				var query = r.table('cycles');

				// hide drafts fron non-admin users
				if(!req.user.admin)
					query = query.filter(r.row('status').eq('draft').not());

				// only include open cycles
				if(req.query.open && req.query.open !== 'false')
					// only open cycles
					query = query.filter(
						r.row('open').eq(true).or(
							r.row('open').ne(false)
							.and(r.row('open').lt(r.now()))
						)
					)
					// no closed cycles
					.filter(
						r.row('close').eq(false).or(
							r.row('close').gt(r.now())
						)
					);

				// filter
				query = controller.filter(req, query);

				// search
				if(req.query.search && req.query.search !== '')
					query = query.filter(r.row('title').downcase().match(req.query.search.toLowerCase()));

				// sort
				query = controller.sort(req, query);

				// don't include embedded collections
				query = query.without(collections);

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					var per_page = parseInt(req.query.per_page, 10) || 50;
					var page = parseInt(req.query.page, 10) || 1;

					r.expr({
						// get the total results count
						total: query.count(),
						// get the results for this page
						cycles: query.skip(per_page * (page - 1)).limit(per_page).coerceTo('array')
					}).run(conn, function(err, results){
						resources.db.release(conn);
						if(err) return next(err);

						var cycles = results.cycles;
						
						// set pagination headers
						controller.paginate(req, res, page, per_page, results.total);

						res.send(prepare(cycles));
					});
				});
			},

			get: function(req, res, next) {
				if(!req.user) return next(401);

				var id;

				if(req.params.cycle) // get by ID
					id = req.params.cycle;
				else if(req.params.project) // get by project
					id = r.table('projects').get(req.params.project)('cycle_id').default(false);
				else
					return next(400);

				return resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get cycles from the DB
					r.table('cycles').get(id).run(conn, function(err, cycle){
						resources.db.release(conn);
						if(err) return next(err);

						// hide draft cycles from non-admin users
						if(!cycle || (!req.user.admin && cycle.status === 'draft'))
							return next(404);

						return res.send(prepare(cycle));
					});
				});
			},

			patch: function(req, res, next) {
				if(!req.user) return next(401);

				if(!req.user.admin)
					return next(403, 'Only administrators may update a cycle.');

				// sanitize the input
				sanitize(req.body);

				// validate request against schema
				var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', req.body, {checkRequired: false});
				if(err) return next({code: 400, message: err});

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
					if(err) return next(err);

					// get cycles from the DB
					r.table('cycles').get(req.params.cycle).replace(r.row.without(without).merge(req.body), {returnChanges: true}).run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);

						var cycle = result.changes[0].new_val;
						return res.send(prepare(cycle));
					});
				});
			},

			put: function(req, res, next) {
				if(!req.user) return next(401);
				if(!req.user.admin) return next(403, 'Only administrators may replace a cycle.');

				// sanitize the input
				sanitize(req.body);

				// validate request against schema
				var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', req.body, {useDefault: true});
				if(err) return next({code: 400, message: err});

				// inject ID
				req.body.id = req.params.cycle;

				// set timestamps
				req.body.created = r.row('created').default(r.now());
				req.body.updated = r.now();

				// transform dates
				if(typeof req.body.open === 'string')
					req.body.open = new Date(req.body.open);

				if(typeof req.body.close === 'string')
					req.body.close = new Date(req.body.close);

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get cycles from the DB
					r.table('cycles').get(req.params.cycle).replace(req.body, {returnChanges: true}).run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);

						var cycle = result.changes[0].new_val;
						return res.send(prepare(cycle));
					});
				});
			},

			delete: function(req, res, next) {
				if(!req.user) return next(401);
				if(!req.user.admin) return next(403, 'Only administrators may delete a cycle.');

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);
					
					// ensure that no projects depend on this cycle
					return r.branch(r.table('projects').filter({cycle_id: req.params.cycle}).limit(1).count().eq(0),
						r.table('cycles').get(req.params.cycle).delete({returnChanges: true}),
						null
					).run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);

						if(result === null)
							return next(400, 'The cycle cannot be destroyed because projects depend on it.');

						var cycle = result.changes[0].old_val;
						return res.send(prepare(cycle));
					});
				});
			}
		
		},

		// Cycle-Embedded Collections
		// --------------------------

		_.zipObject(collections, collections.map(function(c){
			return require('./cycles/' + c + '.js')(config, resources);
		}))
	);
}
