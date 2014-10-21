'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(router, resources){
	resources.components['review'] = {
		create: function(data, id, user, project, cycle, conn, callback) {
			return callback(null, data);
		},
		read: function(id, user, project, cycle, conn, callback) {
			return callback(null, project.flow[id]);
		},
		update: function(data, id, user, project, cycle, conn, callback) {

			if(!cycle.flow[id] || !cycle.flow[id].component.options.ranking || !data.data || !data.data[user.id] || !data.data[user.id].ranking || !data.data[user.id].ranking.comment)
				return callback(null, data);

			// update rankings on all included projects
			var d = {flow:{}}; d.flow[id] = {}; d.flow[id].data = {}; d.flow[id].data[user.id] = {ranking: {comment: data.data[user.id].ranking.comment}}

			r.table('projects').getAll(r.args(data.data[user.id].ranking.comment)).update(d, {returnChanges: true}).run(conn, function(err, result){
				resources.db.release(conn);

				if(err)
					return callback(err);
				
				// TODO: calculate total ranking score

				return callback(null, data);
			});


		},
		destroy: function(id, user, project, cycle, conn, callback) {
			return callback(null, project.flow[id]);
		}
	}
}
