'use strict';

var r = require('rethinkdb');
var projects = require('./projects.js');

// RQL (BOOLEAN) returns whether or not an assignment
// or invitation is visible to a user of the provided role
//
// Please note that this does not check for the project
// for read authorization
function visibleTo(subject, role, cycle) {
	return role.eq(true).or(cycle('roles')(subject('role'))('visible')(role('id')).default(false));
}

// RQL (BOOLEAN) returns whether or not an assignment
// or invitation is assignable by a user of the provided role
//
// Please note that this does not check for the project
// for write authorization or an assignment collision
function assignableBy(subject, role, cycle) {
	return role.eq(true).or(cycle('roles')(subject('role'))('assignable')(role('id')).default(false));
}

// RQL (OBJECT | BOOLEAN) get the "role" object for a user or false
function getRole(user, cycle) {
	return cycle('roles')(cycle('assignments')(user('id'))('role')).default(
		r.branch(
			user('admin'),
			true,
			cycle('roles')(cycle('defaults')('role'))
		)
	);
}


// ----------------------------------------



// RQL (BOOLEAN) for a given conditions array
// Note: ONLY processes date triggers!!!
function meetsConditions(conditions) {
	return conditions.map(function(group){
		return group.map(function(condition){

			// date triggers
			return r.branch(
				condition('name').eq('date'),
				r.branch(
					condition('options')('mode').eq('before'),
					r.now().toEpochTime().lt(condition('options')('timestamp').default(0)),
					r.now().toEpochTime().gt(condition('options')('timestamp').default(0))
				),

				// default
				false
			);

		}).reduce(function(a, b){ return a.and(b); });
	}).reduce(function(a, b){ return a.or(b); });
}

// RQL (OBJECT) returns processed events object
// requires project('values')
function processTriggers(cycle) {
	return cycle('triggers').coerceTo('array').map(function(t){
		var k = t.nth(0);
		var value = meetsConditions(t.nth(1)('conditions'));

		// simulate an events object
		return [ k, [{value: value, date: r.now().toEpochTime()}] ];

	}).coerceTo('object');
}

// ----------------------------------------

function build(user, cycle) {
	return cycle

	// merge role
	.merge(function(cycle){
		return { role: getRole(user, cycle) };
	})

	// merge authorizations
	.merge(function(cycle){


		// TODO: Don't be stupid here
		//   1. if role is unassigned, use default role (even if admin)
		//   2. get triggers for permissions.create
		//   3. calculate triggers responsible for permissions.create
		//   4. calculate authorization

		// get simulated events object
		var events = processTriggers(cycle);

		return { open: projects.hasPermission(cycle('permissions')('create'), cycle('role'), events) };
	});
}

function sanitize(cycle) {
	return r.branch(
		cycle,
		cycle.without(['statuses','roles','assignments','invitations','triggers','stages','exports']),
		cycle
	);
}

module.exports = {
	build: build,
	visibleTo: visibleTo,
	assignableBy: assignableBy,
	sanitize: sanitize
};
