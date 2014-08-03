'use strict';

var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/users')(config, resources);

	// create
	// ------
	router.post(
		'/api/users',
		controller.create
	);

	// list
	// ----
	router.get(
		'/api/users',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// list (by cycle)
	// ---------------
	router.get(
		'/api/cycles/:cycle/users',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// list (by project)
	// -----------------
	router.get(
		'/api/projects/:project/users',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// show
	// ----
	router.get(
		'/api/users/:user',
		passport.authenticate('bearer', { session: false }),
		controller.show
	);

	// update
	// ------
	router.patch(
		'/api/users/:user',
		passport.authenticate('bearer', { session: false }),
		controller.update
	);

	// replace
	// ------
	router.put(
		'/api/users/:user',
		passport.authenticate('bearer', { session: false }),
		controller.replace
	);

	// destroy
	// -------
	router.delete(
		'/api/users/:user',
		passport.authenticate('bearer', { session: false }),
		controller.destroy
	);
};
