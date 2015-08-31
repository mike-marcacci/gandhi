'use strict';

var _ = require('lodash');
var Handlebars = require('handlebars');

// var e = require('../../../api/errors.js');

module.exports = function(router, resources){
	resources.components.message = {
		stage: {
			read: function(conn, stage) {
				return stage;
			},
			write: function(conn, input, stage) {
				var result = _.merge({}, stage, input);

				// make sure permissions are listed
				if(result.component && result.component.permissions) {

					// read
					result.component.permissions.read  = ( (input.component && input.component.permissions && input.component.permissions.read) ?
						input.component.permissions.read
						: result.component.permissions.read ) || {};
				}

				return result;
			}
		},
		content: {
			read: function(conn, content, stage) {
				var project = content.parent;
				var cycle = stage.parent;

				if(!content.authorizations.read) return _.extend({}, content, {data: {}});

				if(stage.component.options.message)
					content.data.message = Handlebars.compile(stage.component.options.message)({ project: project, cycle: cycle, stage: stage });

				return content;
			},
			write: function(conn, data, content, stage) {
				return content;
			}
		}
	};
};
