'use strict';

var _ = require('lodash');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.CycleAssignment.query(
					conn,
					req.params.cycle,
					req.query,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignments){
					res.send(assignments);
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
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
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
					req.body,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.CycleAssignment.update(
					conn,
					req.params.cycle,
					req.params.assignment,
					req.body,
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
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
					req.user && req.user.admin && req.query.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(assignment){
					res.send(assignment);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
