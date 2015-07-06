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

	// obey boolean override
	return r.branch(
		user.typeOf().eq('BOOL'), 
		user,

		// obey string override
		r.branch(
			user.typeOf().eq('STRING'), 
			cycle('roles')(user).default(false),

			// look up project assignment
			cycle('roles')(project('assignments')(user('id'))('role_id')).default(

				// look up cycle assignment
				cycle('roles')(cycle('assignments')(user('id'))('role_id')).default(

					// default to false
					false
				)
			)
		)
	);
}

// RQL (BOOLEAN) for a given permission
function hasPermission(permissions, role, events) {
	var constraints = permissions(role('id'));

	// forced boolean
	return r.branch(
		role.typeOf().eq('BOOL'),
		role,

		// boolean permissions
		r.branch(
			constraints.default(role.eq(true)).typeOf().eq('BOOL'),
			constraints.default(role.eq(true)),

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
	);
}

// RQL (OBJECT) returns processed permissions (authorizations) group
// requires project('events')
function processPermissions(group, project, role) {
	return group.coerceTo('array').map(function(p){
		return [p.nth(0), hasPermission(p.nth(1), role, project('events'))];
	}).coerceTo('object');
}

// ----------------------------------------

// RQL (BOOLEAN) for a given conditions array
// requires project('values')
function meetsConditions(conditions, project) {
	return r.branch(conditions.count().eq(0), false, conditions.map(function(group){
		return r.branch(group.count().eq(0), false, group.map(function(condition){

			function processCondition() {

				// date triggers
				return r.branch(
					condition('name').eq('date'),
					r.now().toEpochTime().gt(condition('options')('timestamp').default(0)),

					// project_status triggers
					r.branch(
						condition('name').eq('project_status'),
						project('status_id').eq(condition('options')('status_id').default('')).not().not(),

						// content_status triggers
						r.branch(
							condition('name').eq('content_status'),
							project('contents')(condition('options')('content_id').default(''))('status_id').default('none').eq(condition('options')('status_id').default('')).not().not(),

							// export triggers
							r.branch(
								condition('name').eq('export'),

								// eq
								r.branch(
									condition('options')('op').default('eq').eq('eq'),
									project('contents')(condition('options')('content_id').default(''))('exports')(condition('options')('export_id').default('')).default(null).eq(condition('options')('value')),

									// gt
									r.branch(
										condition('options')('op').eq('eq'),
										project('contents')(condition('options')('content_id').default(''))('exports')(condition('options')('export_id').default('')).default(null).gt(condition('options')('value')),

										// matches
										r.branch(
											condition('options')('op').eq('matches'),
											project('contents')(condition('options')('content_id').default(''))('exports')(condition('options')('export_id').default('')).default('').do(function(value){
												return r.branch( value.typeOf().eq('STRING'), value.match(condition('options')('value').default('')).not().not(), false);
											}),

											// contains
											r.branch(
												condition('options')('op').eq('contains'),
												project('contents')(condition('options')('content_id').default(''))('exports')(condition('options')('export_id').default('')).default([]).do(function(value){
													return r.branch( value.typeOf().eq('ARRAY'), value.contains(condition('options')('value').default('')).not().not(), false);
												}),

												// default
												false
											)
										)
									)
								),

								// default
								false
							)
						)
					)
				);
			}

			// invert the result of the condition?
			return r.branch(
				condition('invert').default('false').eq(true),
				processCondition().not(),
				processCondition()
			);

		}).reduce(function(a, b){ return a.and(b); }));
	}).reduce(function(a, b){ return a.or(b); }));
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

// RQL (OBJECT) returns authorizations
// requires project('$permissions:true')
// requires project('$permissions:false')
// requires project('$permissions')
function getAuthorizations(project, role) {
	return r.branch(
		role.eq(true), 
		project('$permissions:true').default({}),

		r.branch(
			role.eq(false), 
			project('$permissions:false').default({}),

			project('$permissions')(role('id')).default(project('$permissions:false').default({}))
		)
	);
}

// ----------------------------------------

function addContext(user, project, cycle) {
	cycle = cycle || r.table('cycles').get(project('cycle_id'));

	// cache the cycle for the query
	return cycle.do(function(cycle){

		return project

		// merge exports
		.merge(function(project){
			return {
				exports: project('contents').coerceTo('array').map(function(c){
					return [c.nth(0), c.nth(1)('exports')];
				}).coerceTo('object')
			};
		})

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
			return { authorizations: getAuthorizations(project, project('role')) };
		})

		// strip out caches
		.without([
			'$permissions:true',
			'$permissions:false',
			'$permissions'
		]);

	});
}

function removeContext(project) {
	return project.without(['exports','role','status','authorizations']);
}

function processWriteHooks(project, cycle) {
	cycle = cycle || r.table('cycles').get(project('cycle_id'));

	// cache the cycle for the query
	return cycle.do(function(cycle){

		return project

		// process triggers
		.merge(function(project){
			return { events: r.literal(processTriggers(project, cycle)) };
		})

		// merge authorizations
		.merge(function(project){
			return {
				'$permissions:true': processPermissions(cycle('permissions'), project, r.expr(true)),
				'$permissions:false': processPermissions(cycle('permissions'), project, r.expr(false)),
				'$permissions': cycle('roles').coerceTo('array').map(function(p){
					return [p.nth(0), processPermissions(cycle('permissions'), project, p.nth(1))];
				}).coerceTo('object')
			};
		});
	});
}

function stripCollections(project) {
	return r.branch(
		project,
		project.without(['assignments','invitations','contents']),
		project
	);
}

module.exports = {
	addContext: addContext,
	removeContext: removeContext,

	stripCollections: stripCollections,
	processWriteHooks: processWriteHooks,

	getRole: getRole,
	hasPermission: hasPermission,
	processPermissions: processPermissions,
	processTriggers: processTriggers
};
