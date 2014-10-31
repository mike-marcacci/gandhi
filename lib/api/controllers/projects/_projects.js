var r = require('rethinkdb');

// RQL (OBJECT | FALSE) get the "role" object for a user or false
function getRole(userId, project, cycle) {
	return cycle('roles')(project('assignments')(userId)('role').default(cycle('assignments')(userId)('role'))).default(false);
}

// RQL (BOOLEAN) for a given permission
function hasPermission(role, permissions, project) {
	var constraints = permissions(role('id'));

	// no permissions for role
	return r.branch(
		role.eq(false).or(role.hasFields('id').not()).or(permissions.hasFields(role('id')).not()),
		false,

		// boolean permissions
		r.branch(
			constraints.eq(true).or(constraints.default(false).eq(false)),
			constraints.default(false),

			// always closed/never open permissions
			r.branch(
				constraints('open').default(false).eq(false).or(constraints('close').default(true).eq(true)),
				false,

				// closed based on events
				r.branch(
					constraints('close').ne(false).and(constraints('close').filter(function(event){
						return project('events')(event)(0)('value').default(false);
					}).count().gt(0)),
					false,

					// open based on events
					constraints('open').eq(true).or(constraints('open').filter(function(event){
						return project('events')(event)(0)('value').default(false);
					}).count().gt(0))
				)
			)
		)
	);
}

function getExportedValues(project, cycle) {
	return cycle('exports').coerceTo('array').map(function(e){
		// return row('data')(r.args(row('pointer'));
		// ------------------------------------------
		// The following query will hopefully be replaced by
		// the line above. For more information, see:
		// https://github.com/rethinkdb/rethinkdb/issues/3267
		var p = e.nth(1)('pointer');
		var count = p.count();
		return [e.nth(0), r.branch(count.eq(0),
			null,
			r.branch(count.eq(1),
				project(p.nth(0)),
				r.branch(count.eq(2),
					project(p.nth(0))(p.nth(1)),
					r.branch(count.eq(3),
						project(p.nth(0))(p.nth(1))(p.nth(2)),
						r.branch(count.eq(4),
							project(p.nth(0))(p.nth(1))(p.nth(2))(p.nth(3)),
							r.branch(count.eq(5),
								project(p.nth(0))(p.nth(1))(p.nth(2))(p.nth(3))(p.nth(4)),
								r.error('Pointer exceeded max depth of 5.')
							)
						)
					)
				)
			).default(null)
		)];
	}).coerceTo('object');
}

// // RQL (OBJECT) returns a query for updating/creating a project with events
// function buildEvents(project, cycle) {
// 	project.events = project.events || {};
// 	var events = {};

// 	_.each(cycle.events, function(event, id){
// 		var value = event.conditions.some(function(conditions){
// 			return conditions.every(function(condition){
// 				var tester = resources.testers[condition.name]

// 				if(!tester)
// 					return false;

// 				return tester(condition.options, project);
// 			});
// 		});

// 		// nothing's changed
// 		if(project.events[id] && project.events[id][0] && project.events[id][0].value === value)
// 			return;

// 		// TODO: process listeners

// 		// prepend the event to its list
// 		events[id] = r.row('events')(id).default([]).prepend({
// 			value: value,
// 			date: r.now()
// 		});
// 	});

// 	return events;
// }

module.exports = {
	getRole: getRole,
	getExportedValues: getExportedValues,
	hasPermission: hasPermission
}