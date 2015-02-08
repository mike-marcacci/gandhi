'use strict';

var r = require('rethinkdb');
var passport = require('passport');

module.exports = function(config, router, resources){


	// Cycles
	// ======
	//
	// This root collection is indexed by `id`, which is
	// a randomly generated uuid.

	var cycles = require('../controllers/cycles')(config, resources);

	// post
	// ----
	router.post(
		'/api/cycles',
		passport.authenticate('bearer', { session: false }),
		cycles.post
	);

	// list
	// ----
	router.get(
		'/api/cycles',
		passport.authenticate('bearer', { session: false }),
		cycles.list
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

	// put
	// -----
	router.put(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		cycles.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		cycles.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		cycles.delete
	);






	// Cycle Statuses
	// ==============
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the status.

	var statuses = require('../controllers/cycles/statuses')(config, resources);

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/statuses',
		passport.authenticate('bearer', { session: false }),
		statuses.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		statuses.get
	);

	// put
	// -----
	router.put(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		statuses.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		statuses.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		statuses.delete
	);





	// Cycle Roles
	// ===========
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the role.

	var roles = require('../controllers/cycles/roles')(config, resources);

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/roles',
		passport.authenticate('bearer', { session: false }),
		roles.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		roles.get
	);

	// put
	// -----
	router.put(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		roles.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		roles.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		roles.delete
	);





	// Cycle Assignments
	// =================
	//
	// This embedded collection is indexed by `id`, which is
	// the `id` of the corresponding user.

	var assignments = require('../controllers/cycles/assignments')(config, resources);

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/assignments',
		passport.authenticate('bearer', { session: false }),
		assignments.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.get
	);

	// put
	// -----
	router.put(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		assignments.patch
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

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/invitations',
		passport.authenticate('bearer', { session: false }),
		invitations.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.get
	);

	// post
	// ----
	router.post(
		'/api/cycles/:cycle/invitations',
		passport.authenticate('bearer', { session: false }),
		invitations.post
	);

	// put
	// ---
	router.put(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		invitations.delete
	);




	// Cycle Stages
	// ============
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the stage.

	var stages = require('../controllers/cycles/stages')(config, resources);

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/stages',
		passport.authenticate('bearer', { session: false }),
		stages.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		stages.get
	);

	// put
	// ---
	router.put(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		stages.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		stages.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		stages.delete
	);




	// Cycle Triggers
	// ==============
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the trigger.

	var triggers = require('../controllers/cycles/triggers')(config, resources);

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/triggers',
		passport.authenticate('bearer', { session: false }),
		triggers.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		triggers.get
	);

	// put
	// ---
	router.put(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		triggers.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		triggers.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		triggers.delete
	);




	// Cycle Exports
	// =============
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the export.

	var exports = require('../controllers/cycles/exports')(config, resources);

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/exports',
		passport.authenticate('bearer', { session: false }),
		exports.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/exports/:export',
		passport.authenticate('bearer', { session: false }),
		exports.get
	);

	// put
	// ---
	router.put(
		'/api/cycles/:cycle/exports/:export',
		passport.authenticate('bearer', { session: false }),
		exports.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/exports/:export',
		passport.authenticate('bearer', { session: false }),
		exports.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/exports/:export',
		passport.authenticate('bearer', { session: false }),
		exports.delete
	);

};
