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

	// query
	// -----
	router.get(
		'/api/users',
		passport.authenticate('bearer', { session: false }),
		controller.query
	);

	// list (by cycle)
	// ---------------
	// router.get(
	// 	'/api/cycles/:cycle/users',
	// 	passport.authenticate('bearer', { session: false }),
	// 	controller.list
	// );

	// list (by project)
	// -----------------
	// router.get(
	// 	'/api/projects/:project/users',
	// 	passport.authenticate('bearer', { session: false }),
	// 	controller.list
	// );

	// get
	// ---
	router.get(
		'/api/users/:user',
		passport.authenticate('bearer', { session: false }),
		controller.get
	);

	// get (by file)
	// -------------
	router.get(
		'/api/files/:file/user',
		passport.authenticate('bearer', { session: false }),
		controller.get
	);

	// update
	// ------
	router.patch(
		'/api/users/:user',
		passport.authenticate('bearer', { session: false }),
		controller.update
	);

	// save
	// ----
	router.put(
		'/api/users/:user',
		passport.authenticate('bearer', { session: false }),
		controller.save
	);

	// delete
	// ------
	router.delete(
		'/api/users/:user',
		passport.authenticate('bearer', { session: false }),
		controller.delete
	);
};
