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

		if(err){
			err.message = "Invalid request";
			return res.error(400, err, true);
		}

		// add timestamps
		req.body.created = req.body.updated = r.now();

		// attach to the current user
		req.body.user_id = req.user.id;

		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);

			// insert the project
			r.table('projects').insert(req.body, {returnVals: true}).run(connection, function(err, result){
				resources.db.release(connection);

				if(err)
					return res.error(err);

				return res.data(203, result.new_val, meta);
			});
		});
	});

	app.get('/api/projects', expressJwt({ secret: config.auth.secret }), function(req, res, next){
		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);
					
			r.table('projects').filter({user_id: req.user.id}).run(connection, function(err, cursor){
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

			// TODO: ACL

			// get the project by id
			r.table('projects').get(id).run(connection, function(err, project){
				return res.data(200, project);
			});
		});
	});

	app.patch('/api/project/:id', function(req, res, next){

		// validate the input
		var err = env.validate(schema, req.body, {checkRequired: false, useDefault: true});

		if(err){
			err.message = "Invalid request";
			return res.error(400, err, true);
		}

		resources.db.acquire(function(err, connection) {
			if(err)
				return res.error(err);

			// TODO: ACL

			// get the project by id
			r.table('projects').get(id).update(req.body, {returnVals: true}).run(connection, function(err, result){
				if(err)
					return res.error(err);

					return res.data(203, result.new_val, meta);
			});
		});
	});
};