'use strict';

var _ = require('lodash');

function read(role, stage, cycle, project, callback){

	// remove messages meant for other roles
	cycle.flow.stages[stage].data = _.pick(cycle.flow.stages[stage].data[role]);

	callback(null, {
		cycle: cycle.flow.stages[stage],
		project: project.flow.stages[stage]
	});
}

function update(role, stage, cycle, project, changes, callback){

	var result = {flow:{stages:{}}};

	if(role == 'admin') {
		// update the entire stage
		result[stage] = update.flow.stages[stage];
	} else {
		// only update the data property
		result[stage] = {data: update.flow.stages[stage].data};
	}

	callback(null, {
		cycle: cycle.flow.stages[stage],
		project: result
	});
}


module.exports = {
	read: read,
	update: update
};
