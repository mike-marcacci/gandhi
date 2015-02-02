'use strict';

var _ = require('lodash');

module.exports = function(router, resources){
	resources.components['message'] = {
		stage: {
			get: function(stage, cycle) {
				return stage;
			},
			update: function(data, stage, cycle) {
				return data;
			},
			save: function(data, stage, cycle) {
				return data;
			}
		},
		content: {
			get: function(content, stage, project, cycle) {
				return content;
			},
			update: function(data, content, stage, project, cycle) {
				return data;
			},
			save: function(data, content, stage, project, cycle) {
				return data;
			}
		}
	}
}
