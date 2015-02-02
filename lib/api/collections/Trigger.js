'use strict';

var r = require('rethinkdb');
var Q = require('q');

module.exports = function Trigger(config, resources) {

	return {
		query: function(conn, cycleId, query, user){
			return queryTriggers(conn, cycleId, query, user);
		},

		get: function(conn, cycleId, triggerId, user){
			return getTrigger(conn, cycleId, triggerId, user);
		},

		save: function(conn, cycleId, triggerId, data, user){
			return saveTrigger(conn, cycleId, triggerId, data, user);
		},

		update: function(conn, cycleId, triggerId, data, user){
			return updateTrigger(conn, cycleId, triggerId, data, user);
		},

		create: function(conn, cycleId, data, user){
			// generate new UUID
			var triggerId = r.uuid();
			data = r.expr(data).merge({id: triggerId});

			return saveTrigger(conn, cycleId, triggerId, data, user);
		},

		delete: function(conn, cycleId, triggerId, user){
			return deleteTrigger(conn, cycleId, triggerId, user);
		}
	};



	function queryTriggers(conn, cycleId, query, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the triggers
				cycle('triggers')
			);
		}).run(conn);
	}


	function getTrigger(conn, cycleId, triggerId, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the trigger
				cycle('triggers')(triggerId).default(null).do(function(trigger){
					return r.branch(
						trigger.not(),
						r.error('{"code": 404, "message": "Trigger not found."}'),
						trigger
					);
				})
			);
		}).run(conn);
	}


	function updateTrigger(conn, cycleId, triggerId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && triggerId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate trigger
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/trigger', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {triggers: {}}; delta.triggers[triggerId] = data;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the trigger
				r.branch(
					cycle('triggers')(triggerId).default(null).not(),
					r.error('{"code": 404, "message": "Trigger not found."}'),

					// update the cycle
					cycle.merge(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return new value
							write('triggers')(triggerId)
						);
					})
				)
			);
		}).run(conn);
	}


	function saveTrigger(conn, cycleId, triggerId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(triggerId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate trigger
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/trigger', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// embed the trigger
		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {triggers: {}}; delta.triggers[triggerId] = r.literal(data);

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
						write('triggers')(triggerId)
					);
				})
			);
		}).run(conn);
	}


	function deleteTrigger(conn, cycleId, triggerId, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {triggers: {}}; delta.triggers[triggerId] = true;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the trigger
				r.branch(
					cycle('triggers')(triggerId).default(null).not(),
					r.error('{"code": 404, "message": "Trigger not found."}'),

					// update the cycle
					cycle.without(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return old value
							cycle('triggers')(triggerId)
						);
					})
				)
			);
		}).run(conn);
	}

};
