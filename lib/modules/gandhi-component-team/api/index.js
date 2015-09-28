'use strict';

var _ = require('lodash');
var Handlebars = require('handlebars');

module.exports = function(router, resources){
	resources.components.team = {
		stage: {
			read: function(conn, stage) {
				return stage;
			},
			write: function(conn, input, stage) {
				var result = _.merge({}, stage, input);

				// make sure permissions are listed
				if(result.component && result.component.permissions) {

					// assignments
					result.component.permissions.assignments  = ( (input.component && input.component.permissions && input.component.permissions.assignments) ?
						input.component.permissions.assignments
						: result.component.permissions.assignments ) || {};

					// invitations
					result.component.permissions.invitations = ( (input.component && input.component.permissions && input.component.permissions.invitations) ?
						input.component.permissions.invitations :
						result.component.permissions.invitations ) || {};
				}

				return result;
			}
		},
		content: {
			read: function(conn, content, stage) {
				var project = content.parent;
				var cycle = stage.parent;


				// Note: it is an extremely bad idea to modify "exports" when reading, because
				// trigger comparisons and server-side template rendering do not use this
				// function. Instead, only export durable values, calculating them on write.
				//
				// If an exported value is time-dependent, schedule a refresh (update with {})
				// at the desired time.


				// compile instructions
				if(stage.component.options.instructions)
					try { content.data.instructions = Handlebars.compile(stage.component.options.instructions)({ project: project, cycle: cycle, stage: stage }); } catch (e) {}


				return content;
			},
			write: function(conn, input, content, stage) {
				return input;
			}
		}
	};
};
