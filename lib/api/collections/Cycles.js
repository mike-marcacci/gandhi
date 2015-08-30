'use strict';

var r       = require('rethinkdb');
var Promise = require('bluebird');
var errors  = require('../errors');

var Cycle   = require('../models/Cycle');

function Cycles(){}

Cycles.prototype.query = function(conn, query, user) {

	// Filter Cycles
	// -------------

	var cycles = r.table('cycles');

	// OPTIMIZATION: hide drafts from non-admin users
	if(user !== true)
		cycles = cycles.filter(r.row('status_id').eq('draft').not());

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
		return Promise.filter(results.cycles.map(function(data){
			return new Cycle(conn, data, user)
			.catch(function(err){

				// suppress ForbiddenError
				if(err instanceof errors.ForbiddenError)
					return null;

				// re-throw all other errors
				return Promise.reject(err);
			});
		}), function(c){ return !!c; })

		// set the total on the array
		.then(function(cycles){
			cycles.total = results.total;
			return cycles;
		});
	});
};


Cycles.prototype.get = function(conn, id, user) {
	return r.table('cycles').get(id).run(conn).then(function(data) {
		if(!data) return Promise.reject(new errors.NotFoundError());

		return new Cycle(conn, data, user);
	});
};


Cycles.prototype.create = function(conn, data, user) {
	return Cycle.create(conn, data, user);
};


module.exports = Cycles;