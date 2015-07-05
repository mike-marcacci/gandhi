'use strict';

var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
var errors = require('../errors.js');
var collection = require('../collection.js');

module.exports = function CycleAssignment(config, resources) {
	return {
		query: queryAssignments,
		get: getAssignment,
		save: saveAssignment,
		update: updateAssignment,
		delete: deleteAssignment,
	};



	function queryAssignments(conn, cycleId, query, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

				// get the assignments
				cycle('assignments').coerceTo('array').map(function(kv){
					return kv.nth(1).merge({
						cycle_id: cycle('id')
					});
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function getAssignment(conn, cycleId, assignmentId, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

				// get the assignment
				cycle('assignments')(assignmentId).default(null).do(function(assignment){
					return r.branch(
						assignment.not(),
						r.error('{"error": "NotFoundError", "message": "Assignment not found."}'),
						assignment.merge({
							cycle_id: cycle('id')
						})
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function updateAssignment(conn, cycleId, assignmentId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// validate id
		if(typeof data.id !== 'undefined' && assignmentId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate assignment
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/assignment', data, {checkRequired: false});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {
					assignments: {},
					updated: r.now().toEpochTime()
				}; delta.assignments[assignmentId] = data;

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

					// get the assignment
					r.branch(
						cycle('assignments')(assignmentId).default(null).not(),
						r.error('{"error": "NotFoundError", "message": "Assignment not found."}'),

						// update the cycle
						r.table('cycles').get(cycleId).update(delta, {returnChanges: true}).do(function(result){
							return r.branch(
								result('errors').gt(0),
								r.error('{"error": "Error", "message": "Error writing to the database."}'),

								// return new value
								result('changes').nth(0)('new_val')('assignments')(assignmentId).merge({
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


	function saveAssignment(conn, cycleId, assignmentId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// validate id
		if(assignmentId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate assignment
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/assignment', data, {useDefault: true});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {
					assignments: {},
					updated: r.now().toEpochTime()
				}; delta.assignments[assignmentId] = r.literal(data);

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
							write('assignments')(assignmentId).merge({
								cycle_id: cycle('id')
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


	function deleteAssignment(conn, cycleId, assignmentId, user){
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

				var without = { assignments: {} };
				without.assignments[assignmentId] = true;

				return r.branch(
					cycle.not(),
					r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

					// get the assignment
					r.branch(
						cycle('assignments')(assignmentId).default(null).not(),
						r.error('{"error": "NotFoundError", "message": "Assignment not found."}'),

						// update the cycle
						cycle.without(without).merge(delta).do(function(write){
							return r.branch(
								r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
								r.error('{"error": "Error", "message": "Error writing to the database."}'),

								// return old value
								cycle('assignments')(assignmentId).merge({
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

};
