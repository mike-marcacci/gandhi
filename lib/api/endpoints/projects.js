'use strict';

var r = require('rethinkdb');
var _ = require('lodash');
var passport = require('passport');

module.exports = function(config, app, resources){

	function applyLocks(project, cycle){

		function test(tests){
			return tests.some(function(set){
				return set.every(function(test){
					// date
					if(test.name == 'date' && (new Date(test.options.date).getTime() < new Date().getTime()))
						return true;

					// submission
					if(test.name == 'status' && project.flow.stages[test.options.stage] && project.flow.stages[test.options.stage].status == test.options.status)
						return true;
				});
			});
		}

		// TODO: apply a lock to the whole project itself?

		// apply lock to each stage in a project
		_.each(cycle.flow.stages, function(settings, id){
			var data = project.flow.stages[id] = project.flow.stages[id] || {};

			data.lock = -1;

			// OPEN
			if(!settings.open || !settings.open.length || test(settings.open))
				data.lock = 0;

			// CLOSE
			if(settings.close && settings.close.length && test(settings.close))
				data.lock = 1;
		});

		return project;
	}

	function list(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			function getProjects(cycles){
				cycles = cycles || [];

				// get projects from the DB
				var query = r.table('projects');

				// restrict to user
				if(req.params.user){
					var fields = {users: {}}; fields.users[req.params.user] = true;
					query = query.filter(function(row){
						return row.hasFields(fields).or(r.expr(cycles).contains(row('cycle_id')));
					});
				}

				// restrict to cycle
				if(req.params.cycle){
					req.query.filter = req.query.filter || {};
					req.query.filter.cycle_id = req.params.cycle;
				}

				// apply the filter
				if(req.query.filter)
					query = query.filter(req.query.filter);

				query.orderBy('created').eqJoin('cycle_id', r.table('cycles')).run(conn, function(err, cursor){
					if(err) {
						resources.db.release(conn);
						return res.error(err);
					}

					// output as an array
					cursor.toArray(function(err, results){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						// apply locks to each project
						var projects = results.map(function(result){
							return applyLocks(result.left, result.right);
						});

						return res.send(projects);
					});
				});
			}

			// check if the user is assigned to an entire cycle
			if(req.params.user){
				var cyclesFields = {users: {}}; cyclesFields.users[req.params.user] = true;
				return r.table('cycles').hasFields(cyclesFields)('id').run(conn, function(err, cursor){
					cursor.toArray(function(err, cycles){
						if(err){
							resources.db.release(conn);
							return res.error(err);
						}

						return getProjects(cycles);
					});
				});
			}

			return getProjects();
		});
	}

	function show(req, res){
		// TODO: ACL
		// TODO: restruct to user (in params)
		// TODO: restrict to program (in params)

		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			r.table('projects').get(req.params.project).do(function(row){
				return {
					left: row,
					right: row.not().or(r.table('cycles').get(row('cycle_id')))
				};
			}).run(conn, function(err, result){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				if(!result || !result.left)
					return res.error(404);

				// apply locks to the project
				var project = applyLocks(result.left, result.right);

				return res.send(project);
			});
		});
	}

	function create(req, res){
		if(req.body.id)
			return res.error(400, 'An ID may not be specified when creating a project');

		// TODO: validate against schema

		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get projects from the DB
			r.table('projects').insert(req.body, {returnVals: true})('new_val').do(function(row){
				return {
					left: row,
					right: row.not().or(r.table('cycles').get(row('cycle_id')))
				};
			}).run(conn, function(err, result){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				if(!result || !result.left)
					return res.error(404);

				// apply locks to the project
				var project = applyLocks(result.left, result.right);

				return res.send(project);
			});
		});
	}

	function update(req, res){

		// TODO: validate against schema

		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get the project from the db
			r.table('projects').get(req.params.project).run(conn, function(err, project){
				if(err) {
					resources.db.release(conn);
					return res.error(err);
				}

				// restrict to user
				// TODO: obey cycle assignments
				// if(!project || (req.params.user && !project.users[req.params.user])){
				// 	resources.db.release(conn);
				// 	return res.error(404);
				// }

				// TODO: restrict to project

				// update the project
				r.table('projects').get(req.params.project).update(req.body, {returnVals: true})('new_val').do(function(row){
					return {
						left: row,
						right: row.not().or(r.table('cycles').get(row('cycle_id')))
					};
				}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					if(!result || !result.left)
						return res.error(404);

					// apply locks to the project
					var project = applyLocks(result.left, result.right);

					return res.send(project);
				});
			});
		});
	}


	function remove(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get project from the DB
			r.table('projects').get(req.params.project).run(conn, function(err, project){
				if(err)
					return res.error(err);

				// restrict to user
				// TODO: obey cycle assignments
				// if(!project || (req.params.user && !project.users[req.params.user]))
				// 	return res.error(404);

				// remove project from the DB
				r.table('projects').get(req.params.project).delete({returnVals: true})('old_val').do(function(row){
					return {
						left: row,
						right: row.not().or(r.table('cycles').get(row('cycle_id')))
					};
				}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					if(!result || !result.left)
						return res.error(404);

					// apply locks to the project
					var project = applyLocks(result.left, result.right);

					return res.send(project);
				});
			});
		});
	}



	//////////////////////////////
	// Root Projects
	//////////////////////////////



	// authenticate
	app.use(config.root + '/api/projects', passport.authenticate('bearer', { session: false }));



	app.use(config.root + '/api/projects', function(req, res, next){

		// restrict endpoint access to admin users
		if(!req.user.admin)
			return res.error(403);
		return next();

	});

	app.post(config.root + '/api/projects', function(req, res){
		return create(req, res);
	});

	app.get(config.root + '/api/projects', function(req, res){
		return list(req, res);
	});

	app.get(config.root + '/api/projects/:project', function(req, res){
		return show(req, res);
	});

	app.patch(config.root + '/api/projects/:project', function(req, res){
		return update(req, res);
	});

	app.delete(config.root + '/api/projects/:project', function(req, res){
		return remove(req, res);
	});



	//////////////////////////////
	// Projects by User
	//////////////////////////////


	// authenticate
	app.use(config.root + '/api/users/:user/projects', passport.authenticate('bearer', { session: false }));



	app.use(config.root + '/api/users/:user/projects', function(req, res, next){

		// restrict access to self for non-admin users
		if(!req.user.admin && req.user.id != req.params.user)
			return res.error(403);
		return next();

	});

	app.post(config.root + '/api/users/:user/projects', function(req, res){

		// add the user as an applicant
		req.body.users[req.params.user] = {
			id: req.params.user,
			role: 'applicant'
		};

		return create(req, res);
	});

	app.get(config.root + '/api/users/:user/projects', function(req, res){
		return list(req, res);
	});

	app.get(config.root + '/api/users/:user/projects/:project', function(req, res){
		return show(req, res);
	});

	app.patch(config.root + '/api/users/:user/projects/:project', function(req, res){
		return update(req, res);
	});

	app.delete(config.root + '/api/users/:user/projects/:project', function(req, res){
		return remove(req, res);
	});


	//////////////////////////////
	// Projects by Cycle
	//////////////////////////////


	// authenticate
	app.use(config.root + '/api/cycles/:cycle/projects', passport.authenticate('bearer', { session: false }));



	app.use(config.root + '/api/cycles/:cycle/projects', function(req, res, next){

		// restrict endpoint access to admin users
		if(!req.user.admin)
			return res.error(403);
		return next();

	});

	app.post(config.root + '/api/cycles/:cycle/projects', function(req, res){

		// add the project to this cycle
		req.body.cycle_id = req.params.cycle;

		return create(req, res);
	});

	app.get(config.root + '/api/cycles/:cycle/projects', function(req, res){
		return list(req, res);
	});

	app.get(config.root + '/api/cycles/:cycle/projects/:project', function(req, res){
		return show(req, res);
	});

	app.patch(config.root + '/api/cycles/:cycle/projects/:project', function(req, res){
		return update(req, res);
	});

	app.delete(config.root + '/api/cycles/:cycle/projects/:project', function(req, res){
		return remove(req, res);
	});

};
