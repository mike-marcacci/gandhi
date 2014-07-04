'use strict';

var fs = require('fs');
var async = require('async');
var r = require('rethinkdb');

// was the setup successful?
var setup = false;

module.exports = {
	setup: function(done){
		var config = global.setup.config;

		// let's make a temporary database for our test
		config.db.db = config.db.db + '_' + Date.now();

		// create the database
		r.connect(config.db, function(err, conn){
			r.dbCreate(config.db.db).run(conn, function(err, res) {
				if(err){
					conn.close();
					return done(err);
				}

				// now we have something to teardown
				setup = true;

				function requireJSON(f){
					return JSON.parse(fs.readFileSync(f, 'utf8'));
				}

				var fixtures = [
					{info: requireJSON(__dirname + '/../fixtures/db/cycles.info'), data: require('../fixtures/db/cycles.json')},
					{info: requireJSON(__dirname + '/../fixtures/db/projects.info'), data: require('../fixtures/db/projects.json')},
					{info: requireJSON(__dirname + '/../fixtures/db/users.info'), data: require('../fixtures/db/users.json')}
				];

				async.each(fixtures, function(fixture, loop){
					r.db(config.db.db).tableCreate(fixture.info.name, {primaryKey: fixture.info.primary_key}).run(conn, function(err, res){

						// TODO: add indices

						r.db(config.db.db).table(fixture.info.name).insert(fixture.data).run(conn, loop);
					});
				}, function(err, res){
					conn.close();
					done(err, res);
				});
			});
		});
	},
	teardown: function(done){
		var config = global.setup.config;

		// we don't want to tear down if we were unable to setup
		// like if the database we're trying to use already exists
		if(!setup)
			return done();

		// drop the database
		r.connect(config.db, function(err, conn){
			r.dbDrop(config.db.db).run(conn, function(err, res) {

				// what do we want to do here?
				done();

			});
		});
	}
};
