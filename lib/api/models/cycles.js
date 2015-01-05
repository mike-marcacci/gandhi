'use strict';

var r = require('rethinkdb');

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

// ----------------------------------------

function build(cycle) {
	return cycle;
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
