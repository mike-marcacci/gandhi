'use strict';

var _ = require('lodash');
var r = require('rethinkdb');

module.exports = function(root, table, model, collection, config, resources) {
	return {
		list: function(req, res, next){
			if(!req.user) return next(401);
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table(table)
				.get(req.params[root])(collection)
				.default(false)
				.run(conn)
				.then(function(results){
					if(!results) return next(404);
					return res.send(_.values(results));
				})
				.catch(function(err){
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},
		
		get: function(req, res, next){
			if(!req.user) return next(401);
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);
				r.table(table)
				.get(req.params[root])(collection)(req.params[model])
				.default(null)
				.run(conn)
				.then(function(result){
					if(!result) return next(404);
					return res.send(result);
				})
				.catch(function(err){
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		put: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate id
			if(req.params[model] !== req.body.id) return next({code: 400, message: 'The request body\'s id did not match the URL param.'});

			// validate model
			var err = resources.validator.validate('http://www.gandhi.io/schema/' + root + '#/definitions/' + model, req.body, {useDefault: true});
			if(err) return next({code: 400, message: err});

			// embed the model
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {}; data[collection] = {}; data[collection][req.params[model]] = r.literal(req.body);
				r.table(table)
				.get(req.params[root])
				.update(data, {returnChanges: true})
				.run(conn)
				.then(function(result){
					if(!result || !result.changes[0].new_val) return next(404);
					return res.send(result.changes[0].new_val[collection][req.params[model]]);
				})
				.catch(function(err){
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		patch: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			// validate id
			if(typeof req.body.id !== 'undefined' && req.params[model] !== req.body.id) return next({code: 400, message: 'The request body\'s id did not match the URL param.'});

			// validate model
			var err = resources.validator.validate('http://www.gandhi.io/schema/' + root + '#/definitions/' + model, req.body, {checkRequired: false});
			if(err) return next({code: 400, message: err});

			// embed the model
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {}; data[collection] = {}; data[collection][req.params[model]] = req.body;
				var query = r.table(table).get(req.params[root]);
				r.branch(
					query.and(query(collection).hasFields(req.params[model])),
					query.update(data, {returnChanges: true}),
					false
				)
				.run(conn)
				.then(function(result){
					if(!result) return next(404);
					return res.send(result.changes[0].new_val[collection][req.params[model]]);
				})
				.catch(function(err){
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		},

		delete: function(req, res, next){
			if(!req.user) return next(401);
			if(!req.user.admin) return next(403);

			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				var data = {}; data[collection] = req.params[model];
				r.table(table)
				.get(req.params[root])
				.replace(r.row.without(data), {returnChanges: true})
				.run(conn)
				.then(function(result){
					if(!result || !result.changes[0].old_val || !result.changes[0].old_val[collection][req.params[model]]) return next(404);
					return res.send(result.changes[0].old_val[collection][req.params[model]]);
				})
				.catch(function(err){
					return next(err);
				})
				.finally(function(){
					resources.db.release(conn);
				});
			});
		}
	};
}
