'use strict';

var r = require('rethinkdb');
var _ = require('lodash');
var passport = require('passport');

module.exports = function(config, app, resources){


	// authenticate
	app.use(config.root + '/api/cycles', passport.authenticate('bearer', { session: false }));



	app.post(config.root + '/api/cycles', function(req, res){

		// restrict endpoint access to admin users
		if(!req.user.admin)
			return res.error(403);


		// TODO: validate against schema


		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// insert cycle into the DB
			r.table('cycles').insert(req.body, {returnVals: true}).run(conn, function(err, result){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				return res.send(203, result.new_val);
			});
		});
	});

	app.get(config.root + '/api/cycles', function(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get cycles from the DB
			r.table('cycles').orderBy('created').run(conn, function(err, cursor){
				if(err) {
					resources.db.release(conn);
					return res.error(err);
				}

				// output as an array
				cursor.toArray(function(err, cycles){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					return res.send(cycles);
				});

			});
		});
	});

	app.get(config.root + '/api/cycles/:cycle', function(req, res){
		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// get cycles from the DB
			r.table('cycles').get(req.params.cycle).run(conn, function(err, cycle){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				if(!cycle)
					return res.error(400);

				return res.send(cycle);
			});
		});
	});

	app.patch(config.root + '/api/cycles/:cycle', function(req, res){
		var removeUsers = [];

		// restrict endpoint access to admin users
		if(!req.user.admin)
			return res.error(403);


		// TODO: validate against schema


		var query = r.table('cycles').get(req.params.cycle);

		// remove any users with a falsy value
		if(req.body.users){
			_.each(req.body.users, function(data, id){
				if(!data)
					removeUsers.push(id);
			});

			if(removeUsers.length)
				query = query.replace(r.row.merge(req.body).without({users: removeUsers}), {returnVals: true});
			else
				query = query.update(req.body, {returnVals: true});
		}


		resources.db.acquire(function(err, conn) {
			if(err)
				return res.error(err);

			// update cycle in the DB
			query.run(conn, function(err, result){
				resources.db.release(conn);

				if(err)
					return res.error(err);

				return res.send(203, result.new_val);
			});
		});
	});
};

