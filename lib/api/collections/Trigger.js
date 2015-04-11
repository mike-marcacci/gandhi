'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
var collection = require('../collection.js');
var projectModel = require('../models/projects.js');

module.exports = function Trigger(config, resources) {
	return {
		query: queryTriggers,
		get: getTrigger,
		save: saveTrigger,
		update: updateTrigger,
		create: createTrigger,
		delete: deleteTrigger
};



	function queryTriggers(conn, cycleId, query, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the triggers
				cycle('triggers').coerceTo('array').map(function(kv){
					return kv.nth(1).merge({
						cycle_id: cycle('id')
					});
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
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
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function createTrigger(conn, cycleId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate lack of id
		if(data.id) return Q.reject({code: 400, message: 'No id should be set.'});

		// set new id
		var triggerId = data.id = uuid();

		// save
		return saveTrigger(conn, cycleId, triggerId, data, user);
	}


	function updateTrigger(conn, cycleId, triggerId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && triggerId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate trigger
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/trigger', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {
				triggers: {},
				updated: r.now().toEpochTime()
			}; delta.triggers[triggerId] = data;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the trigger
				r.branch(
					cycle('triggers')(triggerId).default(null).not(),
					r.error('{"code": 404, "message": "Trigger not found."}'),

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
								return result('changes').nth(0)('new_val')('triggers')(triggerId);
							})
						);
					})
				)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function saveTrigger(conn, cycleId, triggerId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		// validate id
		if(triggerId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate trigger
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/trigger', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// embed the trigger
		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {
				triggers: {},
				updated: r.now().toEpochTime()
			}; delta.triggers[triggerId] = r.literal(data);

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
							return write('triggers')(triggerId);
						})
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function deleteTrigger(conn, cycleId, triggerId, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {
				updated: r.now().toEpochTime()
			};

			var without = { triggers: {} };
			without.triggers[triggerId] = true;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the trigger
				r.branch(
					cycle('triggers')(triggerId).default(null).not(),
					r.error('{"code": 404, "message": "Trigger not found."}'),

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
								return cycle('triggers')(triggerId);
							})
						);
					})
				)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}

};
