'use strict';

var r = require('rethinkdb');
var _ = require('lodash');
var fs = require('fs');
var Q = require('q');

module.exports = function(config, callback) {

	// set up and populate uploads

	// set up and populate the database
	return r.connect(config.db).then(function(conn){
		return r.dbList().run(conn)

		.then(function(dbs){
			if(_.indexOf(dbs, config.db.db) !== -1) return;

			// create database
			return r.dbCreate(config.db.db).run(conn)

			// create schema and fixture
			.then(function(){

				function requireJSON(f){
					return JSON.parse(fs.readFileSync(f, 'utf8'));
				}

				return Q.all([
					{info: requireJSON(__dirname + '/../test/fixtures/db/cycles.info'), data: require('../test/fixtures/db/cycles.json')},
					{info: requireJSON(__dirname + '/../test/fixtures/db/projects.info'), data: require('../test/fixtures/db/projects.json')},
					{info: requireJSON(__dirname + '/../test/fixtures/db/users.info'), data: require('../test/fixtures/db/users.json')},
					{info: requireJSON(__dirname + '/../test/fixtures/db/notifications.info'), data: require('../test/fixtures/db/notifications.json')},
					{info: requireJSON(__dirname + '/../test/fixtures/db/files.info'), data: require('../test/fixtures/db/files.json')}
				].map(function(fixture) {
					return r.db(config.db.db).tableCreate(fixture.info.name, {primaryKey: fixture.info.primary_key}).run(conn)
					.then(function(){ return r.db(config.db.db).table(fixture.info.name).insert(fixture.data).run(conn); });
				}));
			})
		})
		.finally(function(){
			conn.close();
		});
	});
};
