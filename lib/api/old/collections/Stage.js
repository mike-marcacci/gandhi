'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
var errors = require('../errors.js');
var collection = require('../collection.js');
var cycleModel = require('../models/cycles.js');

module.exports = function Stage(config, resources) {
	return {
		query: queryStages,
		get: getStage,
		save: saveStage,
		update: updateStage,
		create: createStage,
		delete: deleteStage
	};



	function queryStages(conn, cycleId, query, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

				// return the models for necessary for a component
				{
					cycle: cycle,
					stages: cycle('stages').default({}).coerceTo('array').map(function(kv){
						return kv.nth(1).merge({
							cycle_id: cycle('id')
						});
					})
				}
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError)

		// pass to the components
		.then(function(result){
			return Q.all(_.map(_.sortBy(result.stages, 'order'), function(stage) {

				// if the component isn't registered server side
				if(!resources.components[stage.component.name])
					return stage;

				// pass to the component
				return resources.components[stage.component.name].stage.get(
					stage,
					result.cycle
				);
			}));
		});
	}


	function getStage(conn, cycleId, stageId, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

				// get the stage
				cycle('stages')(stageId).default(null).do(function(stage){
					return r.branch(
						stage.not(),
						r.error('{"error": "NotFoundError", "message": "Stage not found."}'),
						
						// return the models necessary for a component
						{
							cycle: cycle,
							stage: stage.merge({
								cycle_id: cycle('id')
							})
						}
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError)

		// pass to the component
		.then(function(result){

			// if the component isn't registered server side
			if(!resources.components[result.stage.component.name])
				return result.stage;

			// pass to the component
			return resources.components[result.stage.component.name].stage.get(
				result.stage,
				result.cycle
			);
		});
	}


	function createStage(conn, cycleId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// validate lack of id
		if(data.id) return Q.reject(new errors.ValidationError('No id should be set.'));

		// set new id
		var stageId = data.id = uuid();

		// save
		return saveStage(conn, cycleId, stageId, data, user);
	}


	function updateStage(conn, cycleId, stageId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// validate id
		if(data.id && stageId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate stage
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', data, {checkRequired: false});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			// get the cycle
			return r.table('cycles').get(cycleId).do(function(cycle){
				return r.branch(
					cycle.not(),
					r.error('{"error": "NotFoundError", "message": "Cycle not found"}'),

					// get the stage
					r.branch(
						cycle('stages').hasFields(stageId).not(),
						r.error('{"error": "NotFoundError", "message": "Stage not found"}'),

						// return the models necessary for a component
						{
							cycle: cycle,
							stage: cycle('stages')(stageId).default({}).merge({
								cycle_id: cycle('id')
							})
						}
					)
				);
			}).run(conn)

			// parse errors
			.catch(collection.throwError)

			// pass to the component
			.then(function(result){

				// if the component isn't registered server side
				if(!resources.components[result.stage.component.name])
					return data;

				// pass to the component
				return resources.components[result.stage.component.name].stage.update(
					data,
					result.stage,
					result.cycle,
					conn
				);
			})

			// update the cycle
			.then(function(stage){

				// validate the component's response
				var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', stage, {useDefault: true});
				if(err) return Q.reject(new Error('The component generated an invalid stage.'));

				return r.table('cycles').get(cycleId).do(function(cycle){
					var delta = {stages: {}, updated: r.now().toEpochTime()}; delta.stages[stageId] = r.literal(stage);

					// get the cycle
					return r.branch(
						cycle.not(),
						r.error('{"error": "NotFoundError", "message": "Cycle not found"}'),

						// update the cycle
						cycle.merge(delta).do(function(write){
							return r.branch(
								r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
								r.error('{"error": "Error", "message": "Error writing to the database."}'),

								// return new value
								write('stages')(stageId).merge({
									cycle_id: cycle('id')
								})
							);
						})
					);
				}).run(conn)

				// parse errors
				.catch(collection.throwError);
			});
		})

		// release the lock
		.finally(lock.release.bind(lock));


		// TODO: if exports changed, we'll need to recalculate the exports for all corresponding Contents

		
	}


	function saveStage(conn, cycleId, stageId, data, user){
		if(!user) return Q.reject(new errors.UnauthorizedError());
		if(user !== true) return Q.reject(new errors.ForbiddenError());

		// validate id
		if(stageId !== data.id) return Q.reject(new errors.ValidationError('The request body\'s id did not match the URL param.'));

		// validate stage
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', data, {useDefault: true});
		if(err) return Q.reject(new errors.ValidationError('The input is invalid', err));

		// acquire a lock for this cycle
		var lock = new resources.lock('cycle:' + cycleId);
		return lock.acquire()

		// run the query
		.then(function(){
			// get the cycle
			return r.table('cycles').get(cycleId).do(function(cycle){
				return r.branch(
					cycle.not(),
					r.error('{"error": "NotFoundError", "message": "Cycle not found"}'),

					// return the models necessary for a component
					{
						cycle: cycle,
						stage: cycle('stages')(stageId).default({}).merge({
							cycle_id: cycle('id')
						})
					}
				);
			}).run(conn)

			// parse errors
			.catch(collection.throwError)

			// pass to the component
			.then(function(result){

				// if the component isn't registered server side
				if(!resources.components[data.component.name])
					return data;

				// pass to the component
				return resources.components[data.component.name].stage.save(
					data,
					result.stage,
					result.cycle,
					conn
				);
			})

			// update the cycle
			.then(function(stage){

				// validate the component's response
				var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', stage, {useDefault: true});
				if(err) return Q.reject(new Error('The component generated an invalid stage.'));

				return r.table('cycles').get(cycleId).do(function(cycle){
					var delta = {stages: {}, updated: r.now().toEpochTime()}; delta.stages[stageId] = r.literal(stage);

					// get the cycle
					return r.branch(
						cycle.not(),
						r.error('{"error": "NotFoundError", "message": "Cycle not found"}'),

						// update the cycle
						cycle.merge(delta).do(function(write){
							return r.branch(
								r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
								r.error('{"error": "Error", "message": "Error writing to the database."}'),

								// return new value
								write('stages')(stageId).merge({
									cycle_id: cycle('id')
								})
							);
						})
					);
				}).run(conn)

				// parse errors
				.catch(collection.throwError);
			});
		})

		// release the lock
		.finally(lock.release.bind(lock));



		// TODO: if exports changed, we'll need to recalculate the exports for all corresponding Contents


	}


	function deleteStage(conn, cycleId, stageId, user){
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

				var without = { stages: {} };
				without.stages[stageId] = true;

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"error": "NotFoundError", "message": "Cycle not found."}'),

					// get the stage
					r.branch(
						cycle('stages')(stageId).default(null).not(),
						r.error('{"error": "NotFoundError", "message": "Stage not found."}'),

						// update the cycle
						cycle.without(without).merge(delta).do(function(write){
							return r.branch(
								r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
								r.error('{"error": "Error", "message": "Error writing to the database."}'),

								// return old value
								cycle('stages')(stageId).merge({
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
