'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');

module.exports = function Export(config, resources) {

	return {
		query: function(conn, cycleId, query, user){
			return queryExports(conn, cycleId, query, user);
		},

		get: function(conn, cycleId, exportId, user){
			return getExport(conn, cycleId, exportId, user);
		},

		save: function(conn, cycleId, exportId, data, user){
			return saveExport(conn, cycleId, exportId, data, user);
		},

		update: function(conn, cycleId, exportId, data, user){
			return updateExport(conn, cycleId, exportId, data, user);
		},

		create: function(conn, cycleId, data, user){
			
			// generate new UUID
			var exportId = data.id = uuid();

			return saveExport(conn, cycleId, exportId, data, user);
		},

		delete: function(conn, cycleId, exportId, user){
			return deleteExport(conn, cycleId, exportId, user);
		}
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


	function updateExport(conn, cycleId, exportId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && exportId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate export
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/export', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {exports: {}}; delta.exports[exportId] = data;

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
							r.table('projects').filter({cycle_id: cycleId}).update(function(project){
								return projectModel.write(project, write);
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
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(exportId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate export
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/export', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// embed the export
		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {exports: {}}; delta.exports[exportId] = r.literal(data);

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
						r.table('projects').filter({cycle_id: cycleId}).update(function(project){
							return projectModel.write(project, write);
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
		if(user !== true && !user.admin) return Q.reject(403);

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {exports: {}}; delta.exports[exportId] = true;

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

							// return old value
							cycle('exports')(exportId)
						);
					})
				)
			);
		}).run(conn);
	}

};
