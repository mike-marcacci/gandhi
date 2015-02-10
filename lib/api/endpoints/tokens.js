'use strict';

var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/tokens')(config, resources);

	// post
	// ----
	router.post(
		'/api/tokens',
		controller.post
	);
};
