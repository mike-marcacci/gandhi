'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

var controller = require('../controller.js');
var collections = ['statuses','roles','assignments','invitations','triggers','stages','exports'];

function prepare(o){
	if(_.isArray(o))
		return _.map(o, prepare);
	
	return _.omit(_.assign(o, {href: 'api/cycles/' + o.id}), collections);
}

function sanitize(o){
	delete o.id;
	delete o.href;
	for (var i = collections.length - 1; i >= 0; i--) {
		delete o[collections[i]];
	};
}

module.exports = function(config, resources) {
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

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// insert the cycle
					r.table('cycles')
					.insert(req.body, {returnChanges: true})
					.run(conn)
					.then(function(result){
						var cycle = result.changes[0].new_val;
						return res.status(201).send(prepare(cycle));
					})
					.catch(function(err){
						try { err = JSON.parse(err.msg); } catch(e){}
						return next(err);
					})
					.finally(function(){
						resources.db.release(conn);
					})
				});
			},

			list: function(req, res, next) {
				if(!req.user) return next(401);

				// get the cycles from the DB
				var query = r.table('cycles');

				// hide drafts fron non-admin users
				if(!req.user.admin)
					query = query.filter(r.row('status').eq('draft').not());

				// // only include open cycles
				// if(req.query.open && req.query.open !== 'false')
				// 	// only open cycles
				// 	query = query.filter(
				// 		r.row('open').eq(true).or(
				// 			r.row('open').ne(false)
				// 			.and(r.row('open').lt(r.now()))
				// 		)
				// 	)
				// 	// no closed cycles
				// 	.filter(
				// 		r.row('close').eq(false).or(
				// 			r.row('close').gt(r.now())
				// 		)
				// 	);

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
					})
					.run(conn)
					.then(function(results){							
						// set pagination headers
						controller.paginate(req, res, page, per_page, results.total);
						res.send(prepare(results.cycles));
					})
					.catch(function(err){
						return next(err);
					})
					.finally(function(){
						resources.db.release(conn);
					})
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
					r.table('cycles').get(id)
					.run(conn)
					.then(function(cycle){
						// hide draft cycles from non-admin users
						if(!cycle || (!req.user.admin && cycle.status === 'draft'))
							return next(404);

						return res.send(prepare(cycle));
					})
					.catch(function(err){
						return next(err);
					})
					.finally(function(){
						resources.db.release(conn);
					})
				});
			},

			patch: function(req, res, next) {
				if(!req.user) return next(401);
				if(!req.user.admin) return next(403, 'Only administrators may update a cycle.');

				// sanitize the input
				sanitize(req.body);

				// validate request against schema
				var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', req.body, {checkRequired: false});
				if(err) return next({code: 400, message: err});

				// set timestamps
				delete req.body.created;
				req.body.updated = r.now();

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get cycles from the DB
					r.table('cycles')
					.get(req.params.cycle)
					.update(req.body, {returnChanges: true})
					.run(conn)
					.then(function(result){
						if(!result.changes[0].old_val) return next(404);
						var cycle = result.changes[0].new_val;
						return res.send(prepare(cycle));
					})
					.catch(function(err){
						return next(err);
					})
					.finally(function(){
						resources.db.release(conn);
					})
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

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get cycles from the DB
					r.table('cycles')
					.get(req.params.cycle)
					.replace(req.body, {returnChanges: true})
					.run(conn)
					.then(function(result){
						if(!result.changes[0].new_val) return next(404);
						var cycle = result.changes[0].new_val;
						return res.send(prepare(cycle));
					})
					.catch(function(err){
						return next(err);
					})
					.finally(function(){
						resources.db.release(conn);
					})
				});
			},

			delete: function(req, res, next) {
				if(!req.user) return next(401);
				if(!req.user.admin) return next(403, 'Only administrators may delete a cycle.');

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);
					
					// ensure that no projects depend on this cycle
					return r.branch(
						r.table('projects')
							.filter({cycle_id: req.params.cycle})
							.limit(1)
							.count()
							.eq(0),
						r.table('cycles')
							.get(req.params.cycle)
							.delete({returnChanges: true}),
						false
					)
					.run(conn)
					.then(function(result){
						if(result === false) return next(400, 'The cycle cannot be destroyed because projects depend on it.');
						if(!result.changes[0].old_val) return next(404);

						var cycle = result.changes[0].old_val;
						return res.send(prepare(cycle));
					})
					.catch(function(err){
						return next(err);
					})
					.finally(function(){
						resources.db.release(conn);
					})
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
