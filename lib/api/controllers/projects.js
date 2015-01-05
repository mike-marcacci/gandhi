'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

var controller = require('../controller.js');
var collections = ['assignments','invitations','contents'];

var projectModel = require('../models/projects.js');

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
				req.body.created = req.body.updated = r.now().toEpochTime();

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get the cycle
					r.table('cycles').get(req.body.cycle_id).do(function(cycle){

						// TODO: check for closed cycles

						// force defaults for non-admin users
						var project = r.expr(req.body);
						if(!req.user.admin){
							var assignments = {}; assignments[req.user.id] = {
								id: req.user.id,
								role: cycle('defaults')('role')
							};
							project = project.merge({
								status: cycle('defaults')('status'),
								assignments: assignments
							});
						}

						// build the project
						projectModel.build(r.table('users').get(req.user.id), project, cycle)

						// enforce access control
						.do(function(project){
							return r.branch(
								project('authorizations')('create').eq(false),
								r.error('{"code": 403, "message": "You are not permitted to create this project."}'),
								project
							);
						});

						return r.branch(cycle.not(),
							r.error('{"code": 400, "message": "No such cycle"}'),
							r.table('projects').insert(project, {returnChanges: true})
						);
					})
					('changes').nth(0)('new_val')

					// build the project
					.do(function(project){
						return projectModel.build(r.table('users').get(req.user.id), project);
					})

					// sanitize the project
					.do(function(project){
						return projectModel.sanitize(project);
					})

					.run(conn)
					.then(function(project){
						res.status(201).send(prepare(project));
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
			list: function(req, res, next) {
				if(!req.user) return next(401);

				// get the projects from the DB
				var query = r.table('projects');

				// restrict to cycle
				if(req.params.cycle || req.query.cycle)
					query = query.filter({cycle_id: req.params.cycle || req.query.cycle});

				// restrict to user
				if(req.params.user || req.query.user)
					query = query.filter(function(project){ return project('assignments').hasFields(req.params.user || req.query.user); });

				// search
				if(req.query.search && req.query.search !== '')
					query = query.filter(r.row('title').downcase().match(req.query.search.toLowerCase()));

				// build the projects
				query = query.map(function(project) {
					return projectModel.build(r.table('users').get(req.user.id), project);
				});

				// enforce access control
				query = query.filter(function(project) {
					return project('authorizations')('read').default(false);
				});

				// filter
				if(req.query.filter)
					query = controller.filter(req, query);

				// sort
				query = controller.sort(req, query);

				// sanitize the projects
				query = query.map(function(project) {
					return projectModel.sanitize(project);
				});

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
					});
				});
			},
			get: function(req, res, next) {
				if(!req.user) return next(401);

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get project
					r.table('projects')
					.get(req.params.project)
					.do(function(project){
						return r.branch(
							project.not(),
							r.error('{"code": 404, "message": "Project not found"}'),

							// build the project
							projectModel.build(r.table('users').get(req.user.id), project)

							// enforce access control
							.do(function(project){
								return r.branch(
									project('authorizations')('read').eq(false),
									r.error('{"code": 403, "message": "You are not permitted to view this project."}'),
									project
								);
							})

							// sanitize the project
							.do(function(project){
								return projectModel.sanitize(project);
							})
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
					});
				});
			},
			patch: function(req, res, next) {
				if(!req.user) return next(401);

				// sanitize the input
				sanitize(req.body);

				// validate request against schema
				var err = resources.validator.validate('http://www.gandhi.io/schema/project', req.body, {checkRequired: false});
				if(err) return next({code: 400, message: err});

				// set timestamps
				delete req.body.created;
				req.body.updated = r.now().toEpochTime();

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get project from the DB
					r.table('projects')
					.get(req.params.project)
					.do(function(project){
						return r.branch(
							project.not(),
							r.error('{"code": 404, "message": "Project not found"}'),

							// build the project
							projectModel.build(r.table('users').get(req.user.id), project)

							// enforce access control
							.do(function(project){
								return r.branch(
									project('authorizations')('update').eq(false),
									r.error('{"code": 403, "message": "You are not permitted to update this project."}'),
									r.table('projects').get(req.params.project).update(req.body, {returnChanges: true})
								);
							})

							// don't include embedded collections
							.without(collections)
						);
					})
					('changes').nth(0)('new_val')

					// build the project
					.do(function(project){
						return projectModel.build(r.table('users').get(req.user.id), project);
					})

					// sanitize the project
					.do(function(project){
						return projectModel.sanitize(project);
					})

					.run(conn)
					.then(function(project){
						return res.send(prepare(project));
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

			// TODO: now that the document is split into multiple endpoints, we need to figure out what a PUT should do
			put: function(req, res, next) {
				return next(405);
			},

			delete: function(req, res, next) {
				if(!req.user) return next(401);
				if(!req.user.admin) return next(403, 'Only administrators may delete a project.');

				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					r.table('projects')
					.get(req.params.project)
					.delete({returnChanges: true})
					('changes').nth(0)('old_val')

					// build the project
					.do(function(project){
						return r.branch(
							project,
							projectModel.build(r.table('users').get(req.user.id), project),
							project
						);
					})

					// sanitize the project
					.do(function(project){
						return projectModel.sanitize(project);
					})

					.run(conn)
					.then(function(project){
						if(!project) return next(404);
						return res.send(prepare(project));
					})
					.catch(function(err){
						try { err = JSON.parse(err.msg); } catch(e){}
						return next(err);
					})
					.finally(function(){
						resources.db.release(conn);
					});
				});
			}
		},

		// Cycle-Embedded Collections
		// --------------------------

		_.zipObject(collections, collections.map(function(c){
			return require('./projects/' + c + '.js')(config, resources);
		}))
	);
};
