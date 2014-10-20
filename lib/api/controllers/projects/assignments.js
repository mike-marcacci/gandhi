'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {
	return _.extend(
		require('../_embedded.js')('project', 'projects', 'assignment', 'assignments', config, resources),
		{
			// TODO: show/hide assignments based on role
		}
	);
}