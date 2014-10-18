'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(model, collection, config, resources) {
	return {
		list: function(req, res, next){
			if(!req.user) return next(401);
			resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table('cycles')
					.get(req.params.cycle)(collection)
					.run(conn, function(err, results){
						resources.db.release(conn);
						if(err) return next(err);
						res.send(results);
					});
			});
		},
		get: function(req, res, next){
			if(!req.user) return next(401);
			resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table('cycles')
					.get(req.params.cycle)(collection)(req.params[model])
					.default(null)
					.run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);
						if(!result) return next(404);
						res.send(result);
					});
			});
		},
		put: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate model
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/' + model, req.body, {useDefault: true});
			if(err) return next({code: 400, message: err});

			// embed the model
			resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {}; data[collection] = {}; data[collection][req.params[model]] = r.literal(req.body);
				r.table('cycles')
					.get(req.params.cycle)
					.update(data, {returnChanges: true})
					.run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);
						if(!result) return next(404);
						res.send(result.changes[0].new_val[collection][req.params[model]]);
					});
			});
		},
		patch: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate model
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/' + model, req.body, {checkRequired: false});
			if(err) return next({code: 400, message: err});

			// embed the model
			resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {}; data[collection] = {}; data[collection][req.params[model]] = req.body;
				r.branch(r.table('cycles').get(req.params.cycle)(collection).hasFields(req.params[model]),
					r.table('cycles').get(req.params.cycle).update(data, {returnChanges: true}),
					false
				).run(conn, function(err, result){
					resources.db.release(conn);
					if(err) return next(err);
					if(!result) return next(404);
					res.send(result.changes[0].new_val[collection][req.params[model]]);
				});
			});
		},
		delete: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {}; data[collection] = req.params[model];
				r.table('cycles')
					.get(req.params.cycle)
					.replace(r.row.without(data), {returnChanges: true})
					.run(conn, function(err, result){
						resources.db.release(conn);
						if(err) return next(err);
						res.send(result.changes[0].old_val[collection][req.params[model]]);
					});
			});
		}
	};
}