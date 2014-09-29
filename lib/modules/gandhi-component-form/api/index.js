'use strict';

var _ = require('lodash');

module.exports = function(router, resources){
	resources.components['form'] = {
		create: function(data, id, role, permissions, project, cycle, callback) {
			return callback(null, data);
		},
		read: function(id, role, permissions, project, cycle, callback) {
			return callback(null, project.flow[id]);
		},
		update: function(data, id, role, permissions, project, cycle, callback) {
			return callback(null, data);
		},
		destroy: function(id, role, permissions, project, cycle, callback) {
			return callback(null, project.flow[id]);
		}
	}
}
