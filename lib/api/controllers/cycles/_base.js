'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(model, collection, config, resources) {
	return {
		list: function(req, res, next){
			if(!req.user) return next(401);
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table('cycles')
					.get(req.params.cycle)(collection)
					.run(conn)
					.then(function(results){
						resources.db.release(conn);
						return res.send(results);
					})
					.error(function(err){
						resources.db.release(conn);
						return next(err);
					})
			});
		},
		get: function(req, res, next){
			if(!req.user) return next(401);
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table('cycles')
					.get(req.params.cycle)(collection)(req.params[model])
					.default(null)
					.run(conn)
					.then(function(result){
						resources.db.release(conn);
						if(!result) return next(404);
						return res.send(result);
					})
					.error(function(err){
						resources.db.release(conn);
						return next(err);
					})
			});
		},
		put: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate model
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/' + model, req.body, {useDefault: true});
			if(err) return next({code: 400, message: err});

			// embed the model
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {}; data[collection] = {}; data[collection][req.params[model]] = r.literal(req.body);
				r.table('cycles')
					.get(req.params.cycle)
					.update(data, {returnChanges: true})
					.run(conn)
					.then(function(result){
						resources.db.release(conn);
						if(!result) return next(404);
						return res.send(result.changes[0].new_val[collection][req.params[model]]);
					})
					.error(function(err){
						resources.db.release(conn);
						return next(err);
					})
			});
		},
		patch: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate model
			var err = resources.validator.validate('http://www.gandhi.io/schema/cycle#/definitions/' + model, req.body, {checkRequired: false});
			if(err) return next({code: 400, message: err});

			// embed the model
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {}; data[collection] = {}; data[collection][req.params[model]] = req.body;
				r.branch(r.table('cycles').get(req.params.cycle)(collection).hasFields(req.params[model]),
					r.table('cycles').get(req.params.cycle).update(data, {returnChanges: true}),
					false
				)
					.run(conn)
					.then(function(result){
						resources.db.release(conn);
						if(!result) return next(404);
						return res.send(result.changes[0].new_val[collection][req.params[model]]);
					})
					.error(function(err){
						resources.db.release(conn);
						return next(err);
					})
			});
		},
		delete: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {}; data[collection] = req.params[model];
				r.table('cycles')
					.get(req.params.cycle)
					.replace(r.row.without(data), {returnChanges: true})
					.run(conn)
					.then(function(result){
						resources.db.release(conn);
						return res.send(result.changes[0].old_val[collection][req.params[model]]);
					})
					.error(function(err){
						resources.db.release(conn);
						return next(err);
					})
			});
		}
	};
}