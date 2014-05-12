var r = require('rethinkdb');

module.exports = function(config, app, resources){

	function list(req, res, filter){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get projects from the DB
			var query = filter ? r.table('projects').filter(filter) : r.table('projects');

			// restrict to user
			if(req.params.user)
				query = query.filter(r.row('users').contains(function(user){ return user('id').eq(req.params.user); }));

			query.run(conn, function(err, cursor){
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
		});
	}

	function show(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			r.table('projects').get(req.params.project).run(conn, function(err, project){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				// restrict to user
				if(!project || (req.params.user && !project.users.some(function(user){ return user.id == req.params.user; })))
					return res.error(404);

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
				if(!project || (req.params.user && !project.users.some(function(user){ return user.id == req.params.user; }))){
					resources.db.release(conn);
					return res.error(404);
				}

				// update the project
				r.table('projects').get(req.params.project).update(req.body).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					return res.data(result.new_val);
				});

			});
		});
	}



	//////////////////////////////
	// Root Projects
	//////////////////////////////

	app.get('/projects', function(req, res){
		return list(req, res, req.query.filter);
	});

	app.get('/projects/:project', function(req, res){
		return show(req, res);
	});

	app.post('/projects', function(req, res){
		return create(req, res);
	});

	app.patch('/projects/:project', function(req, res){
		return update(req, res);
	});



	//////////////////////////////
	// Projects by User
	//////////////////////////////

	app.get('/users/:user/projects', function(req, res){
		return list(req, res, req.query.filter);
	});

	app.get('/users/:user/projects/:project', function(req, res){
		return show(req, res);
	});

	app.post('/users/:user/projects', function(req, res){
		return create(req, res);
	});

	app.patch('/users/:user/projects/:project', function(req, res){
		return update(req, res);
	});

};
