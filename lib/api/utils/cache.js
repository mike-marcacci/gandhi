'use strict';

var r = require('rethinkdb');
var projectModel = require('../models/projects.js');

// purge and reevaluate cache for all projects
module.exports = function(conn, purge) {







	// purge and reevaluate cache for all projects
	if(purge) return r.table('projects').replace(function(project){
		return projectModel.processWriteHooks(project);
	}, {nonAtomic: true}).run(conn);







	// purge and reevaluate expired cache for projects
	return r.now().toEpochTime().do(function(now){

		// get all cycles
		return r.table('cycles').map(function(cycle){
			return {
				cycle: cycle,

				// get the most recently fired date trigger
				threshold: cycle('triggers').coerceTo('array').map(function(kv){
					return kv(1)('conditions').map(function(condition){
						return condition.filter(function(rule){
							return rule('name').eq('date').and(
							rule('options')('timestamp').lt(now));
						}).map(function(rule){
							return rule('options')('timestamp');
						}).max().default(null);
					}).max();
				}).max()
			};
		})

		// filter out any without a date trigger
		.filter(function(result){
			return result('threshold').not().not();
		})
		.forEach(function(result){

			// get projects that have not been update since the threshold
			return r.table('projects').filter(function(project){
				return project('cycle_id').eq(result('cycle')('id')).and(
				project('updated').lt(result('threshold')));
			})

			// reevaluate the cache for selected projects
			.replace(function(project){
				return projectModel.processWriteHooks(project, result('cycle'));
			}, {nonAtomic: true});

		});
	}).run(conn);
};
