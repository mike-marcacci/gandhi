'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
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
				cycle('exports')
			);
		}).run(conn)

		// return as an array
		.then(function(triggers){
			return _.values(triggers);
		});
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
						exp
					);
				})
			);
		}).run(conn);
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
					cycle.merge(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// update corresponding projects
							r.table('projects').filter({cycle_id: cycleId}).replace(function(project){
								return projectModel.processWriteHooks(project, write);
							}).do(function(){

								// return new value
								return write('exports')(exportId);
							})
						);
					})
				)
			);
		}).run(conn);
	}


	function saveExport(conn, cycleId, exportId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(exportId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate export
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/export', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// embed the export
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
							return write('exports')(exportId);
						})
					);
				})
			);
		}).run(conn);
	}


	function deleteExport(conn, cycleId, exportId, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {
				exports: {},
				updated: r.now().toEpochTime()
			}; delta.exports[exportId] = true;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the export
				r.branch(
					cycle('exports')(exportId).default(null).not(),
					r.error('{"code": 404, "message": "Export not found."}'),

					// update the cycle
					cycle.without(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// update corresponding projects
							r.table('projects').filter({cycle_id: cycleId}).replace(function(project){
								return projectModel.processWriteHooks(project, write);
							}).do(function(){

								// return old value
								return cycle('exports')(exportId);
							})
						);
					})
				)
			);
		}).run(conn);
	}

};
