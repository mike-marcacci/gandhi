'use strict';

var r = require('rethinkdb');

function build(cycle) {
	return cycle;
}

function sanitize(cycle) {
	return r.branch(
		cycle,
		cycle.without(['statuses','roles','assignments','invitations','triggers','stages','exports']),
		cycle
	);
}

module.exports = {
	build: build,
	sanitize: sanitize
};
