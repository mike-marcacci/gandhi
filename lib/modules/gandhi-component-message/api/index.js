'use strict';

var _ = require('lodash');

module.exports = function(router, resources){
	resources.components['message'] = {
		create: function(data, id, role, project, cycle, callback) {
			return callback(null, data);
		},
		read: function(id, role, project, cycle, callback) {
			return callback(null, project.flow[id]);
		},
		update: function(data, id, role, project, cycle, callback) {
			return callback(null, data);
		},
		destroy: function(id, role, project, cycle, callback) {
			return callback(null, project.flow[id]);
		}
	}
}
