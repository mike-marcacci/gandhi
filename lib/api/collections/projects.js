'use strict';

var r = require('rethinkdb');
var _ = require('lodash');
var Q = require('q');

var errors = require('../errors');
var Cycles = require('./cycles');
var Project = require('../models/Project');




module.exports.query = function(conn, query, user) {
	if(!user) return Q.reject(new errors.UnauthorizedError());


	// Query Cycles
	// ------------

	var cycles;

	// by cycle ID
	if(query.cycleId)
		cycles = Cycles.get(conn, query.cycleId, user).then(function(cycle){ return [cycle]; });

	// by another user's ID
	else if(user === true && query.userId)
		cycles = Cycles.query(conn, { userId: query.userId }, user);

	// get all cycles
	else if(user === true)
		cycles = Cycles.query(conn, {}, user);

	// by the current user's ID
	else
		cycles = Cycles.query(conn, { userId: query.userId }, user);




	return cycles.then(function(cycles){

		// return empty if no cycles are found
		if(!cycles.length) return {
			total: 0,
			projects: []
		};

		cycles = _.indexBy(cycles, 'id');




		// Filter Projects
		// ---------------

		var projects = r.table('projects');

		// restrict to cycle
		if(query.cycleId)
			projects = projects.filter({cycle_id: query.cycleId});

		// restrict non-admins to assigned projects or cycles
		if(user !== true) projects = projects.filter(function(project){
			return project('assignments').hasFields(user.id).or(r.expr(Object.keys(cycles)).contains(project('cycle_id')));
		});

		// restrict to user; TODO: make sure this assignment is visible to the user
		if(query.userId)
			projects = projects.filter(function(project){ return project('assignments').hasFields(query.userId); });

		// search
		if(typeof query.search === 'string' && query.search.length)
			projects = projects.filter(r.row('title').downcase().match(query.search.toLowerCase()));

		// filter
		if(query.filter) query.filter.forEach(function(f){
			projects = projects.filter(f);
		});




		// Build Result
		// ------------

		var result = projects;

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
			total: projects.count(),

			// get the processed projects
			projects: result.coerceTo('array')

		}).run(conn)

		// return as an array
		.then(function(results){

			// add as models
			var projects = results.projects.map(function(data){
				return new Project(data, cycles[data.cycle_id]);
			});

			// set the total on the array
			projects.total = results.total;
			return projects;
		});


	});
};



module.exports.get = function(conn, id, user) {
	if(!user) return Q.reject(new errors.UnauthorizedError());

	// get project
	return r.table('projects').get(id).run(conn);
};
