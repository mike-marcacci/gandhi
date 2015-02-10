'use strict';

var r = require('rethinkdb');
var passport = require('passport');

module.exports = function(config, router, resources){


	// Projects
	// ======
	//
	// This root collection is indexed by `id`, which is
	// a randomly generated uuid.

	var projects = require('../controllers/projects')(config, resources);

	// post
	// ----
	router.post(
		'/api/projects',
		passport.authenticate('bearer', { session: false }),
		projects.post
	);

	// list
	// ----
	router.get(
		'/api/projects',
		passport.authenticate('bearer', { session: false }),
		projects.list
	);

	// list (by cycle)
	// ---------------
	router.get(
		'/api/cycles/:cycle/projects',
		passport.authenticate('bearer', { session: false }),
		function(req, res, next){
			req.query.cycle = req.params.cycle;
			return projects.list(req, res, next);
		}
	);

	// list (by user)
	// -----------------
	router.get(
		'/api/users/:user/projects',
		passport.authenticate('bearer', { session: false }),
		function(req, res, next){
			req.query.user = req.params.user;
			return projects.list(req, res, next);
		}
	);

	// get
	// ---
	router.get(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		projects.get
	);

	// patch
	// -----
	router.patch(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		projects.patch
	);

	// put
	// -----
	router.put(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		projects.put
	);

	// delete
	// ------
	router.delete(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		projects.delete
	);





	// Project Assignments
	// ===================
	//
	// This embedded collection is indexed by `id`, which is
	// the `id` of the corresponding user.

	var assignments = require('../controllers/projects/assignments')(config, resources);

	// list
	// ----
	router.get(
		'/api/projects/:project/assignments',
		passport.authenticate('bearer', { session: false }),
		assignments.list
	);

	// get
	// ---
	router.get(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.get
	);

	// put
	// -----
	router.put(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.put
	);

	// patch
	// -----
	router.patch(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.patch
	);

	// delete
	// ------
	router.delete(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.delete
	);





	// Project Invitations
	// ===================
	//
	// This embedded collection is indexed by `id`, which is
	// a randomly generated uuid.

	var invitations = require('../controllers/projects/invitations')(config, resources);

	// list
	// ----
	router.get(
		'/api/projects/:project/invitations',
		passport.authenticate('bearer', { session: false }),
		invitations.list
	);

	// get
	// ---
	router.get(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.get
	);

	// post
	// ----
	router.post(
		'/api/projects/:project/invitations',
		passport.authenticate('bearer', { session: false }),
		invitations.post
	);

	// put
	// ---
	router.put(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.put
	);

	// patch
	// -----
	router.patch(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.patch
	);

	// delete
	// ------
	router.delete(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.delete
	);




	// Project Contents
	// ================
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the content.

	var contents = require('../controllers/projects/contents')(config, resources);

	// list
	// ----
	router.get(
		'/api/projects/:project/contents',
		passport.authenticate('bearer', { session: false }),
		contents.list
	);

	// get
	// ---
	router.get(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		contents.get
	);

	// put
	// ---
	router.put(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		contents.put
	);

	// patch
	// -----
	router.patch(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		contents.patch
	);

	// delete
	// ------
	router.delete(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		contents.delete
	);

	
};
