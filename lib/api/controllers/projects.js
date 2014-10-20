'use strict';

var url = require('url');
var _ = require('lodash');
var r = require('rethinkdb');
var async = require('async');
var crypto = require('crypto');

var controller = require('../controller.js');
var collections = ['assignments','invitations','contents'];

module.exports = function(config, resources) {

	function prepare(o){
		if(_.isArray(o))
			return _.map(o, prepare);

		// TODO: show/hide assignments based on role

		return _.omit(_.assign(o, {href: 'api/cycles/' + o.id}), collections);
	}

	// remove any calculated fields from a request
	function sanitize(o) {
		delete o.id;
		delete o.href;
		for (var i = collections.length - 1; i >= 0; i--) {
			delete o[collections[i]];
		}
	}

	// // returns the role definition for a user
	// function getRole(user, project, cycle) {
	// 	if(project.users[user.id] && project.users[user.id].role && cycle.roles[project.users[user.id].role])
	// 		return cycle.roles[project.users[user.id].role];

	// 	if(cycle.users[user.id] && cycle.users[user.id].role && cycle.roles[cycle.users[user.id].role])
	// 		return cycle.roles[cycle.users[user.id].role];

	// 	return null;
	// }

	// // returns a query for updating/creating a project with events
	// function buildEvents(project, cycle) {
	// 	project.events = project.events || {};
	// 	var events = {};

	// 	_.each(cycle.events, function(event, id){
	// 		var value = event.conditions.some(function(conditions){
	// 			return conditions.every(function(condition){
	// 				var tester = resources.testers[condition.name]

	// 				if(!tester)
	// 					return false;

	// 				return tester(condition.options, project);
	// 			});
	// 		});

	// 		// nothing's changed
	// 		if(project.events[id] && project.events[id][0] && project.events[id][0].value === value)
	// 			return;

	// 		// TODO: process listeners

	// 		// prepend the event to its list
	// 		events[id] = r.row('events')(id).default([]).prepend({
	// 			value: value,
	// 			date: r.now()
	// 		});
	// 	});

	// 	return events;
	// }

	// // return Boolean based on permissions criteria
	// function calculatePermission(project, criteria){
	// 	if(typeof criteria === 'boolean')
	// 		return criteria;

	// 	// nothing to calculate
	// 	if(!criteria || criteria.open === false || criteria.close === true)
	// 		return false;

	// 	// close based on events (and return)
	// 	if(criteria.close !== false) if(criteria.close.some(function(event){
	// 		return (project.events[event] && project.events[event][0] && project.events[event][0].value)
	// 	})) return false;

	// 	// open based on events
	// 	return (criteria.open === true || criteria.open.some(function(event){
	// 		return (project.events[event] && project.events[event][0] && project.events[event][0].value)
	// 	}))
	// }

	// // return map or Boolean calculated permissions
	// function buildPermissions(project, rules, role){
	// 	return _.mapValues(rules, function(rule){
	// 		if(!role)
	// 			return true;

	// 		return rule[role.id] ? calculatePermission(project, rule[role.id]) : false;
	// 	});
	// }

	// // builds a response given a user's roles
	// function buildResponse(role, project, cycle, callback) {

	// 	// process the events
	// 	var events = buildEvents(project, cycle);

	// 	// no events to update
	// 	if(!Object.keys(events).length)
	// 		return complete(project, callback);

	// 	// update the events
	// 	resources.db.acquire(function(err, conn) {
	// 		if(err) return callback(err);

	// 		r.table('projects').get(project.id).update({events: events}, {returnChanges: true}).run(conn, function(err, result){
	// 			resources.db.release(conn);

	// 			if(err) return callback(err);

	// 			var project = result.changes[0].new_val;
				
	// 			return complete(project, callback);
	// 		});
	// 	});

	// 	function complete(project, callback){
	// 		project.flow = project.flow || {};

	// 		// build roles
	// 		_.each(cycle.flow, function(stage, id){

	// 			// default to false
	// 			project.flow[id] = project.flow[id] || {id: id, data: {}, status: 'none'};
	// 			project.flow[id].visible = false;

	// 			// calculate visibility
	// 			project.flow[id].visible = role ? calculatePermission(project, stage.visible[role.id]) : true;

	// 			// build permissions
	// 			project.flow[id].permissions = buildPermissions(project, stage.component.permissions, role);

	// 		});

	// 		// TODO: apply role restrictions

	// 			// hide users

	// 			// hide flow stages

	// 			// hide invitations


	// 		// process components
	// 		var tasks = {};
	// 			// build the list of component processes to run
	// 			_.each(project.flow, function(stage, id){
	// 				if(!cycle.flow[id] || !resources.components[cycle.flow[id].component.name])
	// 					return;

	// 				if(!stage)
	// 					return;

	// 				tasks[id] = async.apply(
	// 					resources.components[cycle.flow[id].component.name].read,
	// 					id,
	// 					role,
	// 					project.flow[id].permissions,
	// 					project,
	// 					cycle
	// 				);
	// 			});

	// 		// run each component
	// 		return async.parallel(tasks, function(err, flow){
	// 			if(err) return next(err);

	// 			_.extend(project.flow, flow);

	// 			return callback(null, project);
	// 		});
	// 	}
	// }

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

				// restrict to user
				if(req.params.user || req.query.user || !req.user.admin)
					query = query.filter(function(project){
						return project('assignments').hasFields(req.user.admin ? (req.params.user || req.query.user) : req.user.id)
							.or(r.table('cycles').get(project('cycle_id'))('assignments').hasFields(req.user.admin ? (req.params.user || req.query.user) : req.user.id))
					})

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

						res.send(results.projects);
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
				if(!req.user)
					return next(401);

				// get the project & cycle
				resources.db.acquire(function(err, conn) {
					if(err) return next(err);

					// get cycles from the DB
					r.table('projects')
					.get(req.params.project)
					.do(function(project){
						return r.branch(
							project,
							{
								project: project,
								cycle: r.table('cycles').get(project('cycle_id'))
							},
							r.error('{"code": 404, "message": "Project not found"}')
						);
					})
					.run(conn)
					.then(function(result){
						var project = result.project;
						var cycle = result.cycle;

						if(!project || !cycle)
							return next(404);

						// restrict to admin and assigned users
						// var role = getRole(req.user, project, cycle);
						// if(!role && !req.user.admin)
						// 	return next(403);

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
