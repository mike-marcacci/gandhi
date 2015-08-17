'use strict';

var _ = require('lodash');

module.exports = function(router, resources){
	resources.components['start'] = {
		stage: {
			read: function(stage) {
				return stage;
			},
			write: function(data, stage) {
				return _.merge({}, stage, data);
			}
		},
		content: {
			read: function(content, stage) {
				return content;
			},
			write: function(data, content, stage) {
				return data;
			}
		}
	}
}
