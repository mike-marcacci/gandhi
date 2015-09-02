'use strict';

var Promise      = require('bluebird');
var Handlebars   = require('handlebars');
var Notification = require('../../api/models/Notification');

module.exports = function(router, resources) {
	resources.actions.notify = function(conn, project, options) {
		var roleIds = options.role_ids || [];

		// get all project assignments
		return Promise.all(Object.keys(project.assignments.data).map(function(userId) {
			var assignment = project.assignments.data[userId];

			// only notify specified roles
			if(roleIds.indexOf(assignment.role_id) === -1)
				return;

			// notify the user
			return Notification.create(conn, {
				user_id: userId,
				subject: options.subject,

				// TODO: first pull user from db to get name, etc
				content: Handlebars.compile(options.template || '')({ project: project, cycle: project.cycle })
			}, true);
		}));
	};
};
