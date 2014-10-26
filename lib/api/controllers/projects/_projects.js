var r = require('rethinkdb');

// get the "role" object for a user or false
function getRole(user_id, project, cycle) {
	return cycle('roles')(project('assignments')(user_id)('role').default(cycle('assignments')(user_id)('role'))).default(false);
}

// return Boolean based on permissions permissions(roleId)
function hasPermission(role, permissions, project) {
	var roleId = role('id').default(false);

	// no permissions for role
	return r.branch(
		role.eq(false).or(roleId.eq(false)).or(permissions.hasFields(roleId).not()),
		false,

		// boolean permissions
		r.branch(
			permissions(roleId).typeOf().eq('BOOLEAN'),
			permissions(roleId),

			// always closed/never open permissions
			r.branch(
				permissions(roleId)('open').default(false).eq(false).or(permissions(roleId)('close').default(true).eq(true)),
				false,
				// closed based on events
				r.branch(
					permissions(roleId)('close').ne(false).and(permissions(roleId)('close').filter(function(event){
						return project('events')(event)(0)('value').default(false);
					}).count().gt(0)),
					false,

					// open based on events
					permissions(roleId)('open').eq(true).or(permissions(roleId)('open').filter(function(event){
						return project('events')(event)(0)('value').default(false);
					}).count().gt(0))
				)
			)
		)
	);
}

module.exports = {
	getRole: getRole,
	hasPermission: hasPermission
}