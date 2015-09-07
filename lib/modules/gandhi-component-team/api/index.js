'use strict';

var _ = require('lodash');

module.exports = function(router, resources){
	resources.components['start'] = {
		stage: {
			read: function(conn, stage) {
				return stage;
			},
			write: function(conn, data, stage) {
				return _.merge({}, stage, data);
			}
		},
		content: {
			read: function(conn, content, stage) {
				return content;
			},
			write: function(conn, data, content, stage) {
				return data;
			}
		}
	}
}
