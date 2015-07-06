'use strict';

var r = require('rethinkdb');
var _ = require('lodash');
var Q = require('q');

var errors = require('../errors');
var Cycle = require('../models/Cycle');


module.exports.query = function(conn, query, user) {
	if(!user) return Q.reject(new errors.UnauthorizedError());

	// Filter Cycles
	// -------------

	var cycles = r.table('cycles');

	// hide drafts from non-admin users
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
		results.cycles.total = results.total;
		return results.cycles;
	});
};



module.exports.get = function(conn, id, user) {
	if(!user) return Q.reject(new errors.UnauthorizedError());

	// get cycle
	return r.table('cycles').get(id).run(conn).then(function(data) {
		if(!data) return null;

		// TODO: apply user to model and filter based on authorizations

		return new Cycle(data);
	});
};
