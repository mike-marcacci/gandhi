'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var collection = require('../collection.js');
var cycleModel = require('../models/cycles.js');

function removeContext(cycle) {
	return _.omit(cycle, ['role','open']);
}

module.exports = function Cycle(config, resources) {
	return {
		query: queryCycles,
		get: getCycle,
		create: createCycle,
		save: saveCycle,
		update: updateCycle,
		delete: deleteCycle
	};



	function queryCycles(conn, query, user){
		if(!user) return Q.reject(401);

		// Filter Cycles
		// -------------

		var cycles = r.table('cycles');

		// hide drafts from non-admin users
		if(user !== true)
			cycles = cycles.filter(r.row('status_id').eq('draft').not());

		// run read queries
		cycles = cycles.map(function(cycle) {
			return cycleModel.stripCollections(cycleModel.addContext(r.expr(user), cycle));
		});

		// filter
		if(query.filter) query.filter.forEach(function(f){
			cycles = cycles.filter(f);
		});

		// search
		if(typeof query.search === 'string' && query.search.length)
			cycles = cycles.filter(r.row('title').downcase().match(query.search.toLowerCase()));


		// Build Result
		// ------------

		var result = cycles;

		// sort
		if(query.sort)
			result = result.orderBy.apply(result, query.sort);

		// skip
		if(query.skip)
			result = result.skip(query.skip);

		// limit
		if(query.limit)
			result = result.limit(query.limit);

		return r.expr({

			// get the total results count
			total: cycles.count(),

			// get the processed cycles
			cycles: result.coerceTo('array')

		}).run(conn)

		// return as an array
		.then(function(results){
			results.cycles.total = results.total;
			return results.cycles;
		});
	}


	function getCycle(conn, cycleId, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// run read queries
				cycleModel.stripCollections(cycleModel.addContext(r.expr(user), cycle)).do(function(cycle){

					// hide draft cycles from non-admin users
					return r.branch(
						cycle('status_id').eq('draft').and(cycle('role').ne(true)),
						r.error('{"code": 404, "message": "Cycle not found."}'),
						cycle
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function createCycle(conn, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		data = removeContext(data);

		// validate id
		if(data.id) return Q.reject({code: 400, message: 'Cycle must not already have an id.'});

		// validate cycle
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		var delta = r.expr(data).merge({
			id: r.uuid(),
			created: r.now().toEpochTime(),
			updated: r.now().toEpochTime()
		});

		// process write hooks
		return cycleModel.processWriteHooks(delta).do(function(write){

			// insert the cycle
			return r.table('cycles').insert(write).do(function(result){
				return r.branch(
					result('errors').gt(0),
					r.error('{"code": 500, "message": "Error writing to the database."}'),

					// return new value
					cycleModel.stripCollections(cycleModel.addContext(r.expr(user), write))
				);
			});
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function updateCycle(conn, cycleId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		data = removeContext(data);

		// validate id
		if(typeof data.id !== 'undefined' && cycleId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate cycle
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		// get the cycle
		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = r.expr(data).merge({
				created: cycle('created').default(r.now().toEpochTime()),
				updated: r.now().toEpochTime()
			});

			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// update the cycle
				cycle.merge(cycleModel.stripCollections(delta)).do(function(write){
					return r.branch(
						r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
						r.error('{"code": 500, "message": "Error writing to the database."}'),

						// return new value
						cycleModel.addContext(r.expr(user), write)
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function saveCycle(conn, cycleId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);

		data = removeContext(data);

		// validate id
		if(cycleId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate cycle
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// get the cycle
		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = r.expr(data).merge({
				created: cycle('created').default(r.now().toEpochTime()),
				updated: r.now().toEpochTime()
			});
			
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// update the cycle
				cycle.merge(cycleModel.stripCollections(delta)).do(function(write){
					return r.branch(
						r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
						r.error('{"code": 500, "message": "Error writing to the database."}'),

						// return new value
						cycleModel.addContext(r.expr(user), write)
					);
				})
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}


	function deleteCycle(conn, cycleId, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// ensure that no projects depend on this cycle
				r.branch(
					r.table('projects').filter({cycle_id: cycleId}).limit(1).count().gt(0),
					r.error('{"code": 400, "message": "The cycle cannot be destroyed because projects depend on it."}'),
					
					// delete the cycle
					r.branch(
						r.table('cycles').get(cycleId).delete()('errors').gt(0),
						r.error('{"code": 500, "message": "Error writing to the database."}'),

						// return old value
						cycleModel.stripCollections(cycleModel.addContext(r.expr(user), cycle))
					)
				)
			);
		}).run(conn)

		// parse errors
		.catch(collection.throwError);
	}

};
