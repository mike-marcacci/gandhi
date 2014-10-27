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
	return {};
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
	hasPermission: hasPermission
}