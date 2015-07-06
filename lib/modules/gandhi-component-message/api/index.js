'use strict';

var _ = require('lodash');
var Handlebars = require('handlebars');

// var e = require('../../../api/errors.js');

module.exports = function(router, resources){
	resources.components.message = {
		stage: {
			get: function(stage, cycle) {
				return stage;
			},
			update: function(input, stage, cycle) {
				var result = _.merge({}, stage, input);

				// make sure permissions are listed
				if(result.component && result.component.permissions) {
					result.component.permissions.read = result.component.permissions.read || {};
				}

				return result;
			},
			save: function(input, stage, cycle) {
				
				// make sure permissions are listed
				input.component.permissions.read = input.component.permissions.read || {};

				return input;
			}
		},
		content: {
			get: function(content, stage, project, cycle) {
				if(!content.authorizations.read) return _.extend({}, content, {data: {}});

				if(stage.component.options.message)
					content.data.message = Handlebars.compile(stage.component.options.message)({ project: project, cycle: cycle, stage: stage });

				return content;
			},
			update: function(data, content, stage, project, cycle) {
				return content;
			},
			save: function(data, content, stage, project, cycle) {
				return content;
			}
		}
	};
};
