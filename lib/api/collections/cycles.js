'use strict';

var r = require('rethinkdb');
var Q = require('q');

var errors = require('../errors');
var Cycle = require('../models/Cycle');

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
		return Q.all(results.cycles.map(function(data){
			return new Cycle(data, user);
		})).then(function(cycles){

			// filter based on authorizations
			cycles = cycles.filter(function(cycle){
				return cycle.authorizations['cycle:read'];
			});

			// set the total on the array
			cycles.total = results.total;
			return cycles;
		});
	});
};



Cycles.prototype.get = function(conn, id, user) {
	return r.table('cycles').get(id).run(conn).then(function(data) {
		if(!data) return Q.reject(new errors.NotFoundError());

		return new Cycle(data, user).then(function(cycle){

			// check authorizations
			if(!cycle.authorizations['cycle:read'])
				return Q.reject(new errors.ForbiddenError());

			return cycle;
		});
	});
};

module.exports = Cycles;