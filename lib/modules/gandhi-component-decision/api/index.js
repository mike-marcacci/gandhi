'use strict';

var r = require('rethinkdb');
var _ = require('lodash');

module.exports = function(router, resources){
	resources.components['decision'] = {
		create: function(data, id, user, project, cycle, conn, callback) {
			return callback(null, data);
		},
		read: function(id, user, project, cycle, conn, callback) {
			return callback(null, project.flow[id]);
		},
		update: function(data, id, user, project, cycle, conn, callback) {
			if(!data.data || !data.data.resolution)
				return callback(null, data);

			r.table('projects').get(project.id).update({
				status: data.data.resolution
			}).run(conn, function(err, res){
				return callback(err, data);
			})

		},
		destroy: function(id, user, project, cycle, conn, callback) {
			return callback(null, project.flow[id]);
		}
	}
}
