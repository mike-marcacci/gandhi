'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
var cycleModel = require('../models/cycles.js');

module.exports = function Stage(config, resources) {

	return {
		query: function(conn, cycleId, query, user){
			return queryStages(conn, cycleId, query, user);
		},

		get: function(conn, cycleId, stageId, user){
			return getStage(conn, cycleId, stageId, user);
		},

		save: function(conn, cycleId, stageId, data, user){
			return saveStage(conn, cycleId, stageId, data, user);
		},

		update: function(conn, cycleId, stageId, data, user){
			return updateStage(conn, cycleId, stageId, data, user);
		},

		create: function(conn, cycleId, data, user){
			
			// generate new UUID
			var stageId = data.id = uuid();

			return saveStage(conn, cycleId, stageId, data, user);
		},

		delete: function(conn, cycleId, stageId, user){
			return deleteStage(conn, cycleId, stageId, user);
		}
	};



	function queryStages(conn, cycleId, query, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// return the models for necessary for a component
				{
					cycle: cycleModel.sanitize(cycle),
					stages: cycle('stages').default({})
				}
			);
		}).run(conn)

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
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the stage
				cycle('stages')(stageId).default(null).do(function(stage){
					return r.branch(
						stage.not(),
						r.error('{"code": 404, "message": "Stage not found."}'),
						
						// return the models necessary for a component
						{
							cycle: cycleModel.sanitize(cycle),
							stage: stage
						}
					);
				})
			);
		}).run(conn)

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


	function updateStage(conn, cycleId, stageId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && stageId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// prevent component name from changing on a patch
		if(data.component) delete data.component.name;

		// validate stage
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		// get the cycle
		return r.table('cycles').get(cycleId).do(function(cycle){
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found"}'),

				// get the stage
				r.branch(
					cycle('stages').hasFields(stageId).not(),
					r.error('{"code": 404, "message": "Stage not found"}'),

					// return the models necessary for a component
					{
						cycle: cycleModel.sanitize(cycle),
						stage: cycle('stages')(stageId)
					}
				)
			);
		}).run(conn)

		// pass to the component
		.then(function(result){

			// if the component isn't registered server side
			if(!resources.components[result.stage.component.name])
				return data;

			// pass to the component
			return resources.components[result.stage.component.name].stage.update(
				data,
				result.stage,
				result.cycle
			);
		})

		// update the cycle
		.then(function(stage){

			// validate the component's response
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', stage, {checkRequired: false});
			if(err) return Q.reject({code: 500, message: err});

			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {stages: {}}; delta.stages[stageId] = stage;

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"code": 404, "message": "Cycle not found"}'),

					// get the stage
					r.branch(
						cycle('stages').hasFields(stageId).not(),
						r.error('{"code": 404, "message": "Stage not found"}'),

						// update the cycle
						cycle.merge(delta).do(function(write){
							return r.branch(
								r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
								r.error('{"code": 500, "message": "Error writing to the database."}'),

								// return new value
								write('stages')(stageId)
							);
						})
					)
				);
			}).run(conn);
		});
	}


	function saveStage(conn, cycleId, stageId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(stageId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate stage
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// get the cycle
		return r.table('cycles').get(cycleId).do(function(cycle){
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found"}'),

				// return the models necessary for a component
				{
					cycle: cycleModel.sanitize(cycle),
					stage: cycle('stages')(stageId).default(null)
				}
			);
		}).run(conn)

		// pass to the component
		.then(function(result){

			// if the component isn't registered server side
			if(!resources.components[data.component.name])
				return data;

			// pass to the component
			return resources.components[data.component.name].stage.save(
				data,
				result.stage,
				result.cycle
			);
		})

		// update the cycle
		.then(function(stage){

			// validate the component's response
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', stage, {useDefault: true});
			if(err) return Q.reject({code: 500, message: err});

			return r.table('cycles').get(cycleId).do(function(cycle){
				var delta = {stages: {}}; delta.stages[stageId] = r.literal(stage);

				// get the cycle
				return r.branch(
					cycle.not(),
					r.error('{"code": 404, "message": "Cycle not found"}'),

					// update the cycle
					cycle.merge(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return new value
							write('stages')(stageId)
						);
					})
				);
			}).run(conn);
		});
	}


	function deleteStage(conn, cycleId, stageId, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {stages: {}}; delta.stages[stageId] = true;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the stage
				r.branch(
					cycle('stages')(stageId).default(null).not(),
					r.error('{"code": 404, "message": "Stage not found."}'),

					// update the cycle
					cycle.without(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return old value
							cycle('stages')(stageId)
						);
					})
				)
			);
		}).run(conn);
	}

};
