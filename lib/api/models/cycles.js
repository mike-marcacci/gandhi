'use strict';

var r = require('rethinkdb');

// RQL (BOOLEAN) returns whether or not an assignment
// or invitation is visible to a user of the provided role
//
// Please note that this does not check for the project
// for read authorization
function visibleTo(subject, role, cycle) {
	return role.eq(true).or(cycle('roles')(subject('role_id'))('visible')(role('id')).default(false));
}

// RQL (BOOLEAN) returns whether or not an assignment
// or invitation is assignable by a user of the provided role
//
// Please note that this does not check for the project
// for write authorization or an assignment collision
function assignableBy(subject, role, cycle) {
	return role.eq(true).or(cycle('roles')(subject('role_id'))('assignable')(role('id')).default(false));
}

// RQL (OBJECT | BOOLEAN) get the "role" object for a user or false
function getRole(user, cycle) {

	// obey boolean override
	return r.branch(
		user.typeOf().eq('BOOL'), 
		user,

		// obey string override
		r.branch(
			user.typeOf().eq('STRING'), 
			cycle('roles')(user).default(false),

			// look up assignment
			cycle('roles')(cycle('assignments')(user('id'))('role_id')).default(

				// use default role
				cycle('roles')(cycle('defaults')('role_id'))
			)
		)
	);
}

// ----------------------------------------

function addContext(user, cycle) {
	return cycle

	// merge role
	.merge(function(cycle){
		return { role: getRole(user, cycle) };
	})

	// merge open
	.merge(function(cycle){
		var now = r.now().toEpochTime();
		var open = cycle('options')('open').default(null);
		var close = cycle('options')('close').default(null);
		return {open: r.and(
			r.or(open.eq(null), open.lt(now)),
			r.or(close.eq(null), close.gt(now))
		)};
	})

};

function removeContext(cycle) {
	return cycle.without(['role','open']);
}

function processWriteHooks(cycle) {
	return cycle;
}

function stripCollections(cycle) {
	return r.branch(
		cycle,
		cycle.without(['statuses','roles','assignments','invitations','triggers','stages']),
		cycle
	);
}

module.exports = {

	addContext: addContext,
	removeContext: removeContext,

	processWriteHooks: processWriteHooks,
	stripCollections: stripCollections,

	visibleTo: visibleTo,
	assignableBy: assignableBy
};
