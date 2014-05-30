var r = require('rethinkdb');
var passport = require('passport');

module.exports = function(config, app, resources){

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

				query.orderBy('created').run(conn, function(err, cursor){
					if(err) {
						resources.db.release(conn);
						return res.error(err);
					}

					// output as an array
					cursor.toArray(function(err, projects){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						return res.data(projects);
					});
				});
			};

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
	};

	function show(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			r.table('projects').get(req.params.project).run(conn, function(err, project){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				// restrict to user
				// TODO: obey cycle assignments
				// if(!project || (req.params.user && !project.users[req.params.user]))
				// 	return res.error(404);

				// TODO: restrict to project

				return res.data(project);
			});
		});
	}

	function create(req, res){
		if(req.body.id)
			return res.error(400, "An ID may not be specified when creating a project");

		// TODO: validate against schema

		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get projects from the DB
			r.table('projects').insert(req.body, {returnVals: true}).run(conn, function(err, result){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				return res.data(result.new_val);
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
				r.table('projects').get(req.params.project).update(req.body, {returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					return res.data(result.new_val);
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
				r.table('projects').get(req.params.project).delete({returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var project = result.old_val;

					return res.data(project);
				});
			});
		});
	};


	//////////////////////////////
	// Root Projects
	//////////////////////////////

	app.namespace('/projects', passport.authenticate('bearer', { session: false }), function(req, res, next){

		// restrict endpoint access to admin users
		if(!req.user.admin)
			return res.error(403);
		return next();

	}, function(){
		app.post('/', function(req, res){
			return create(req, res);
		});

		app.get('', function(req, res){
			return list(req, res);
		});

		app.get('/:project', function(req, res){
			return show(req, res);
		});

		app.patch('/:project', function(req, res){
			return update(req, res);
		});

		app.del('/:project', function(req, res){
			return remove(req, res);
		});
	});



	//////////////////////////////
	// Projects by User
	//////////////////////////////

	app.namespace('/users/:user/projects', passport.authenticate('bearer', { session: false }), function(req, res, next){

		// restrict access to self for non-admin users
		if(!req.user.admin && req.user.id != req.params.user)
			return res.error(403);
		return next();

	}, function(){
		app.post('/', function(req, res){

			// add the user as an applicant
			req.body.users[req.params.user] = {
				id: req.params.user,
				role: 'applicant'
			};

			return create(req, res);
		});

		app.get('/', function(req, res){
			return list(req, res);
		});

		app.get('/:project', function(req, res){
			return show(req, res);
		});

		app.patch('/:project', function(req, res){
			return update(req, res);
		});

		app.del('/:project', function(req, res){
			return remove(req, res);
		});
	});


	//////////////////////////////
	// Projects by Cycle
	//////////////////////////////

	app.namespace('/cycles/:cycle/projects', passport.authenticate('bearer', { session: false }), function(req, res, next){

		// restrict endpoint access to admin users
		if(!req.user.admin)
			return res.error(403);
		return next();

	}, function(){
		app.post('/', function(req, res){

			// add the project to this cycle
			req.body.cycle_id = req.params.cycle;

			return create(req, res);
		});

		app.get('/', function(req, res){
			return list(req, res);
		});

		app.get('/:project', function(req, res){
			return show(req, res);
		});

		app.patch('/:project', function(req, res){
			return update(req, res);
		});

		app.del('/:project', function(req, res){
			return remove(req, res);
		});
	});

};
