'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			if(!req.user) return next(401);
			resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table('cycles')
					.get(req.params.cycle)('roles')
					.run(conn, function(err, roles){
						resources.db.release(conn);
						if(err) return next(err);
						res.send(roles);
					});
			});
		},
		get: function(req, res, next){
			if(!req.user) return next(401);
			resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table('cycles')
					.get(req.params.cycle)('roles')(req.params.role)
					.default(null)
					.run(conn, function(err, role){
						resources.db.release(conn);
						if(err) return next(err);
						if(!role) return next(404);
						res.send(role.roles);
					});
			});
		},
		put: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate role
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/role', data, {useDefault: true});
			if(err) return next({code: 400, message: err});

			// embed the role
			resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {roles:{}}; data.roles[req.params.role] = r.literal(req.body);
				r.table('cycles')
					.get(req.params.cycle)
					.update(data, {returnVals: true})
					.run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);
						if(!result) return next(404);
						res.send(result.changes[0].new_val.roles[req.params.role]);
					});
			});
		},
		patch: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate role
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/role', data, {checkRequired: false});
			if(err) return next({code: 400, message: err});

			// embed the role
			resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {roles:{}}; data.roles[req.params.role] = req.body;
				r.table('cycles')
					.get(req.params.cycle).update(data, {returnVals: true})
					.run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);
						if(!result) return next(404);
						res.send(result.changes[0].new_val.roles[req.params.role]);
					});
			});
		},
		delete: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table('cycles')
					.get(req.params.cycle)
					.replace(r.row.without({roles: req.params.role}), {returnVals: true})
					.run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);
						res.send(result.changes[0].old_val.roles[req.params.role]);
					});
			});
		}
	};
}