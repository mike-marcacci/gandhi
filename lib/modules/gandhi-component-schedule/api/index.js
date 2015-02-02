'use strict';

var r = require('rethinkdb');
var _ = require('lodash');

module.exports = function(router, resources){
	resources.components.schedule = {
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

		// create: function(data, id, role, permissions, project, cycle, callback) {
		// 	return callback(null, data);
		// },
		// read: function(id, role, permissions, project, cycle, callback) {
		// 	return callback(null, project.flow[id]);
		// },
		// update: function(data, id, role, permissions, project, cycle, callback) {

		// 	if(!data.data || !data.data.reservation)
		// 		return callback(null, data);

		// 	// reserve time slot with the cycle
		// 	resources.db.acquire(function(err, conn) {
		// 		if(err)
		// 			return next(err);

		// 		// insert the cycle
		// 		r.db('gandhi').table('cycles').getAll(cycle.id).replace(function(row){
		// 			var u = {flow: {}};
		// 			u.flow[id] = {component:{options:{assignments:{}}}};
		// 			u.flow[id].component.options.assignments[data.data.reservation] = project.id;

		// 			var w = row('flow')(id)('component')('options')('assignments').coerceTo('array')
		// 			.filter(function(assignment){
		// 				return assignment.nth(1).eq(project.id);
		// 			})
		// 			.map(function(a){
		// 				var u = {flow: {}};
		// 				u.flow[id] = {component:{options:{assignments:[a.nth(0).coerceTo('string')]}}};
		// 				return u;
		// 			});

		// 			return row.without(w).merge(u);
		// 		}).run(conn, function(err, result){
		// 			resources.db.release(conn);

		// 			if(err)
		// 				return callback(err);

		// 			return callback(null, data);
		// 		});
		// 	});

		// },
		// destroy: function(id, role, permissions, project, cycle, callback) {
		// 	return callback(null, project.flow[id]);
		// }
	};
};
