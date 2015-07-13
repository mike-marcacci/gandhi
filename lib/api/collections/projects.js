'use strict';

var r = require('rethinkdb');
var _ = require('lodash');
var Q = require('q');

var errors = require('../errors');
var Cycles = require('./Cycles');
var Project = require('../models/Project');

var cycles = new Cycles();

function Projects(){}

Projects.prototype.query = function(conn, query, user) {
	if(!user) return Q.reject(new errors.UnauthorizedError());


	// Query Cycles
	// ------------

	var c;

	// by cycle ID
	if(query.cycleId)
		c = cycles.get(conn, query.cycleId, user).then(function(cycle){ return [cycle]; });

	// by another user's ID
	else if(user === true && query.userId)
		c = cycles.query(conn, { userId: query.userId }, user);

	// get all cycles
	else if(user === true)
		c = cycles.query(conn, {}, user);

	// by the current user's ID
	else
		c = cycles.query(conn, { userId: query.userId }, user);




	return c.then(function(cycles){

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

		// OPTIMIZATION: restrict non-admins to assigned projects or cycles
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
			return Q.all(results.projects.map(function(data){
				return new Project(data, cycles[data.cycle_id], user);
			})).then(function(projects){

				// filter based on authorizations
				projects = projects.filter(function(project){
					return project.authorizations['project:read'];
				});

				// set the total on the array
				projects.total = results.total;
				return projects;
			});
		});


	});
};



Projects.prototype.get = function(conn, id, user) {
	if(!user) return Q.reject(new errors.UnauthorizedError());

	// get project
	r.table('projects').get(id).run(conn).then(function(data) {
		if(!data) return Q.reject(new errors.NotFoundError('Project not found.'));

		// get the cycle
		cycles.get(data.cycle_id).then(function(cycle) {
			if(!cycle) return Q.reject(new errors.NotFoundError('Cycle not found.'));

			var project = new Project(data, cycle, user);

			// check authorizations
			if(!project.authorizations['project:read'])
				return Q.reject(new errors.ForbiddenError());

			// return as a Project
			return project;
		});
	});
};


module.exports = Projects;
