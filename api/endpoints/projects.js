var r = require('rethinkdb');
var passport = require('passport');

module.exports = function(config, app, resources){

	function list(req, res, filter){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get projects from the DB
			var query = filter ? r.table('projects').filter(filter) : r.table('projects');

			// restrict to user
			if(req.params.user){
				var filter = {users: {}}; filter.users[req.params.user] = true;
				query = query.hasFields(filter);
			}

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
				if(!project || (req.params.user && !project.users[req.params.user]))
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
				if(!project || (req.params.user && !project.users[req.params.user])){
					resources.db.release(conn);
					return res.error(404);
				}

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
			return list(req, res, req.query.filter);
		});

		app.get('/:project', function(req, res){
			return show(req, res);
		});

		app.patch('/:project', function(req, res){
			return update(req, res);
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
			return create(req, res);
		});

		app.get('/', function(req, res){
			return list(req, res, req.query.filter);
		});

		app.get('/:project', function(req, res){
			return show(req, res);
		});

		app.patch('/:project', function(req, res){
			return update(req, res);
		});
	});

};
