'use strict';

var passport = require('passport');

module.exports = function(config, router, resources){


	// Projects
	// ======
	//
	// This root collection is indexed by `id`, which is
	// a randomly generated uuid.

	var projects = require('../controllers/projects')(config, resources);

	// create
	// ------
	router.post(
		'/api/projects',
		passport.authenticate('bearer', { session: false }),
		projects.create
	);

	// query
	// -----
	router.get(
		'/api/projects',
		passport.authenticate('bearer', { session: false }),
		projects.query
	);

	// query (by cycle)
	// ----------------
	router.get(
		'/api/cycles/:cycle/projects',
		passport.authenticate('bearer', { session: false }),
		function(req, res, next){
			req.query.cycle = req.params.cycle;
			return projects.query(req, res, next);
		}
	);

	// query (by user)
	// ---------------
	router.get(
		'/api/users/:user/projects',
		passport.authenticate('bearer', { session: false }),
		function(req, res, next){
			req.query.user = req.params.user;
			return projects.query(req, res, next);
		}
	);

	// get
	// ---
	router.get(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		projects.get
	);

	// update
	// ------
	router.patch(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		projects.update
	);

	// save
	// ----
	router.put(
		'/api/projects/:project',
		passport.authenticate('bearer', { session: false }),
		projects.save
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

	// query
	// -----
	router.get(
		'/api/projects/:project/assignments',
		passport.authenticate('bearer', { session: false }),
		assignments.query
	);

	// get
	// ---
	router.get(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.get
	);

	// save
	// ----
	router.put(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.save
	);

	// update
	// ------
	router.patch(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.update
	);

	// delete
	// ------
	router.delete(
		'/api/projects/:project/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.delete
	);




	// Project Contents
	// ================
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the content.

	var contents = require('../controllers/projects/contents')(config, resources);

	// query
	// ----
	router.get(
		'/api/projects/:project/contents',
		passport.authenticate('bearer', { session: false }),
		contents.query
	);

	// get
	// ---
	router.get(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		contents.get
	);

	// save
	// ----
	router.put(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		contents.save
	);

	// update
	// ------
	router.patch(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		contents.update
	);

	// delete
	// ------
	router.delete(
		'/api/projects/:project/contents/:content',
		passport.authenticate('bearer', { session: false }),
		contents.delete
	);





	// Project Invitations
	// ===================
	//
	// This embedded collection is indexed by `id`, which is
	// a randomly generated uuid.

	var invitations = require('../controllers/projects/invitations')(config, resources);

	// query
	// -----
	router.get(
		'/api/projects/:project/invitations',
		passport.authenticate('bearer', { session: false }),
		invitations.query
	);

	// get
	// ---
	router.get(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.get
	);

	// create
	// ------
	router.post(
		'/api/projects/:project/invitations',
		passport.authenticate('bearer', { session: false }),
		invitations.create
	);

	// save
	// ----
	router.put(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.save
	);

	// update
	// ------
	router.patch(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.update
	);

	// delete
	// ------
	router.delete(
		'/api/projects/:project/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.delete
	);
	
};
