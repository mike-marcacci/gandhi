'use strict';

var r = require('rethinkdb');
var _ = require('lodash');

module.exports = function(router, resources){
	resources.components.schedule = {
		create: function(data, id, user, project, cycle, conn, callback) {
			return callback(null, data);
		},
		read: function(id, user, project, cycle, conn, callback) {
			return callback(null, project.flow[id]);
		},
		update: function(data, id, user, project, cycle, conn, callback) {

			if(!data.data || !data.data.reservation)
				return callback(null, data);

			// reserve time slot with the cycle
			r.db('gandhi').table('cycles').getAll(cycle.id).replace(function(row){
				var u = {flow: {}};
				u.flow[id] = {component:{options:{assignments:{}}}};
				u.flow[id].component.options.assignments[data.data.reservation] = project.id;

				var w = row('flow')(id)('component')('options')('assignments').coerceTo('array')
				.filter(function(assignment){
					return assignment.nth(1).eq(project.id);
				})
				.map(function(a){
					var u = {flow: {}};
					u.flow[id] = {component:{options:{assignments:[a.nth(0).coerceTo('string')]}}};
					return u;
				});

				return row.without(w).merge(u);
			}).run(conn, function(err, result){

				if(err)
					return callback(err);

				return callback(null, data);
			});

		},
		destroy: function(id, user, project, cycle, conn, callback) {
			return callback(null, project.flow[id]);
		}
	};
};
