'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

/**
 * Generates a GUID string.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
function uuid() {
	function _p8(s) {
		var p = (Math.random().toString(16)+"000000000").substr(2,8);
		return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
	}
	return _p8() + _p8(true) + _p8(true) + _p8();
}

module.exports = function(config, resources) {
	return _.extend(require('../_embedded.js')('cycle', 'cycles', 'invitation', 'invitations', config, resources), {
		
		// TODO: don't accept new put requests

		put: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate id
			if(typeof req.params.invitation === 'undefined' || req.params.invitation !== req.body.id) return next({code: 400, message: 'The request body\'s id did not match the URL param.'});

			// validate invitation
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/invitation', req.body, {useDefault: true});
			if(err) return next({code: 400, message: err});

			// embed the invitation
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				r.table('cycles').get(req.params.cycle).do(function(cycle){
					return r.branch(
						cycle.not(),
						r.error('{"code": 404, "message": "Cycle not found"}'),

						// make sure invitation exists
						r.branch(
							cycle('invitations').hasFields(req.params.invitation).not(),
							r.error('{"code": 404, "message": "No such invitation. Please use POST instead of PUT for new invitations."}'),

							// update the record
							r.table('cycles').get(req.params.cycle).update(function(cycle){
								var u = {invitations:{}}; u.invitations[req.params.invitation] = r.literal(req.body);
								return u;
							}, {returnChanges: true})('changes').nth(0)('new_val')('invitations')(req.params.invitation)
						)

						// // update the record
						// r.table('cycles').get(req.params.cycle).update(function(cycle){
						// 	var u = {invitations:{}}; u.invitations[req.params.invitation] = r.literal(req.body);
						// 	return u;
						// }, {returnChanges: true})('changes').nth(0)('new_val')('invitations')(req.params.invitation)
					);
				})
				.run(conn)
				.then(function(invitation){
					return res.send(invitation);
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},


		post: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate absence of id
			if(typeof req.body.id !== 'undefined') return next({code: 400, message: 'You may not specify an invitation id.'});

			// generate uuid
			req.body.id = uuid();

			// validate invitation
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/invitation', req.body, {useDefault: true});
			if(err) return next({code: 400, message: err});

			// embed the invitation
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// get the cycle
				r.table('cycles').get(req.params.cycle).do(function(cycle){
					return r.branch(
						cycle.not(),
						r.error('{"code": 404, "message": "Cycle not found"}'),

						// update the record
						r.table('cycles').get(req.params.cycle).update(function(cycle){
							var u = {invitations:{}}; u.invitations[req.body.id] = r.literal(req.body);
							return u;
						}, {returnChanges: true})('changes').nth(0)('new_val')('invitations')(req.body.id)
					);
				})
				.run(conn)
				.then(function(invitation){
					return res.status(201).send(invitation);
				})
				.catch(function(err){
					try { err = JSON.parse(err.msg); } catch(e){}
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		}

	});
}