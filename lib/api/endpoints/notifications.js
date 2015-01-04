'use strict';

var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/notifications')(config, resources);

	// post
	// ----
	router.post(
		'/api/notifications',
		passport.authenticate('bearer', { session: false }),
		controller.post
	);

	// list
	// ----
	router.get(
		'/api/notifications',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// get
	// ---
	router.get(
		'/api/notifications/:notification',
		passport.authenticate('bearer', { session: false }),
		controller.get
	);

	// patch
	// -----
	router.patch(
		'/api/notifications/:notification',
		passport.authenticate('bearer', { session: false }),
		controller.patch
	);

	// put
	// ---
	router.put(
		'/api/notifications/:notification',
		passport.authenticate('bearer', { session: false }),
		controller.put
	);

	// delete
	// ------
	router.delete(
		'/api/notifications/:notification',
		passport.authenticate('bearer', { session: false }),
		controller.delete
	);
};
