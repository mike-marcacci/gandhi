'use strict';

var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/notifications')(config, resources);

	// create
	// ------
	router.post(
		'/api/notifications',
		passport.authenticate('bearer', { session: false }),
		controller.create
	);

	// query
	// -----
	router.get(
		'/api/notifications',
		passport.authenticate('bearer', { session: false }),
		controller.query
	);

	// get
	// ---
	router.get(
		'/api/notifications/:notification',
		passport.authenticate('bearer', { session: false }),
		controller.get
	);

	// update
	// ------
	router.patch(
		'/api/notifications/:notification',
		passport.authenticate('bearer', { session: false }),
		controller.update
	);

	// save
	// ----
	router.put(
		'/api/notifications/:notification',
		passport.authenticate('bearer', { session: false }),
		controller.save
	);

	// delete
	// ------
	router.delete(
		'/api/notifications/:notification',
		passport.authenticate('bearer', { session: false }),
		controller.delete
	);
};
