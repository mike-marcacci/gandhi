'use strict';

var _ = require('lodash');

module.exports = function(router, resources){
	resources.components['start'] = {
		stage: {
			get: function(stage, cycle) {
				return stage;
			},
			patch: function(data, stage, cycle) {
				return _.extend({}, stage, data);
			},
			put: function(data, stage, cycle) {
				return data;
			},
			delete: function(stage, cycle) {
				return stage
			}
		},
		content: {
			get: function(content, stage, project, cycle) {
				return content;
			},
			patch: function(data, content, stage, project, cycle) {
				return _.extend({}, content, data);
			},
			put: function(data, content, stage, project, cycle) {
				return data;
			},
			delete: function(content, stage, project, cycle) {
				return content;
			}
		}
	}
}
