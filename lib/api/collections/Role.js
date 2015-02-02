'use strict';

var _ = require('lodash');
var r = require('rethinkdb');
var Q = require('q');

module.exports = function Role(config, resources) {

	return {
		query: function(conn, cycleId, query, user){
			return queryRoles(conn, cycleId, query, user);
		},

		get: function(conn, cycleId, roleId, user){
			return getRole(conn, cycleId, roleId, user);
		},

		save: function(conn, cycleId, roleId, data, user){
			return saveRole(conn, cycleId, roleId, data, user);
		},

		update: function(conn, cycleId, roleId, data, user){
			return updateRole(conn, cycleId, roleId, data, user);
		},

		create: function(conn, cycleId, data, user){
			// generate new UUID
			var roleId = r.uuid();
			data = r.expr(data).merge({id: roleId});

			return saveRole(conn, cycleId, roleId, data, user);
		},

		delete: function(conn, cycleId, roleId, user){
			return deleteRole(conn, cycleId, roleId, user);
		}
	};



	function queryRoles(conn, cycleId, query, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the roles
				cycle('roles')
			);
		}).run(conn)

		// return as an array
		.then(function(triggers){
			return _.values(triggers);
		});
	}


	function getRole(conn, cycleId, roleId, user){
		if(!user) return Q.reject(401);
		return r.table('cycles').get(cycleId).do(function(cycle){

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the role
				cycle('roles')(roleId).default(null).do(function(role){
					return r.branch(
						role.not(),
						r.error('{"code": 404, "message": "Role not found."}'),
						role
					);
				})
			);
		}).run(conn);
	}


	function updateRole(conn, cycleId, roleId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(typeof data.id !== 'undefined' && roleId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate role
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/role', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {roles: {}}; delta.roles[roleId] = data;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the role
				r.branch(
					cycle('roles')(roleId).default(null).not(),
					r.error('{"code": 404, "message": "Role not found."}'),

					// update the cycle
					cycle.merge(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return new value
							write('roles')(roleId)
						);
					})
				)
			);
		}).run(conn);
	}


	function saveRole(conn, cycleId, roleId, data, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		// validate id
		if(roleId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate role
		var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/role', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// embed the role
		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {roles: {}}; delta.roles[roleId] = r.literal(data);

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// update the cycle
				cycle.merge(delta).do(function(write){
					return r.branch(
						r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
						r.error('{"code": 500, "message": "Error writing to the database."}'),

						// return new value
						write('roles')(roleId)
					);
				})
			);
		}).run(conn);
	}


	function deleteRole(conn, cycleId, roleId, user){
		if(!user) return Q.reject(401);
		if(user !== true && !user.admin) return Q.reject(403);

		return r.table('cycles').get(cycleId).do(function(cycle){
			var delta = {roles: {}}; delta.roles[roleId] = true;

			// get the cycle
			return r.branch(
				cycle.not(),
				r.error('{"code": 404, "message": "Cycle not found."}'),

				// get the role
				r.branch(
					cycle('roles')(roleId).default(null).not(),
					r.error('{"code": 404, "message": "Role not found."}'),

					// update the cycle
					cycle.without(delta).do(function(write){
						return r.branch(
							r.table('cycles').get(cycleId).replace(write)('errors').gt(0),
							r.error('{"code": 500, "message": "Error writing to the database."}'),

							// return old value
							cycle('roles')(roleId)
						);
					})
				)
			);
		}).run(conn);
	}

};
