var r = require('rethinkdb');
var jjv = require('jjv');
var jwt = require('jsonwebtoken');
var password = require('./util/passwords.js');
var expressJwt = require('express-jwt');

var env = jjv();
// var schema = require('./schema/project.json');

module.exports = function(config, app, resources){

	app.post('/api/projects', function(req, res, next){

		// validate the input
		// var err = env.validate(schema, req.body, {checkRequired: true, useDefault: true});

		// if(err){
		// 	err.message = "Invalid request";
		// 	return res.error(400, err, true);
		// }

		// add timestamps
		req.body.created = req.body.updated = r.now();

		// attach to the current user
		if(!req.user.admin){
			req.body.users = {};
			req.body.users[req.user.id] = 'owner';
		}

		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);

			// insert the project
			r.table('projects').insert(req.body, {returnVals: true}).run(connection, function(err, result){
				resources.db.release(connection);

				if(err)
					return res.error(err);

				return res.data(203, result.new_val);
			});
		});
	});

	app.get('/api/projects', expressJwt({ secret: config.auth.secret }), function(req, res, next){
		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);
			
			var query = r.table('projects')

			// restrict to the current user's projects
			if(!req.user.admin){
				var fields = {users: {}}; fields.users[req.user.id] = true;
				query = query.hasFields(fields);
			}

			query.run(connection, function(err, cursor){
				if(err){
					resources.db.release(connection);
					return res.error(err);
				}

				// output as an array
				cursor.toArray(function(err, projects){
					resources.db.release(connection);

					if(err)
						return res.error(err);

					return res.data(projects);
				});
			});
		});
	});

	app.get('/api/project/:id', function(req, res, next){
		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);

			// get the project by id
			r.table('projects').get(id).run(connection, function(err, project){
				if(err)
					return res.error(err);

				if(!project)
					return res.error(404);

				if(!project.users[req.user.id] && !req.user.admin)
					return res.error(403);

				// TODO: pass to components.read

				return res.data(200, project);
			});
		});
	});

	app.patch('/api/project/:id', function(req, res, next){

		// validate the input
		// var err = env.validate(schema, req.body, {checkRequired: false, useDefault: true});

		// if(err){
		// 	err.message = "Invalid request";
		// 	return res.error(400, err, true);
		// }

		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);

			// get the project by id
			r.table('projects').get(req.params.id).run(connection, function(err, project){
				if(err)
					return res.error(err);

				if(!project)
					return res.error(404);

				if(!project.users[req.user.id] && !req.user.admin)
					return res.error(403);

				// TODO: pass to components.update
				
				// update the project
				r.table('projects').get(req.params.id).update(req.body, {returnVals: true}).run(connection, function(err, result){
					if(err)
						return res.error(err);

						// TODO: pass to components.read

						return res.data(200, result.new_val);
				});
			});
		});
	});
};