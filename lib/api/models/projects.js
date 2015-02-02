'use strict';

var r = require('rethinkdb');

// RQL POLYFILL
// ------------
//
// ```js
// return obj(r.args(p));
// ```
//
// The following method will hopefully be replaced by
// the line above. For more information, see:
// https://github.com/rethinkdb/rethinkdb/issues/3267
function get(p, obj) {
	var count = p.count();
	return r.branch(count.eq(0),
		null,
		r.branch(count.eq(1),
			obj(p.nth(0)),
			r.branch(count.eq(2),
				obj(p.nth(0))(p.nth(1)),
				r.branch(count.eq(3),
					obj(p.nth(0))(p.nth(1))(p.nth(2)),
					r.branch(count.eq(4),
						obj(p.nth(0))(p.nth(1))(p.nth(2))(p.nth(3)),
						r.branch(count.eq(5),
							obj(p.nth(0))(p.nth(1))(p.nth(2))(p.nth(3))(p.nth(4)),
							r.error('Pointer exceeded max depth of 5.')
						)
					)
				)
			)
		).default(null)
	);
}

// RQL (OBJECT | BOOLEAN) get the "role" object for a user or false
function getRole(user, project, cycle) {
	return cycle('roles')(project('assignments')(user('id'))('role_id').default(cycle('assignments')(user('id'))('role_id'))).default(user('admin'));
}

// RQL (BOOLEAN) for a given permission
function hasPermission(permissions, role, events) {
	var constraints = permissions(role('id')).default(false);

	// forced boolean
	return r.branch(
		role.typeOf().eq('BOOL'),
		role,

		// boolean permissions
		r.branch(
			constraints.typeOf().eq('BOOL'),
			constraints.default(false),

			// always closed/never open permissions
			r.branch(
				constraints('open').default(false).eq(false).or(constraints('close').default(true).eq(true)),
				false,

				// closed based on events
				r.branch(
					constraints('close').ne(false).and(constraints('close').filter(function(event){
						return events(event)(0)('value').default(false);
					}).count().gt(0)),
					false,

					// open based on events
					constraints('open').eq(true).or(constraints('open').filter(function(event){
						return events(event)(0)('value').default(false);
					}).count().gt(0))
				)
			)
		)
	);
}

// RQL (OBJECT) returns processed permissions (authorizations) group
// requires project('role')
// requires project('events')
function processPermissions(group, project) {
	return group.coerceTo('array').map(function(p){
		return [p.nth(0), hasPermission(p.nth(1), project('role'), project('events'))];
	}).coerceTo('object');
}

// ----------------------------------------


// BQL (OBJECT) returns exported values
function processExports(project, cycle) {
	return cycle('exports').coerceTo('array').map(function(e){
		return [e.nth(0), get(e.nth(1)('path'), project)];
	}).coerceTo('object');
}

// RQL (BOOLEAN) for a given conditions array
// requires project('values')
function meetsConditions(conditions, project) {
	return conditions.map(function(group){
		return group.map(function(condition){

			function processCondition() {

				// date triggers
				return r.branch(
					condition('name').eq('date'),
					r.now().toEpochTime().gt(condition('options')('timestamp').default(0)),

					// status triggers
					r.branch(
						condition('name').eq('status'),
						project('status_id').eq(condition('options')('status_id').default('')).not().not(),

						// content_status triggers
						r.branch(
							condition('name').eq('content_status'),
							project('contents')(condition('options')('content_id').default(''))('status_id').default('none').eq(condition('options')('status_id').default('')).not().not(),

							// value_regex triggers
							r.branch(
								condition('name').eq('value_regex'),
								project('values')(condition('options')('value_id').default('')).default('').match(condition('options')('regex').default('')).not().not(),

								// default
								false
							)
						)
					)
				);
			}

			// invert the result of the condition?
			return r.branch(
				condition('invert').default('false'),
				processCondition().not(),
				processCondition()
			);

		}).reduce(function(a, b){ return a.and(b); });
	}).reduce(function(a, b){ return a.or(b); });
}

// RQL (OBJECT) returns processed events object
// requires project('values')
function processTriggers(project, cycle) {
	return cycle('triggers').coerceTo('array').map(function(t){
		var k = t.nth(0);
		var base = project('events')(k).default([]);
		var value = meetsConditions(t.nth(1)('conditions'), project);

		// only run once for single triggers
		var test = r.branch(
			t.nth(1)('single').default(false),
			true,
			value
		);

		return [ k, r.branch(
			base.count().gt(0).and(base.nth(0)('value').eq(test)),
			base,
			base.insertAt(0, {value: value, timestamp: r.now().toEpochTime()})
		)];

	}).coerceTo('object');
}

// ----------------------------------------

function read(user, project, cycle) {
	cycle = cycle || r.table('cycles').get(project('cycle_id'));

	return project

	// merge role (allow override)
	.merge(function(project){
		return { role: getRole(user, project, cycle) };
	})

	// merge status details
	.merge(function(project){
		return { status: cycle('statuses')(project('status_id')).default(null) };
	})

	// merge authorizations
	.merge(function(project){
		return { authorizations: processPermissions(cycle('permissions'), project) };
	});
}

function write(project, cycle) {
	cycle = cycle || r.table('cycles').get(project('cycle_id'));

	return project

	// merge exported values
	.merge(function(project){
		return { values: r.literal(processExports(project, cycle)) };
	})

	// process triggers
	.merge(function(project){
		return { events: r.literal(processTriggers(project, cycle)) };
	});
}

function sanitize(project) {
	return r.branch(
		project,
		project.without(['assignments','invitations','contents']),
		project
	);
}

module.exports = {
	getRole: getRole,
	hasPermission: hasPermission,
	processPermissions: processPermissions,
	processExports: processExports,
	processTriggers: processTriggers,
	read: read,
	write: write,
	sanitize: sanitize
};
