'use strict';

var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
var collection = require('../collection.js');
var projectModel = require('../models/projects.js');

module.exports = function Export(config, resources) {
	return {
		query: queryExports,
		get: getExport,
		save: saveExport,
		update: updateExport,
		create: createExport,
		delete: deleteExport
	};



	function queryExports(conn, cycleId, query, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the exports
				cycle('exports').coerceTo('array').map(function(kv){
					return kv.nth(1).merge({
						cycle_id: cycle('id')
					});
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function getExport(conn, cycleId, exportId, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the export
				cycle('exports')(exportId).default(null).do(function(exp){
					return r.branch(
						exp.not(),
						r.error('{"code": 404, "message": "Export not found."}'),
						exp.merge({
							cycle_id: cycle('id')
						})
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function createExport(conn, cycleId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate lack of id
		if(data.id) return Q.reject({code: 400, message: 'No id should be set.'});

		// set new id
		var exportId = data.id = uuid();

		// save
		return saveExport(conn, cycleId, exportId, data, user);
	}


	function updateExport(conn, cycleId, exportId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && exportId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate export
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/export', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {
					exports: {},
					updated: r.now().toEpochTime()
				}; delta.exports[exportId] = data;

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"code": 404, "message": "Cycle not found."}'),

					// get the export
					r.branch(
						cycle('exports')(exportId).default(null).not(),
						r.error('{"code": 404, "message": "Export not found."}'),


						// update the cycle
						r.table('cycles').get(cycleId).update(delta, {returnChanges: true}).do(function(result){
							return r.branch(
								result('errors').gt(0),
								r.error('{"code": 500, "message": "Error writing to the database."}'),

								// update corresponding projects
								r.table('projects').filter({cycle_id: cycleId}).replace(function(project){
									return projectModel.processWriteHooks(project, result('changes').nth(0)('new_val'));
								}).do(function(){

									// return new value
									return result('changes').nth(0)('new_val')('exports')(exportId).merge({
										cycle_id: cycle('id')
									});
								})
							);
						})
					)
				);
			}).run(conn)

			// parse errors
			.catch(collection.throwError);
		})

		// release the lock
		.finally(lock.release.bind(lock));
	}


	function saveExport(conn, cycleId, exportId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(exportId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate export
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/export', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {
					exports: {},
					updated: r.now().toEpochTime()
				}; delta.exports[exportId] = r.literal(data);

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"code": 404, "message": "Cycle not found."}'),

					// update the cycle
					cycle.merge(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// update corresponding projects
							r.table('projects').filter({cycle_id: cycleId}).replace(function(project){
								return projectModel.processWriteHooks(project, write);
							}).do(function(){

								// return new value
								return write('exports')(exportId).merge({
									cycle_id: cycle('id')
								});
							})
						);
					})
				);
			}).run(conn)

			// parse errors
			.catch(collection.throwError);
		})

		// release the lock
		.finally(lock.release.bind(lock));
	}


	function deleteExport(conn, cycleId, exportId, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {
					updated: r.now().toEpochTime()
				};

				var without = { exports: {} };
				without.exports[exportId] = true;

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"code": 404, "message": "Cycle not found."}'),

					// get the export
					r.branch(
						cycle('exports')(exportId).default(null).not(),
						r.error('{"code": 404, "message": "Export not found."}'),

						// update the cycle
						cycle.without(without).merge(delta).do(function(write){
							return r.branch(
								r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
								r.error('{"code": 500, "message": "Error writing to the database."}'),

								// update corresponding projects
								r.table('projects').filter({cycle_id: cycleId}).replace(function(project){
									return projectModel.processWriteHooks(project, write);
								}).do(function(){

									// return old value
									return cycle('exports')(exportId).merge({
										cycle_id: cycle('id')
									});
								})
							);
						})
					)
				);
			}).run(conn)

			// parse errors
			.catch(collection.throwError);
		})

		// release the lock
		.finally(lock.release.bind(lock));
	}

};
