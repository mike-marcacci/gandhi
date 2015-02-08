'use strict';

var _ = require('lodash');

module.exports = {
	setup: function(done){
		global.setup.fixtures = {
			db: {
				cycles: _.cloneDeep(require('../fixtures/db/cycles.json')),
				projects: _.cloneDeep(require('../fixtures/db/projects.json')),
				users: _.cloneDeep(require('../fixtures/db/users.json')),
				notifications: _.cloneDeep(require('../fixtures/db/notifications.json'))
			}
		};

		return done();
	},
	teardown: function(done){
		done();
	}
};
