'use strict';

var url = require('url');
var li = require('li');
var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {

	function getRole(user, project, cycle) {
		if(project.users[user.id] && project.users[user.id].role && cycle.roles[project.users[user.id].role])
			return cycle.roles[project.users[user.id].role];

		if(cycle.users[user.id] && cycle.users[user.id].role && cycle.roles[cycle.users[user.id].role])
			return cycle.roles[cycle.users[user.id].role];

		return null;
	}

	function processEvents(project, cycle, callback) {
		// apply event & states states to project

		// TODO: fire off listeners

		// calculate locks
	}

	function Project(role, project, cycle) {
		// process events

		// process locks

		// apply role

		return project;
	}

	return {
		create: function(req, res) {
			if(!req.user)
				return res.error(401);

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

				// insert the project
				r.table('projects').insert(req.body, {returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var project = result.new_val;

					return res.status(201).send(project);
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

				// not restricted to user
				if(!req.params.user)
					return next();

				// restrict to user
				return r.table('cycles').hasFields({users: req.params.user})('id').run(conn, function(err, cursor){
					cursor.toArray(function(err, cycleIds){
						query = query.filter(r.expr(cycleIds).contains(r.row('cycle_id')).or(r.row('users').hasFields(req.params.user)));
						next();
					});
				});

				function next(){

					// apply query filter
					if(req.query.filter)
						query = query.filter(req.query.filter);

					query.run(conn, function(err, cursor) {
						if(err) {
							resources.db.release(conn);
							return res.error(err);
						}

						cursor.toArray(function(err, projects){
							resources.db.release(conn);

							if(err)
								return res.error(err);

							// TODO: build projects

							res.send(projects);
						});
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
					cycle: r.table('cycles').get(query('cycle_id'))
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

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				var query = r.table('projects').get(req.params.project);
				r.expr({
					project: query,
					cycle: r.table('cycles').get(query('cycle_id'))
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

					// validate request against schema
					var err = resources.validator.validate('project', req.body, {checkRequired: false});
					if(err)
						return res.error({code: 400, message: err});

					// set timestamps
					delete req.body.created;
					req.body.updated = r.now();

					// update the record
					r.table('projects').get(req.params.project).update(req.body, {returnVals: true}).run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						var project = result.new_val;

						return res.send(Project(role, project, cycle));
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

				// replace the record inthe db the DB
				r.table('projects').get(req.params.project).replace(req.body, {returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var project = result.new_val;

					return res.send(project);
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
