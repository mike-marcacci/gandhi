'use strict';

var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
var errors = require('../errors.js');
var collection = require('../collection.js');

module.exports = function Status(config, resources) {
	return {
		query: queryStatuses,
		get: getStatus,
		save: saveStatus,
		update: updateStatus,
		create: createStatus,
		delete: deleteStatus
};



	function queryStatuses(conn, cycleId, query, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

				// get the statuses
				cycle('statuses').coerceTo('array').map(function(kv){
					return kv.nth(1).merge({
						cycle_id: cycle('id')
					});
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function getStatus(conn, cycleId, statusId, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

				// get the status
				cycle('statuses')(statusId).default(null).do(function(status){
					return r.branch(
						status.not(),
						r.error('{"error": "NotFoundError", "message": "Status not found."}'),
						status
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}
	

	function createStatus(conn, cycleId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// validate lack of id
		if(data.id) return Q.reject(new errors.ValidationError('No id should be set.'));

		// set new id
		var statusId = data.id = uuid();

		// save
		return saveStatus(conn, cycleId, statusId, data, user);
	}


	function updateStatus(conn, cycleId, statusId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// validate id
		if(typeof data.id !== 'undefined' && statusId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate status
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/status', data, {checkRequired: false});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {
					statuses: {},
					updated: r.now().toEpochTime()
				}; delta.statuses[statusId] = data;

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

					// get the status
					r.branch(
						cycle('statuses')(statusId).default(null).not(),
						r.error('{"error": "NotFoundError", "message": "Status not found."}'),

						// update the cycle
						r.table('cycles').get(cycleId).update(delta, {returnChanges: true}).do(function(result){
							return r.branch(
								result('errors').gt(0),
								r.error('{"error": "Error", "message": "Error writing to the database."}'),

								// return new value
								result('changes').nth(0)('new_val')('statuses')(statusId).merge({
									cycle_id: cycle('id')
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


	function saveStatus(conn, cycleId, statusId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// validate id
		if(statusId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate status
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/status', data, {useDefault: true});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {
					statuses: {},
					updated: r.now().toEpochTime()
				}; delta.statuses[statusId] = r.literal(data);

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

					// update the cycle
					cycle.merge(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"error": "Error", "message": "Error writing to the database."}'),

							// return new value
							write('statuses')(statusId)
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


	function deleteStatus(conn, cycleId, statusId, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {
					updated: r.now().toEpochTime()
				};

				var without = { statuses: {} };
				without.statuses[statusId] = true;

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

					// get the status
					r.branch(
						cycle('statuses')(statusId).default(null).not(),
						r.error('{"error": "NotFoundError", "message": "Status not found."}'),

						// update the cycle
						cycle.without(without).merge(delta).do(function(write){
							return r.branch(
								r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
								r.error('{"error": "Error", "message": "Error writing to the database."}'),

								// return old value
								cycle('statuses')(statusId)
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
