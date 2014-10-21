'use strict';

var _ = require('lodash');

module.exports = function(router, resources){
	resources.components['form'] = {
		create: function(data, id, user, project, cycle, conn, callback) {
			return callback(null, data);
		},
		read: function(id, user, project, cycle, conn, callback) {
			return callback(null, project.flow[id]);
		},
		update: function(data, id, user, project, cycle, conn, callback) {
			return callback(null, data);
		},
		destroy: function(id, user, project, cycle, conn, callback) {
			return callback(null, project.flow[id]);
		}
	}
}
