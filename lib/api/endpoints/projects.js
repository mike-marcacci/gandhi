'use strict';

var r = require('rethinkdb');
var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/projects')(config, resources);



	// Projects
	// ======
	//
	// This root collection is indexed by `id`, which is
	// a randomly generated uuid.

	// post
	// ------
	router.post(
		'/api/projects',
		passport.authenticate('bearer', { session: false }),
		controller.post
	);

	// list
	// ----
	router.get(
		'/api/projects',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// // list (by cycle)
	// // ---------------
	// router.get(
	// 	'/api/cycles/:cycle/projects',
	// 	passport.authenticate('bearer', { session: false }),
	// 	controller.list
	// );

	// // list (by user)
	// // -----------------
	// router.get(
	// 	'/api/users/:user/projects',
	// 	passport.authenticate('bearer', { session: false }),
	// 	controller.list
	// );

	// get
	// ----
	router.get(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		controller.get
	);

	// patch
	// ------
	router.patch(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		controller.patch
	);

	// put
	// ------
	router.put(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		controller.put
	);

	// delete
	// -------
	router.delete(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		controller.delete
	);





	// Project Assignments
	// ===================
	//
	// This embedded collection is indexed by `id`, which is
	// the `id` of the corresponding user.

	// list
	// ----
	router.get(
		'/api/projects/:project/assignments',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.list
	);

	// get
	// ----
	router.get(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.get
	);

	// put
	// ------
	router.put(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.put
	);

	// patch
	// ------
	router.patch(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.patch
	);

	// delete
	// -------
	router.delete(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.delete
	);





	// Project Invitations
	// ===================
	//
	// This embedded collection is indexed by `id`, which is
	// a randomly generated uuid.

	// list
	// ----
	router.get(
		'/api/projects/:project/invitations',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.list
	);

	// get
	// ----
	router.get(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.get
	);

	// put
	// ----
	router.put(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.put
	);

	// patch
	// ------
	router.patch(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.patch
	);

	// delete
	// -------
	router.delete(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.delete
	);




	// Project Contents
	// ================
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the content.

	// list
	// ----
	router.get(
		'/api/projects/:project/contents',
		passport.authenticate('bearer', { session: false }),
		controller.contents.list
	);

	// get
	// ----
	router.get(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		controller.contents.get
	);

	// put
	// ----
	router.put(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		controller.contents.put
	);

	// patch
	// ------
	router.patch(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		controller.contents.patch
	);

	// delete
	// -------
	router.delete(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		controller.contents.delete
	);

	
};
