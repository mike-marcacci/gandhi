'use strict';

var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/projects')(config, resources);

	// create
	// ------
	router.post(
		'/api/projects',
		passport.authenticate('bearer', { session: false }),
		controller.create
	);

	// list
	// ----
	router.get(
		'/api/projects',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// list (by cycle)
	// ---------------
	router.get(
		'/api/cycles/:cycle/projects',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// list (by user)
	// -----------------
	router.get(
		'/api/users/:user/projects',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// show
	// ----
	router.get(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		controller.show
	);

	// update
	// ------
	router.patch(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		controller.update
	);

	// replace
	// ------
	router.put(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		controller.replace
	);

	// destroy
	// -------
	router.delete(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		controller.destroy
	);
};
