'use strict';

var r = require('rethinkdb');
var passport = require('passport');

module.exports = function(config, router, resources){

	var controller = require('../controllers/cycles')(config, resources);



	// Cycles
	// ======
	//
	// This root collection is indexed by `id`, which is
	// a randomly generated uuid.

	// post
	// ----
	router.post(
		'/api/cycles',
		passport.authenticate('bearer', { session: false }),
		controller.post
	);

	// list
	// ----
	router.get(
		'/api/cycles',
		passport.authenticate('bearer', { session: false }),
		controller.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		controller.get
	);

	// get (by project)
	// -----------------
	router.get(
		'/api/projects/:project/cycle',
		passport.authenticate('bearer', { session: false }),
		function(req, res, next){
			req.params.cycle = r.table('projects').get(req.params.project)('cycle_id').default(false);
			return controller.get(req, res, next);
		}
	);

	// put
	// -----
	router.put(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		controller.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		controller.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle',
		passport.authenticate('bearer', { session: false }),
		controller.delete
	);





	// Cycle Statuses
	// ==============
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the status.

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/statuses',
		passport.authenticate('bearer', { session: false }),
		controller.statuses.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		controller.statuses.get
	);

	// put
	// -----
	router.put(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		controller.statuses.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		controller.statuses.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/statuses/:status',
		passport.authenticate('bearer', { session: false }),
		controller.statuses.delete
	);





	// Cycle Roles
	// ===========
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the role.

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/roles',
		passport.authenticate('bearer', { session: false }),
		controller.roles.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		controller.roles.get
	);

	// put
	// -----
	router.put(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		controller.roles.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		controller.roles.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/roles/:role',
		passport.authenticate('bearer', { session: false }),
		controller.roles.delete
	);





	// Cycle Assignments
	// =================
	//
	// This embedded collection is indexed by `id`, which is
	// the `id` of the corresponding user.

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/assignments',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.get
	);

	// put
	// -----
	router.put(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/assignments/:assignment',
		passport.authenticate('bearer', { session: false }),
		controller.assignments.delete
	);





	// Cycle Invitations
	// =================
	//
	// This embedded collection is indexed by `id`, which is
	// a randomly generated uuid.

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/invitations',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.get
	);

	// post
	// ----
	router.post(
		'/api/cycles/:cycle/invitations',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.post
	);

	// put
	// ---
	router.put(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/invitations/:invitation',
		passport.authenticate('bearer', { session: false }),
		controller.invitations.delete
	);




	// Cycle Stages
	// ============
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the stage.

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/stages',
		passport.authenticate('bearer', { session: false }),
		controller.stages.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		controller.stages.get
	);

	// put
	// ---
	router.put(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		controller.stages.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		controller.stages.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/stages/:stage',
		passport.authenticate('bearer', { session: false }),
		controller.stages.delete
	);




	// Cycle Triggers
	// ==============
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the trigger.

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/triggers',
		passport.authenticate('bearer', { session: false }),
		controller.triggers.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		controller.triggers.get
	);

	// put
	// ---
	router.put(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		controller.triggers.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		controller.triggers.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/triggers/:trigger',
		passport.authenticate('bearer', { session: false }),
		controller.triggers.delete
	);




	// Cycle Exports
	// =============
	//
	// This embedded collection is indexed by `id`, which is
	// a user-provided slug for the export.

	// list
	// ----
	router.get(
		'/api/cycles/:cycle/exports',
		passport.authenticate('bearer', { session: false }),
		controller.exports.list
	);

	// get
	// ---
	router.get(
		'/api/cycles/:cycle/exports/:export',
		passport.authenticate('bearer', { session: false }),
		controller.exports.get
	);

	// put
	// ---
	router.put(
		'/api/cycles/:cycle/exports/:export',
		passport.authenticate('bearer', { session: false }),
		controller.exports.put
	);

	// patch
	// -----
	router.patch(
		'/api/cycles/:cycle/exports/:export',
		passport.authenticate('bearer', { session: false }),
		controller.exports.patch
	);

	// delete
	// ------
	router.delete(
		'/api/cycles/:cycle/exports/:export',
		passport.authenticate('bearer', { session: false }),
		controller.exports.delete
	);

};
