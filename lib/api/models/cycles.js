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

function meetsDateConditions(conditions) {
	return r.branch(
		conditions.typeOf().eq('BOOL'),
		conditions,
		conditions.map(function(group){
			return group.map(function(condition){
				return r.branch(
					condition('name').eq('date'),

					// date triggers
					r.branch(
						condition('options')('mode').eq('before'),
						r.now().toEpochTime().lt(condition('options')('timestamp').default(0)),
						r.now().toEpochTime().gt(condition('options')('timestamp').default(0))
					),

					// default to false
					false
				);
			}).reduce(function(a, b){ return a.and(b); });
		}).reduce(function(a, b){ return a.or(b); })
	);
}

// ----------------------------------------

function read(user, cycle) {
	return cycle

	// merge role
	.merge(function(cycle){
		return { role: getRole(user, cycle) };
	})

	// calculate whether cycle is open or not
	.merge(function(cycle){

		var role_id = r.branch(
			cycle('role').typeOf().eq('BOOL'),
			cycle('defaults')('role_id'),
			cycle('role')('id')
		);

		// calculate permission requirements
		var constraints = cycle('permissions')('create')(role_id).default(false);

		// no permissions for role
		return {open: r.branch(
			constraints.typeOf().eq('BOOL'),
			constraints,

			// always closed/never open permissions
			r.branch(
				constraints('open').default(false).eq(false).or(constraints('close').default(true).eq(true)),
				false,

				// closed based on events
				r.branch(
					constraints('close').ne(false).and(constraints('close').filter(function(trigger){
						return meetsDateConditions(cycle('triggers')(trigger)('conditions').default(false));
					}).count().gt(0)),
					false,

					// open based on events
					constraints('open').eq(true).or(constraints('open').filter(function(trigger){
						return meetsDateConditions(cycle('triggers')(trigger)('conditions').default(false));
					}).count().gt(0))
				)
			)
		)};
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
	read: read,
	visibleTo: visibleTo,
	assignableBy: assignableBy,
	sanitize: sanitize
};
