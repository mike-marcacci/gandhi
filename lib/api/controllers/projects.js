'use strict';

var url = require('url');
var _ = require('lodash');
var r = require('rethinkdb');
var async = require('async');
var crypto = require('crypto');

var controller = require('../controller.js');

module.exports = function(config, resources) {

	// remove any calculated fields from a request
	function sanitize(o) {
		_.each(o.flow, function(stage){
			delete stage.visible;
			delete stage.permissions;
		})
		delete o.href;
		delete o.id;
	}

	// returns the role definition for a user
	function getRole(user, project, cycle) {
		if(project.users[user.id] && project.users[user.id].role && cycle.roles[project.users[user.id].role])
			return cycle.roles[project.users[user.id].role];

		if(cycle.users[user.id] && cycle.users[user.id].role && cycle.roles[cycle.users[user.id].role])
			return cycle.roles[cycle.users[user.id].role];

		return null;
	}

	// returns a query for updating/creating a project with events
	function buildEvents(project, cycle) {
		project.events = project.events || {};
		var events = {};

		_.each(cycle.events, function(event, id){
			var value = event.conditions.some(function(conditions){
				return conditions.every(function(condition){
					var tester = resources.testers[condition.name]

					if(!tester)
						return false;

					return tester(condition.options, project);
				});
			});

			// nothing's changed
			if(project.events[id] && project.events[id][0] && project.events[id][0].value === value)
				return;

			// TODO: process listeners

			// prepend the event to an existing list
			if(project.events[id])
				return events[id] = r.row('events')(id).prepend({
					value: value,
					date: r.now()
				});

			// add the first event
			events[id] = [{
				value: value,
				date: r.now()
			}];
		});

		return events;
	}

	// return Boolean based on permissions criteria
	function calculatePermission(project, criteria){
		if(typeof criteria === 'boolean')
			return criteria;

		// nothing to calculate
		if(!criteria || criteria.open === false || criteria.close === true)
			return false;

		// close based on events (and return)
		if(criteria.close !== false) if(criteria.close.some(function(event){
			return (project.events[event] && project.events[event][0] && project.events[event][0].value)
		})) return true;

		// open based on events
		return (criteria.open === true || criteria.open.some(function(event){
			return (project.events[event] && project.events[event][0] && project.events[event][0].value)
		}))
	}

	// return map or Boolean calculated permissions
	function buildPermissions(project, rules, role){
		return _.mapValues(rules, function(rule){
			return rule[role] ? calculatePermission(project, rule[role]) : false;
		});
	}

	// builds a response given a user's roles
	function buildResponse(role, project, cycle, callback) {

		// process the events
		var events = buildEvents(project, cycle);

		// no events to update
		if(!Object.keys(events).length)
			return complete(project, callback);

		// update the events
		resources.db.acquire(function(err, conn) {
			if(err)
				return callback(err);

			r.table('projects').get(project.id).update({events: events}, {returnChanges: true}).run(conn, function(err, result){
				resources.db.release(conn);

				if(err)
					return callback(err);

				var project = result.changes[0].new_val;
				
				return complete(project, callback);
			});
		});

		function complete(project, callback){
			project.flow = project.flow || {};

			// build roles
			_.each(cycle.flow, function(stage, id){

				// default to false
				project.flow[id] = project.flow[id] || {id: id, data: {}, status: 'none'};
				project.flow[id].visible = false;

				// calculate visibility
				project.flow[id].visible = role ? calculatePermission(project, stage.visible[role.id]) : true;

				// build permissions
				project.flow[id].permissions = role ? buildPermissions(project, stage.component.permissions, role.id) : {};

			});

			// TODO: apply role restrictions

				// hide users

				// hide flow stages

				// hide invitations


			// process components
			var tasks = {};
				// build the list of component processes to run
				_.each(project.flow, function(data, id){
					if(!cycle.flow[id] || !resources.components[cycle.flow[id].component.name])
						return;

					if(!data || !data.data)
						return;

					tasks[id] = async.apply(
						resources.components[cycle.flow[id].component.name].read,
						id,
						role,
						buildPermissions(project, cycle.flow[id].component.permissions, role),
						project,
						cycle
					);
				});

			// run each component
			return async.parallel(tasks, function(err, results){
				if(err)
					return next(err);

				_.each(results, function(data, id){
					project.flow[id].data = data;
				});


				return callback(null, project);
			});
		}
	}

	return {
		create: function(req, res, next) {
			if(!req.user)
				return next(401);

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('project', req.body, {useDefault: true});
			if(err)
				return next({code: 400, message: err});

			// set timestamps
			req.body.created = req.body.updated = r.now();

			// transform dates
			if(typeof req.body.open === 'string')
				req.body.open = new Date(req.body.open);

			if(typeof req.body.close === 'string')
				req.body.close = new Date(req.body.close);

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				r.table('cycles').get(req.body.cycle_id).run(conn, function(err, cycle){
					if(err){
						resources.db.release(conn);
						return next(err);
					}

					if(!cycle){
						resources.db.release(conn);
						return next(400, 'No such cycle.');
					}

					// restrictions for non-admin users
					if(!req.user.admin){

						// TODO: verify that cycle is open

						// add current user with default role
						req.body.users[req.user.id] = {
							id: req.user.id,
							role: cycle.defaults.role
						}

						// TODO: verify that any other users are of allowable roles

						// TODO: verify that any invitations are of allowable roles

						// apply default status
						req.body.status = cycle.defaults.status;
					}

					// process the events
					req.body.events = buildEvents(req.body, cycle)

					// insert the project
					r.table('projects').insert(req.body, {returnChanges: true}).run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return next(err);

						var project = result.changes[0].new_val;

						return buildResponse(getRole(req.user, project, cycle), project, cycle, function(err, project){
							if(err) return next(err);
							res.status(201).send(project);
						});
					});
				});
			});
		},
		list: function(req, res, next) {
			if(!req.user)
				return next(401);

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				var query = r.table('projects');
				var per_page = parseInt(req.query.per_page, 10) || 50;
				var page = parseInt(req.query.page, 10) || 1;

				// restrict to user
				// TODO: make sure to only return users visible to the current user
				if(req.params.user)
					return r.table('cycles').hasFields({users: req.params.user})('id').run(conn, function(err, cursor){
						cursor.toArray(function(err, cycleIds){
							query = query.filter(r.expr(cycleIds).contains(r.row('cycle_id')).or(r.row('users').hasFields(req.params.user)));
							next();
						});
					});

				// all projects
				return next();

				function next(){

					// filter
					query = controller.filter(req, query);

					// search
					if(req.query.search && req.query.search !== '')
						query = query.filter(r.row('title').downcase().match(req.query.search.toLowerCase()));

					// sort
					query = controller.sort(req, query);

					r.expr({
						// get the total results count
						total: query.count(),
						// get the results for this page
						projects: query.skip(per_page * (page - 1)).limit(per_page).coerceTo('array')
					}).run(conn, function(err, results){
						resources.db.release(conn);

						if(err)
							return next(err);

						var projects = results.projects;

						// set pagination headers
						controller.paginate(req, res, page, per_page, results.total);

						res.send(projects);
					});
				}
			});
		},
		show: function(req, res, next) {
			if(!req.user)
				return next(401);

			// get the project & cycle
			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// get cycles from the DB
				var query = r.table('projects').get(req.params.project);
				r.expr({
					project: query,
					cycle: r.branch(query, r.table('cycles').get(query('cycle_id')), null)
				}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return next(err);

					var project = result.project;
					var cycle = result.cycle;

					if(!project || !cycle)
						return next(404);

					// restrict to admin and assigned users
					var role = getRole(req.user, project, cycle);
					if(!role && !req.user.admin)
						return next(403);

					return buildResponse(role, project, cycle, function(err, project){
						if(err) return next(err);
						res.send(project);
					});
				});
			});

		},
		update: function(req, res, next) {
			if(!req.user)
				return next(401);

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('project', req.body, {checkRequired: false});
			if(err)
				return next({code: 400, message: err});

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				var query = r.table('projects').get(req.params.project);
				r.expr({
					project: query,
					cycle: r.branch(query, r.table('cycles').get(query('cycle_id')), null)
				}).run(conn, function(err, result){
					if(err){
						resources.db.release(conn);
						return next(err);
					}

					var project = result.project;
					var cycle = result.cycle;

					if(!project || !cycle)
						return next(404);

					// add a user based on an invitation
					var role;
					if(req.body.users && req.body.users[req.user.id] && req.body.users[req.user.id].invitation_id){
						var invitation = project.invitations[req.body.users[req.user.id].invitation_id];

						// make sure invitation exists
						if(!invitation){
							resources.db.release(conn);
							return next({code: 400, message: 'The invitation specified does not exist'});
						}

						// set the user's role
						role = req.body.users[req.user.id].role = invitation.role;

						// remove the invitation
						req.body.invitations = req.body.invitations || {};
						req.body.invitations[req.body.users[req.user.id].invitation_id] = null;
					}

					// normalize users
					_.each(req.body.users, function(user){
						if(user != null)
							user.role = user.role || cycle.defaults.role;
					});

					// restrict to admin and assigned users
					role = role || getRole(req.user, project, cycle);
					if(!role && !req.user.admin){
						resources.db.release(conn);
						return next(403);
					}

					// restrictions for non-admin users
					if(!req.user.admin){

						// TODO: verify that any other users are of allowable roles and not already assigned

						// TODO: verify that any invitations are of allowable roles and users are not already assigned

						// cannot set status directly
						delete req.status;

					}

					// set timestamps
					delete req.body.created;
					req.body.updated = r.now();

					// remove indexed objects with null values
					var without = {};
					_.each(['users','invitations'], function(index){
						_.each(req.body[index], function(value, id){
							if(value !== null)
								return;

							without[index] = without[index] || {};
							without[index][id] = true;
							delete req.body[index][id];
						});
					});

					// don't update the flow yet
					var flow = req.body.flow;
					delete req.body.flow

					// update the record
					r.table('projects').get(req.params.project).replace(r.row.without(without).merge(req.body), {returnChanges: true}).run(conn, function(err, result){
						if(err){
							resources.db.release(conn);
							return next(err);
						}

						var project = result.changes[0].new_val;

						// if we aren't processing a component, skip updateFlow
						if(!flow)
							return buildResponse(role, project, cycle, function(err, project){
								if(err) return next(err);
								res.send(project);
							});

						// update the flow first
						return updateFlow(project);

						function updateFlow(project){
							var tasks = {};
							// build the list of component processes to run
							_.each(flow, function(data, id){
								if(!resources.components[cycle.flow[id].component.name])
									return;

								if(!data || !data.data)
									return;

								tasks[id] = async.apply(
									resources.components[cycle.flow[id].component.name].update,
									data.data,
									id,
									role,
									buildPermissions(project, cycle.flow[id].component.permissions, role),
									project,
									cycle
								);
							});

							// run each component
							async.parallel(tasks, function(err, results){
								if(err){
									resources.db.release(conn);
									return next(err);
								}

								var flow = _.mapValues(results, function(d){ return {data: d} });

								return r.table('projects').get(req.params.project).update({flow: flow}, {returnChanges: true}).run(conn, function(err, result){
									if(err){
										resources.db.release(conn);
										return next(err);
									}

									var project = result.changes[0].new_val;

									return buildResponse(role, project, cycle, function(err, project){
										if(err) return next(err);
										res.send(project);
									});
								});
							});
						};
					});
				});
			});
		},
		replace: function(req, res, next) {
			if(!req.user)
				return next(401);

			if(!req.user.admin)
				return next(403, 'Only administrators may replace a project.');

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('project', req.body, {useDefault: true});
			if(err)
				return next({code: 400, message: err});

			// inject ID
			req.body.id = req.params.project;

			// normalize users
			_.each(req.body.users, function(user){
				if(user != null)
					user.role = user.role || cycle.defaults.role;
			});

			// set timestamps
			req.body.created = r.row('created').default(r.now());
			req.body.updated = r.now();

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				r.table('cycles').get(req.body.cycle_id).run(conn, function(err, cycle){
					if(err){
						resources.db.release(conn);
						return next(err);
					}

					if(!cycle){
						resources.db.release(conn);
						return next(400, 'No such cycle.');
					}

					// replace the record in the db
					r.table('projects').get(req.params.project).replace(req.body, {returnChanges: true}).run(conn, function(err, result){
						if(err){
							resources.db.release(conn);
							return next(err);
						}

						var project = result.changes[0].new_val;
						var role = getRole(req.user, project, cycle);

						// process the events
						var events = buildEvents(project, cycle);

						// no events to update
						if(!Object.keys(events).length){
							resources.db.release(conn);
							return buildResponse(role, project, cycle, function(err, project){
								if(err) return next(err);
								res.send(project);
							});
						}

						// update the events
						r.table('projects').get(req.params.project).update({events: events}, {returnChanges: true}).run(conn, function(err, result){
							resources.db.release(conn);

							if(err)
								return next(err);

							var project = result.changes[0].new_val;
							
							return buildResponse(role, project, cycle, function(err, project){
								if(err) return next(err);
								res.send(project);
							});
						});
					});
				});
			});
		},
		destroy: function(req, res, next) {
			if(!req.user)
				return next(401);

			if(!req.user.admin)
				return next(403, 'Only administrators may delete a project.');

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				return r.table('projects').get(req.params.project).delete({returnChanges: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return next(err);

					var project = result.old_val;

					return res.send(project);
				});
			});
		}
	};
}
