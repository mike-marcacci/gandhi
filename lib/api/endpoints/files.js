'use strict';

var multer = require('multer');
var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/files')(config, resources);

	// post
	// ----
	router.post(
		'/api/files',
		passport.authenticate('bearer', { session: false }),
		multer({ dest: config.files.directory }),
		controller.post
	);

	// list
	// ----
	router.get(
		'/api/files',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// list (by user)
	// --------------
	router.get(
		'/api/users/:user/files',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// get
	// ---
	router.get(
		'/api/files/:file',
		// passport.authenticate('bearer', { session: false }),
		controller.get
	);

	// patch
	// -----
	router.patch(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.patch
	);

	// put
	// ---
	router.put(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.put
	);

	// delete
	// ------
	router.delete(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.delete
	);
};
