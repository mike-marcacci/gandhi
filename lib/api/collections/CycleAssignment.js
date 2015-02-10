'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

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
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the assignments
				cycle('assignments')
			);
		}).run(conn)

		// return as an array
		.then(function(assignments){
			return _.values(assignments);
		});
	}


	function getAssignment(conn, cycleId, assignmentId, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the assignment
				cycle('assignments')(assignmentId).default(null).do(function(assignment){
					return r.branch(
						assignment.not(),
						r.error('{"code": 404, "message": "Assignment not found."}'),
						assignment
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function updateAssignment(conn, cycleId, assignmentId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && assignmentId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate assignment
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/assignment', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {
				assignments: {},
				updated: r.now().toEpochTime()
			}; delta.assignments[assignmentId] = data;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the assignment
				r.branch(
					cycle('assignments')(assignmentId).default(null).not(),
					r.error('{"code": 404, "message": "Assignment not found."}'),

					// update the cycle
					cycle.merge(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return new value
							write('assignments')(assignmentId)
						);
					})
				)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function saveAssignment(conn, cycleId, assignmentId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(assignmentId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate assignment
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/assignment', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// embed the assignment
		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {
				assignments: {},
				updated: r.now().toEpochTime()
			}; delta.assignments[assignmentId] = r.literal(data);

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
						write('assignments')(assignmentId)
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function deleteAssignment(conn, cycleId, assignmentId, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {
				assignments: {},
				updated: r.now().toEpochTime()
			}; delta.assignments[assignmentId] = true;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the assignment
				r.branch(
					cycle('assignments')(assignmentId).default(null).not(),
					r.error('{"code": 404, "message": "Assignment not found."}'),

					// update the cycle
					cycle.without(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return old value
							cycle('assignments')(assignmentId)
						);
					})
				)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}

};
