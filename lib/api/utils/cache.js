'use strict';

var r = require('rethinkdb');
var projectModel = require('../models/projects.js');

// purge and reevaluate cache for all projects
module.exports = function(conn) {
	return r.table('projects').replace(function(project){
		return projectModel.processWriteHooks(project);
	}, {nonAtomic: true}).run(conn);
}
