'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

var uuid = require('../utils/uuid.js');
var projectModel = require('../models/projects.js');
var cycleModel = require('../models/cycles.js');

module.exports = function Cycle(config, resources) {

	return {
		query: queryCycles,
		get: getCycle,
		save: saveCycle,
		update: updateCycle,
		delete: deleteCycle,
		create: function(conn, cycleId, data, user){
			
			// generate new UUID
			var cycleId = data.id = uuid();

			return saveCycle(conn, cycleId, data, user);
		}
	};



	function queryCycles(conn, cycleId, query, user){
		if(!user) return Q.reject(401);

		// Filter Cycles
		// -------------

		var cycles = r.table('cycles')

		// hide drafts from non-admin users
		if(user !== true && !user.admin)
			cycles = cycles.filter(r.row('status_id').eq('draft').not());

		// run read queries
		cycles = cycles.map(function(cycle) {
			return cycleModel.sanitize(cycleModel.read(r.expr(user), cycle));
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
			result = result.orderBy.apply(result.orderBy, query.sort);

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
				cycleModel.sanitize(cycleModel.read(r.expr(user), cycle)).do(function(cycle){

					// hide draft cycles from non-admin users
					return r.branch(
						cycle('status_id').eq('draft').and(cycle('role').ne(true)),
						r.error('{"code": 404, "message": "Cycle not found."}'),
						cycle
					)
				})
			);
		}).run(conn);
	}


	function updateCycle(conn, cycleId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && cycleId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate cycle
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = data;

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
						cycleModel.sanitize(cycleModel.read(r.expr(user), write))
					);
				})
			);
		}).run(conn);
	}


	function saveCycle(conn, cycleId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(cycleId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate cycle
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// embed the cycle
		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {cycles: {}}; delta.cycles[cycleId] = r.literal(data);

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
							return projectModel.write(project, write);
						}).do(function(){

							// return new value
							return write('cycles')(cycleId);
						})
					);
				})
			);
		}).run(conn);
	}


	function deleteCycle(conn, cycleId, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);
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
						cycleModel.sanitize(cycleModel.read(r.expr(user), cycle))
					)
				)
			);
		}).run(conn);
	}

};
