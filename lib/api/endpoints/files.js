'use strict';

var multer = require('multer');
var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/files')(config, resources);

	// create
	// ------
	router.post(
		'/api/files',
		passport.authenticate('bearer', { session: false }),
		multer({ dest: config.files.directory }),
		controller.create
	);

	// query
	// -----
	router.get(
		'/api/files',
		passport.authenticate('bearer', { session: false }),
		controller.query
	);

	// query (by user)
	// ---------------
	router.get(
		'/api/users/:user/files',
		passport.authenticate('bearer', { session: false }),
		controller.query
	);

	// get
	// ---
	router.get(
		'/api/files/:file',
		// passport.authenticate('bearer', { session: false }),
		controller.get
	);

	// update
	// ------
	router.patch(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.update
	);

	// save
	// ----
	router.put(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.save
	);

	// delete
	// ------
	router.delete(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.delete
	);
};
