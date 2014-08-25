'use strict';

var url = require('url');
var qs = require('qs');
var li = require('li');
var _ = require('lodash');
var r = require('rethinkdb');
var op = require('objectpath');

module.exports = function(config, resources) {

	function sanitize(data) {
		// strip locks
		_.each(data.flow, function(stage){ delete stage.lock; })
	}

	function getRole(user, project, cycle) {
		if(project.users[user.id] && project.users[user.id].role && cycle.roles[project.users[user.id].role])
			return cycle.roles[project.users[user.id].role];

		if(cycle.users[user.id] && cycle.users[user.id].role && cycle.roles[cycle.users[user.id].role])
			return cycle.roles[cycle.users[user.id].role];

		return null;
	}

	function buildEvents(project, cycle) {
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

	function applyLocks(project, cycle) {
		var locks = {};
		_.each(cycle.flow, function(stage, id){

			// open
			if(stage.lock.open.some(function(event){
				if(!project.events[event] || !project.events[event][0] || !project.events[event][0].value)
					return locks[id] = cycle.events[event] ? cycle.events[event].messages[0] : 'The event "'+event+'" has not yet opened this stage.';
			})) return;

			// close
			if(stage.lock.close.some(function(event){
				if(project.events[event] && project.events[event][0] && project.events[event][0].value)
					return locks[id] = cycle.events[event] ? cycle.events[event].messages[1] : 'The event "'+event+'" has closed this stage.';
			})) return;

			locks[id] = null;
		});

		return locks;
	}

	function Project(role, project, cycle) {

		// process locks
		_.each(applyLocks(project, cycle), function(lock, id) {
			project.flow[id] = project.flow[id] || {id: id, data: {}, status: 'none'};
			project.flow[id].lock = lock;
		});

		// TODO: apply role

			// hide users

			// hide flow stages

		return project;
	}

	return {
		create: function(req, res) {
			if(!req.user)
				return res.error(401);

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('project', req.body, {useDefault: true});
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

				r.table('cycles').get(req.body.cycle_id).run(conn, function(err, cycle){
					if(err){
						resources.db.release(conn);
						return res.error(err);
					}

					if(!cycle){
						resources.db.release(conn);
						return res.error(400, 'No such cycle.');
					}

					// process the events
					req.body.events = buildEvents(req.body, cycle)

					// insert the project
					r.table('projects').insert(req.body, {returnVals: true}).run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						var project = result.new_val;

						return res.status(201).send(project);
					});
				});
			});
		},
		list: function(req, res) {
			if(!req.user)
				return res.error(401);

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

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

					r.expr({
						// get the total results count
						total: query.count(),
						// get the results for this page
						projects: query.skip(per_page * (page - 1)).limit(per_page).coerceTo('array')
					}).run(conn, function(err, results){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						var projects = results.projects;
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
						res.send(projects);
					});
				}
			});
		},
		show: function(req, res) {
			if(!req.user)
				return res.error(401);

			// get the project & cycle
			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get cycles from the DB
				var query = r.table('projects').get(req.params.project);
				r.expr({
					project: query,
					cycle: r.branch(query, r.table('cycles').get(query('cycle_id')), null)
				}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var project = result.project;
					var cycle = result.cycle;

					if(!project || !cycle)
						return res.error(404);

					// restrict to admin and assigned users
					var role = getRole(req.user, project, cycle);
					if(!role && !req.user.admin)
						return res.error(403);

					return res.send(Project(role, project, cycle));
				});
			});

		},
		update: function(req, res) {
			if(!req.user)
				return res.error(401);

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('project', req.body, {checkRequired: false});
			if(err)
				return res.error({code: 400, message: err});

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				var query = r.table('projects').get(req.params.project);
				r.expr({
					project: query,
					cycle: r.branch(query, r.table('cycles').get(query('cycle_id')), null)
				}).run(conn, function(err, result){
					if(err){
						resources.db.release(conn);
						return res.error(err);
					}

					var project = result.project;
					var cycle = result.cycle;

					if(!project || !cycle)
						return res.error(404);

					// restrict to admin and assigned users
					var role = getRole(req.user, project, cycle);
					if(!role && !req.user.admin)
						return res.error(403);

					// TODO: process components individually

					// set timestamps
					delete req.body.created;
					req.body.updated = r.now();

					// TODO: prevent from updating certain fields

					// update the record
					r.table('projects').get(req.params.project).update(req.body, {returnVals: true}).run(conn, function(err, result){
						if(err){
							resources.db.release(conn);
							return res.error(err);
						}

						var project = result.new_val;

						// process the events
						var events = buildEvents(project, cycle);

						// no events to update
						if(!Object.keys(events).length){
							resources.db.release(conn);
							return res.send(Project(role, project, cycle));
						}

						// update the events
						r.table('projects').get(req.params.project).update({events: events}, {returnVals: true}).run(conn, function(err, result){
							resources.db.release(conn);

							if(err)
								return res.error(err);

							var project = result.new_val;
							
							return res.send(Project(role, project, cycle));
						});
					});
				});
			});

			// // TODO: validate against schema

			// // TODO: get and process the current cycle and project
			// var cycle = {};
			// var project = {};

			// // restrict to admin and assigned users
			// var role = getRole(req.user, project, cycle);
			// if(!role && !req.user.admin)
			// 	return res.error(403);

			// // if we aren't processing a component
			// if(!req.body.flow)
			// 	return next();

			// // build the list of component processes to run
			// var tasks = {};
			// _.each(req.body.flow, function(data, id){
			// 	if(!resources.components[cycle.flow[id].component.name])
			// 		throw new Error('no such component!');

			// 	tasks[id] = async.apply(
			// 		resources.components[cycle.flow[id].component.name].update,
			// 		data,
			// 		role,
			// 		cycle.flow[id].component.options,
			// 		project
			// 	)
			// });

			// // components are in charge of making
			// // the db calls to update their stages,
			// // so we're done with the flow
			// delete req.body.flow;


			// async.parallel(tasks, function(err, flow){
			// 	if(err)
			// 		return res.error(err);

			// 	// TODO: what to do w/ result?

			// 	return next()
			// });


			// function next(){
			// 	if(!req.user.admin)
			// 		return next();

			// 	r.table('projects').get(req.params.project).update(req.body)

			// 	function next(){

			// 		// get and build the project

			// 		res.status(200).send(Project(role, project, cycle));
			// 	}
			// }
		},
		replace: function(req, res) {
			if(!req.user)
				return res.error(401);

			if(!req.user.admin)
				return res.error(403, 'Only administrators may replace a project.');

			// sanitize request
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('project', req.body, {useDefault: true});
			if(err)
				return res.error({code: 400, message: err});

			// set timestamps
			// req.body.created = r.row('created');
			req.body.updated = r.now();

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				r.table('cycles').get(req.body.cycle_id).run(conn, function(err, cycle){
					if(err){
						resources.db.release(conn);
						return res.error(err);
					}

					if(!cycle){
						resources.db.release(conn);
						return res.error(400, 'No such cycle.');
					}

					// replace the record inthe db the DB
					r.table('projects').get(req.params.project).replace(req.body, {returnVals: true}).run(conn, function(err, result){
						if(err){
							resources.db.release(conn);
							return res.error(err);
						}

						var project = result.new_val;
						var role = getRole(req.user, project, cycle);

						// process the events
						var events = buildEvents(project, cycle);

						// no events to update
						if(!Object.keys(events).length){
							resources.db.release(conn);
							return res.send(Project(role, project, cycle));
						}

						// update the events
						r.table('projects').get(req.params.project).update({events: events}, {returnVals: true}).run(conn, function(err, result){
							resources.db.release(conn);

							if(err)
								return res.error(err);

							var project = result.new_val;
							
							return res.send(Project(role, project, cycle));
						});
					});
				});
			});
		},
		destroy: function(req, res) {
			if(!req.user)
				return res.error(401);

			if(!req.user.admin)
				return res.error(403, 'Only administrators may delete a project.');

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get users from the DB
				r.table('projects').get(req.params.project).delete({returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var project = result.old_val;

					return res.send(project);
				});
			});
		}
	};
}
