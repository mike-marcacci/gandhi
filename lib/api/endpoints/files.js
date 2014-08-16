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

	// list
	// ----
	router.get(
		'/api/files',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// show
	// ----
	router.get(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.show
	);

	// update
	// ------
	router.patch(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.update
	);

	// replace
	// ------
	router.put(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.replace
	);

	// destroy
	// -------
	router.delete(
		'/api/files/:file',
		passport.authenticate('bearer', { session: false }),
		controller.destroy
	);
};
