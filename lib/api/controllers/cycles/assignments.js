'use strict';

var _ = require('lodash');

function sanitize(o){
	if(Array.isArray(o)) return o.map(sanitize);
	return _.omit(o, 'cycle_id');
}

function prepare(o, c){
	if(Array.isArray(o)) return o.map(function(o){ return prepare(o, c); });
	return _.extend(o, {
		cycle_id: c
	});
}

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// TODO: build query from req.query
				var query = {};

				resources.collections.CycleAssignment.query(
					conn,
					req.params.cycle,
					query,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignments){
					res.send(prepare(assignments));
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.CycleAssignment.get(
					conn,
					req.params.cycle,
					req.params.assignment,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(prepare(assignment));
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.CycleAssignment.save(
					conn,
					req.params.cycle,
					req.params.assignment,
					sanitize(req.body),
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(prepare(assignment));
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return res.status(405).send();
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.CycleAssignment.update(
					conn,
					req.params.cycle,
					req.params.assignment,
					sanitize(req.body),
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(prepare(assignment));
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.CycleAssignment.delete(
					conn,
					req.params.cycle,
					req.params.assignment,
					req.user && req.user.admin && req.query.admin === 'true' ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(prepare(assignment));
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
