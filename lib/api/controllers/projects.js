'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var async = require('async');

var controller = require('../controller.js');
var collections = ['assignments','invitations','contents'];

var _projects = require('./projects/_projects.js');

function prepare(o){
	if(_.isArray(o))
		return _.map(o, prepare);

	return _.omit(_.assign(o, {href: 'api/cycles/' + o.id}), collections);
}

function sanitize(o) {
	delete o.id;
	delete o.href;
	for (var i = collections.length - 1; i >= 0; i--) {
		delete o[collections[i]];
	}
}

module.exports = function(config, resources) {
	return _.extend(

		// Cycles Collection
		// -----------------

		{
			post: function(req, res, next) {
				if(!req.user) return next(401);

				// sanitize request
				sanitize(req.body);

				// validate request against schema
				var err = resources.validator.validate('http://www.gandhi.io/schema/project', req.body, {useDefault: true});
				if(err) return next({code: 400, message: err});

				// set timestamps
				req.body.created = req.body.updated = r.now();

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get the cycle
					r.table('cycles').get(req.body.cycle_id).do(function(cycle){

						// force defaults for non-admin users
						var insert = r.expr(req.body);
						if(!req.user.admin){
							var assignments = {}; assignments[req.user.id] = {
								id: req.user.id,
								role: cycle('defaults')('role')
							};
							insert = insert.merge({
								status: cycle('defaults')('status'),
								assignments: assignments
							});
						}

						return r.branch(cycle,
							r.table('projects').insert(insert, {returnChanges: true}),
							r.error('{"code": 400, "message": "No such cycle"}')
						)
					})
					.run(conn)
					.then(function(result){
						var project = prepare(result.changes[0].new_val);
						res.status(201).send(project)
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

				// get the projects from the DB
				var query = r.table('projects');

				// restrict to cycle
				if(req.params.cycle || req.query.cycle)
					query = query.filter({cycle_id: req.query.cycle});

				// filter
				if(req.query.filter)
					query = controller.filter(req, query);

				// search
				if(req.query.search && req.query.search !== '')
					query = query.filter(r.row('title').downcase().match(req.query.search.toLowerCase()));

				// restrict to user
				if(req.params.user || req.query.user || !req.user.admin)
					query = query.map(function(project){
						var userId = req.user.admin ? (req.params.user || req.query.user || req.user.id) : req.user.id;
						var cycle = r.table('cycles').get(project('cycle_id'));
						var role = _projects.getRole(userId, project, cycle);
						return r.branch(
							_projects.hasPermission(role, cycle('visible'), project),
							project.merge({role: role}),
							false
						);
					}).filter(function(project){ return project.ne(false); });

				// sort
				query = controller.sort(req, query);

				// don't include embedded collections
				query = query.without(collections);

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					var per_page = parseInt(req.query.per_page, 10) || 50;
					var page = parseInt(req.query.page, 10) || 1;

					// run the query
					r.expr({
						// get the total results count
						total: query.count(),
						// get the results for this page
						projects: query.skip(per_page * (page - 1)).limit(per_page).coerceTo('array')
					})
					.run(conn)
					.then(function(results){

						// set pagination headers
						controller.paginate(req, res, page, per_page, results.total);

						res.send(prepare(results.projects));
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
			get: function(req, res, next) {
				if(!req.user) return next(401);

				// get the project & cycle
				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get cycles from the DB
					r.table('projects')
					.get(req.params.project)
					.do(function(project){
						return r.branch(
							project,
							project.merge(function(project){
								var cycle = r.table('cycles').get(project('cycle_id'));
								var role = _projects.getRole(req.user.id, project, cycle);
								
								if(req.user.admin)
									return { role: role };
								
								return r.branch(
									_projects.hasPermission(role, cycle('visible'), project),
									{ role: role },
									r.error('{"code": 403, "message": "You are not permitted to view this project."}')
								)
							}),
							r.error('{"code": 404, "message": "Project not found"}')
						);
					})
					.run(conn)
					.then(function(project){
						if(!project) return next(404);
						res.send(prepare(project));
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
			patch: function(req, res, next) {
				if(!req.user) return next(401);
				if(!req.user.admin) return next(403, 'Only administrators may update a project directly.');

				// sanitize the input
				sanitize(req.body);

				// validate request against schema
				var err = resources.validator.validate('http://www.gandhi.io/schema/project', req.body, {checkRequired: false});
				if(err) return next({code: 400, message: err});

				// set timestamps
				delete req.body.created;
				req.body.updated = r.now();

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get project from the DB
					r.table('projects')
					.get(req.params.project)
					.update(req.body, {returnChanges: true})
					.run(conn)
					.then(function(result){
						if(!result.changes[0].old_val) return next(404);
						var project = result.changes[0].new_val;
						return res.send(prepare(project));
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
				if(!req.user.admin) return next(403, 'Only administrators may replace a project.');

				// sanitize the input
				sanitize(req.body);

				// validate request against schema
				var err = resources.validator.validate('http://www.gandhi.io/schema/project', req.body, {useDefault: true});
				if(err) return next({code: 400, message: err});

				// inject ID
				req.body.id = req.params.project;

				// set timestamps
				req.body.created = r.row('created').default(r.now());
				req.body.updated = r.now();

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get projects from the DB
					r.table('projects')
					.get(req.params.project)
					.replace(req.body, {returnChanges: true})
					.run(conn)
					.then(function(result){
						var project = result.changes[0].new_val;
						return res.send(prepare(project));
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
				if(!req.user.admin) return next(403, 'Only administrators may delete a project.');

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					r.table('projects')
					.get(req.params.project)
					.delete({returnChanges: true})
					.run(conn)
					.then(function(result){
						if(!result.changes[0].old_val) return next(404);
						var project = result.changes[0].old_val;
						return res.send(prepare(project));
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
			return require('./projects/' + c + '.js')(config, resources);
		}))
	);
}
