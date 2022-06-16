'use strict';

var Promise     = require('bluebird');
var Handlebars  = require('handlebars');
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

				// query the invitations
				.then(function(cycle) {
					return cycle.invitations.query(conn, query);
				});
			})

			.then(function(invitations) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					cycles.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(invitations));
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

				// get the invitation
				.then(function(cycle){
					return cycle.invitations.get(conn, req.params.invitation);
				});
			})

			.then(function(invitation) {
				res.send(prepare(invitation));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		save: function(req, res, next) {
			return res.status(405).send();
		},

		update: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				if(typeof req.body.id !== 'undefined' && req.body.id !== req.params.invitation)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the invitation
				.then(function(cycle){
					return cycle.invitations.get(conn, req.params.invitation);
				})

				// update the invitation
				.then(function(invitation){
					return invitation.update(conn, req.body);
				});
			})
			.then(function(invitation) {
				res.send(prepare(invitation));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		create: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// create the invitation
				.then(function(cycle){
					return cycle.invitations.create(conn, req.body);
				});
			})

			.then(function(invitation) {

				// send the response
				res.status(201).send(prepare(invitation));

				// email the invitee behind the scenes
				var token = 'cycle/' + invitation.parent.id + '/' + invitation.id;
				var link = req.protocol + '://' + (req.headers.host || req.hostname) + config.root + '/#!/?invitation=' + token;
				var message = '' +
					'You have been invited to the cycle, "' + invitation.parent.title + '". ' +
					'Please use the following token to accept your invitation: ' +
					'<a href="' + link + '">' + token + '</a>.';

				// render the provided message if possible
				if(invitation.message)
					try {
						 message = Handlebars.compile(invitation.message)({
							title: invitation.parent.title,
							link: link,
							token: token,
							name: invitation.name,
							email: invitation.email
						});
					} catch (err) {
						console.error(err);
					}

				if(invitation.email) return resources.mail({
					to: invitation.email,
					subject: 'Invitation to collaborate',
					html: message
				});
			})
			.catch(function(err) {
				return next(err);
			});
		},

		delete: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the invitation
				.then(function(cycle) {
					return cycle.invitations.get(conn, req.params.invitation);
				})

				// delete the invitation
				.then(function(invitation){
					return invitation.delete(conn);
				});
			})
			.then(function(invitation) {
				res.send(prepare(invitation));
			})
			.catch(function(err) {
				return next(err);
			});
		}

	};
};
