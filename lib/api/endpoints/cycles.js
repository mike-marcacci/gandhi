'use strict';

var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/cycles')(config, resources);

	// create
	// ------
	router.post(
		'/api/cycles',
		passport.authenticate('bearer', { session: false }),
		controller.create
	);

	// list
	// ----
	router.get(
		'/api/cycles',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// show
	// ----
	router.get(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		controller.show
	);

	// update
	// ------
	router.patch(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		controller.update
	);

	// replace
	// ------
	router.put(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		controller.replace
	);

	// destroy
	// -------
	router.delete(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		controller.destroy
	);
};
