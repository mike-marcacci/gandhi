'use strict';

var Promise     = require('bluebird');
var controller  = require('../../controller');
var errors      = require('../../errors');
var using       = Promise.using;

var Cycles      = require('../../collections/Cycles');
var cycles      = new Cycles();

function prepare(record) {
	return record;
}

module.exports = function(config, resources) {
	return {
		query: function(req, res, next) {

			// parse the query
			var query = controller.parseQuery(req.query);

			// get the cycle
			return using(resources.db.disposer(), function(conn) {
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// query the assignments
				.then(function(cycle) {
					return cycle.assignments.query(conn, query);
				});
			})

			.then(function(assignments) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					cycles.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(assignments));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		get: function(req, res, next) {

			// get the cycle
			return using(resources.db.disposer(), function(conn) {
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the assignment
				.then(function(cycle){
					return cycle.assignments.get(conn, req.params.assignment);
				});
			})

			.then(function(assignment) {
				res.send(prepare(assignment));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		save: function(req, res, next) {
			return using(resources.db.disposer(), function(conn) {

				if(req.body.id !== req.params.assignment)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));







				// Using an Invitation
				// -------------------

				if(req.query.invitation) {

					if(req.user !== true && req.body.id !== req.user.id)
						return Promise.reject(new errors.ValidationError('You can only apply an invitation to your self.'));

					// get the cycle (as an admin)
					return cycles.get(
						conn,
						req.params.cycle,
						true
					)

					// geth the invitation
					.then(function(cycle) {
						return cycle.invitations.get(conn, req.query.invitation);
					})

					// use the invitation
					.then(function(invitation) {
						return invitation.delete(conn);
					})

					// create the assignment
					.then(function(invitation) {
						req.body.role_id = invitation.role_id;
						return invitation.parent.assignments.create(conn, req.body);
					});
				}









				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// create the assignment
				.then(function(cycle){
					return cycle.assignments.create(conn, req.body);
				});
			})

			.then(function(assignment) {
				res.status(200).send(prepare(assignment));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		update: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				if(typeof req.body.id !== 'undefined' && req.body.id !== req.params.assignment)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the assignment
				.then(function(cycle){
					return cycle.assignments.get(conn, req.params.assignment);
				})

				// update the assignment
				.then(function(assignment){
					return assignment.update(conn, req.body);
				});
			})
			.then(function(assignment) {
				res.send(prepare(assignment));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		create: function(req, res, next) {
			return res.status(405).send();
		},

		delete: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the assignment
				.then(function(cycle) {
					return cycle.assignments.get(conn, req.params.assignment);
				})

				// delete the assignment
				.then(function(assignment){
					return assignment.delete(conn);
				});
			})
			.then(function(assignment) {
				res.send(prepare(assignment));
			})
			.catch(function(err) {
				return next(err);
			});
		}

	};
};
