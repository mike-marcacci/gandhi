'use strict';

var _ = require('lodash');

function read(role, stage, cycle, project, callback){
	// this component doesn't require any processing
	callback(null, project.flow.stages[stage]);
}


/******************
 * role (string) = role of the user in project
 * stage (string) = stage ID in cycle and project
 * cycle (Cycle object) = cycle
 * project (Project object) = project
 * changes (object) = changes to the project's corresponding stage
 * callback (function) = (err, res)
 */
function update(role, stage, cycle, project, changes, callback){
	// this component doesn't write any changes to the project
	callback(null, {});
}


module.exports = {
	read: read,
	update: update
};
