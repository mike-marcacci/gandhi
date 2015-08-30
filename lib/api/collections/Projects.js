'use strict';

var r       = require('rethinkdb');
var Promise = require('bluebird');
var _       = require('lodash');
var errors  = require('../errors');

var Cycles  = require('./Cycles');
var Project = require('../models/Project');

var cycles = new Cycles();

function Projects(){}

Projects.prototype.query = function(conn, query, user) {
	if(!user) return Promise.reject(new errors.UnauthorizedError());


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




	return c.then(function(assignedCycles){

		// return empty if no cycles are found
		if(!assignedCycles.length) return {
			total: 0,
			projects: []
		};

		assignedCycles = _.indexBy(assignedCycles, 'id');




		// Filter Projects
		// ---------------

		var projects = r.table('projects');

		// restrict to cycle
		if(query.cycleId)
			projects = projects.filter({cycle_id: query.cycleId});

		// OPTIMIZATION: restrict non-admins to assigned projects or cycles
		if(user !== true) projects = projects.filter(function(project){
			return project('assignments').hasFields(user.id).or(r.expr(Object.keys(assignedCycles)).contains(project('cycle_id')));
		});

		// restrict to user; TODO: make sure this assignment is visible to the current user
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


		.then(function(results){

			// reuse any assigned cycles
			var c = {};
			results.projects.forEach(function(r) {
				c[r.cycle_id] = c[r.cycle_id] || assignedCycles[r.cycle_id] || cycles.get(conn, r.cycle_id, user).catch(function(err){

					// suppress ForbiddenError
					if(err instanceof errors.ForbiddenError)
						return null;

					// re-throw all other errors
					return Promise.reject(err);
				});
			});

			// get all associated cycles
			return Promise.props(c)
			.then(function(c){

				// return an array of Project objects
				return Promise.filter(results.projects.map(function(data) {

					// user does not have access to this cycle
					if(!c[data.cycle_id])
						return null;

					return new Project(conn, data, c[data.cycle_id], user)
					.catch(function(err){

						// suppress ForbiddenError
						if(err instanceof errors.ForbiddenError)
							return null;

						// re-throw all other errors
						return Promise.reject(err);
					});
				}), function(p){ return !!p; });

			})


			// set the total on the array
			.then(function(projects){
				projects.total = results.total;
				return projects;
			});
		});


	});
};


Projects.prototype.get = function(conn, id, user) {
	if(!user) return Promise.reject(new errors.UnauthorizedError());

	// get project data
	return r.table('projects').get(id).run(conn).then(function(data) {
		if(!data) return Promise.reject(new errors.NotFoundError('Project not found.'));

		// get the cycle
		return cycles.get(conn, data.cycle_id, user).then(function(cycle) {
			if(!cycle) return Promise.reject(new errors.NotFoundError('Cycle not found.'));

			// instanciate the Project
			return new Project(conn, data, cycle, user).then(function(project){

				// check authorizations
				if(!project.authorizations['project:read'])
					return Promise.reject(new errors.ForbiddenError());

				// return as a Project
				return project;
			});
		});
	});
};


Projects.prototype.create = function(conn, data, user) {
	return Project.create(conn, data, user);
};


module.exports = Projects;
