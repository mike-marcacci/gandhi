'use strict';

var passport = require('passport');

module.exports = function(config, router, resources){


	// Cycles
	// ======
	//
	// This root collection is indexed by `id`, which is
	// a randomly generated uuid.

	var cycles = require('../controllers/cycles')(config, resources);

	// create
	// ------
	router.post(
		'/api/cycles',
		passport.authenticate('bearer', { session: false }),
		cycles.create
	);

	// query
	// -----
	router.get(
		'/api/cycles',
		passport.authenticate('bearer', { session: false }),
		cycles.query
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		cycles.get
	);

	// get (by project)
	// -----------------
	router.get(
		'/api/projects/:project/cycle',
		passport.authenticate('bearer', { session: false }),		
		function(req, res, next){
			req.query.project = req.params.project;
			return cycles.get(req, res, next);
		}
	);

	// save
	// ----
	router.put(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		cycles.save
	);

	// update
	// ------
	router.patch(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		cycles.update
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		cycles.delete
	);





	// Cycle Assignments
	// =================
	//
	// This embedded collection is indexed by `id`, which is
	// the `id` of the corresponding user.

	var assignments = require('../controllers/cycles/assignments')(config, resources);

	// query
	// -----
	router.get(
		'/api/cycles/:cycle/assignments',
		passport.authenticate('bearer', { session: false }),
		assignments.query
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.get
	);

	// save
	// ----
	router.put(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.save
	);

	// update
	// ------
	router.patch(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.update
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.delete
	);





	// Cycle Invitations
	// =================
	//
	// This embedded collection is indexed by `id`, which is
	// a randomly generated uuid.

	var invitations = require('../controllers/cycles/invitations')(config, resources);

	// query
	// -----
	router.get(
		'/api/cycles/:cycle/invitations',
		passport.authenticate('bearer', { session: false }),
		invitations.query
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.get
	);

	// create
	// ------
	router.post(
		'/api/cycles/:cycle/invitations',
		passport.authenticate('bearer', { session: false }),
		invitations.create
	);

	// save
	// ----
	router.put(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.save
	);

	// update
	// ------
	router.patch(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.update
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.delete
	);





	// Cycle Roles
	// ===========
	//
	// This embedded collection is indexed by `id`, which is
	// a randomly generated uuid.

	var roles = require('../controllers/cycles/roles')(config, resources);

	// query
	// -----
	router.get(
		'/api/cycles/:cycle/roles',
		passport.authenticate('bearer', { session: false }),
		roles.query
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		roles.get
	);

	// create
	// ------
	router.post(
		'/api/cycles/:cycle/roles',
		passport.authenticate('bearer', { session: false }),
		roles.create
	);

	// save
	// ----
	router.put(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		roles.save
	);

	// update
	// ------
	router.patch(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		roles.update
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		roles.delete
	);





	// Cycle Stages
	// ============
	//
	// This embedded collection is indexed by `id`, which is
	// a randomly generated uuid.

	var stages = require('../controllers/cycles/stages')(config, resources);

	// query
	// -----
	router.get(
		'/api/cycles/:cycle/stages',
		passport.authenticate('bearer', { session: false }),
		stages.query
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		stages.get
	);

	// save
	// ----
	router.put(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		stages.save
	);

	// create
	// ------
	router.post(
		'/api/cycles/:cycle/stages',
		passport.authenticate('bearer', { session: false }),
		stages.create
	);

	// update
	// ------
	router.patch(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		stages.update
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		stages.delete
	);





	// Cycle Statuses
	// ==============
	//
	// This embedded collection is indexed by `id`, which is
	// a randomly generated uuid.

	var statuses = require('../controllers/cycles/statuses')(config, resources);

	// query
	// -----
	router.get(
		'/api/cycles/:cycle/statuses',
		passport.authenticate('bearer', { session: false }),
		statuses.query
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		statuses.get
	);

	// create
	// ------
	router.post(
		'/api/cycles/:cycle/statuses',
		passport.authenticate('bearer', { session: false }),
		statuses.create
	);

	// save
	// ----
	router.put(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		statuses.save
	);

	// update
	// ------
	router.patch(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		statuses.update
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		statuses.delete
	);





	// Cycle Triggers
	// ==============
	//
	// This embedded collection is indexed by `id`, which is
	// a randomly generated uuid.

	var triggers = require('../controllers/cycles/triggers')(config, resources);

	// query
	// -----
	router.get(
		'/api/cycles/:cycle/triggers',
		passport.authenticate('bearer', { session: false }),
		triggers.query
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		triggers.get
	);

	// create
	// ------
	router.post(
		'/api/cycles/:cycle/triggers',
		passport.authenticate('bearer', { session: false }),
		triggers.create
	);

	// save
	// ----
	router.put(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		triggers.save
	);

	// update
	// ------
	router.patch(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		triggers.update
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		triggers.delete
	);

};
