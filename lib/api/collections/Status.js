'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');

module.exports = function Status(config, resources) {

	return {
		query: function(conn, cycleId, query, user){
			return queryStatuses(conn, cycleId, query, user);
		},

		get: function(conn, cycleId, statusId, user){
			return getStatus(conn, cycleId, statusId, user);
		},

		save: function(conn, cycleId, statusId, data, user){
			return saveStatus(conn, cycleId, statusId, data, user);
		},

		update: function(conn, cycleId, statusId, data, user){
			return updateStatus(conn, cycleId, statusId, data, user);
		},

		create: function(conn, cycleId, data, user){
			
			// generate new UUID
			var statusId = data.id = uuid();

			return saveStatus(conn, cycleId, statusId, data, user);
		},

		delete: function(conn, cycleId, statusId, user){
			return deleteStatus(conn, cycleId, statusId, user);
		}
	};



	function queryStatuses(conn, cycleId, query, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the statuses
				cycle('statuses')
			);
		}).run(conn)

		// return as an array
		.then(function(triggers){
			return _.values(triggers);
		});
	}


	function getStatus(conn, cycleId, statusId, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the status
				cycle('statuses')(statusId).default(null).do(function(status){
					return r.branch(
						status.not(),
						r.error('{"code": 404, "message": "Status not found."}'),
						status
					);
				})
			);
		}).run(conn);
	}


	function updateStatus(conn, cycleId, statusId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && statusId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate status
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/status', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {statuses: {}}; delta.statuses[statusId] = data;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the status
				r.branch(
					cycle('statuses')(statusId).default(null).not(),
					r.error('{"code": 404, "message": "Status not found."}'),

					// update the cycle
					cycle.merge(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return new value
							write('statuses')(statusId)
						);
					})
				)
			);
		}).run(conn);
	}


	function saveStatus(conn, cycleId, statusId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(statusId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate status
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/status', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// embed the status
		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {statuses: {}}; delta.statuses[statusId] = r.literal(data);

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// update the cycle
				cycle.merge(delta).do(function(write){
					return r.branch(
						r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
						r.error('{"code": 500, "message": "Error writing to the database."}'),

						// return new value
						write('statuses')(statusId)
					);
				})
			);
		}).run(conn);
	}


	function deleteStatus(conn, cycleId, statusId, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {statuses: {}}; delta.statuses[statusId] = true;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the status
				r.branch(
					cycle('statuses')(statusId).default(null).not(),
					r.error('{"code": 404, "message": "Status not found."}'),

					// update the cycle
					cycle.without(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return old value
							cycle('statuses')(statusId)
						);
					})
				)
			);
		}).run(conn);
	}

};
