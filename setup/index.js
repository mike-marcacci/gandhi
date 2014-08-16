'use strict';

var r = require('rethinkdb');
var _ = require('lodash');
var fs = require('fs');
var async = require('async');

module.exports = function(config) {
	r.connect(config.db, function(err, conn){
		r.dbList().run(conn, function(err, dbs){
			if(_.indexOf(dbs, config.db.db) !== -1)
				return conn.close();

			r.dbCreate(config.db.db).run(conn, function(err, res) {
				if(err){
					console.error('Unable to create database "'+config.db.db+'".');
					return conn.close();
				}

				function requireJSON(f){
					return JSON.parse(fs.readFileSync(f, 'utf8'));
				}

				var fixtures = [
					{info: requireJSON(__dirname + '/db/cycles.info'), data: require('./db/cycles.json')},
					{info: requireJSON(__dirname + '/db/projects.info'), data: require('./db/projects.json')},
					{info: requireJSON(__dirname + '/db/users.info'), data: require('./db/users.json')},
					{info: requireJSON(__dirname + '/db/files.info'), data: require('./db/files.json')}
				];

				async.each(fixtures, function(fixture, loop){
					r.db(config.db.db).tableCreate(fixture.info.name, {primaryKey: fixture.info.primary_key}).run(conn, function(err, res){
						if(err)
							return console.error('Unable to add table "'+fixture.info.name+'".');

						// TODO: add indices

						r.db(config.db.db).table(fixture.info.name).insert(fixture.data).run(conn, loop);
					});
				}, function(err, res){
					if(err)
						console.error(err);

					conn.close();
				});
			});
		});
	});
};
