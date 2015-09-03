'use strict';

var Promise      = require('bluebird');
var Handlebars   = require('handlebars');
var Notification = require('../../api/models/Notification');

var Users = require('../../api/collections/Users');
var users = new Users();

module.exports = function(router, resources) {
	resources.actions.notify = function(conn, project, options) {
		var roleIds = options.role_ids || [];

		// get all project assignments
		return Promise.settle(Object.keys(project.assignments.data).map(function(userId) {
			var assignment = project.assignments.data[userId];

			// only notify specified roles
			if(roleIds.indexOf(assignment.role_id) === -1)
				return;

			// create a notification
			return Notification.create(conn, {
				user_id: userId,
				subject: options.subject,

				// TODO: first pull user from db to get name, etc
				content: Handlebars.compile(options.template || '')({ project: project, cycle: project.cycle })
			}, true)

			.then(function(notification){
				return users.get(conn, notification.user_id, true)
				.then(function(user){

					// send mail in the background
					resources.mail({
						to: user.email,
						subject: notification.subject,
						html: notification.content
					});

				});
			});
		}));
	};
};
