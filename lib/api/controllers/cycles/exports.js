'use strict';

var _ = require('lodash');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Export.query(
					conn,
					req.params.cycle,
					req.query,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(exports){
					res.send(exports);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Export.get(
					conn,
					req.params.cycle,
					req.params.export,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(exp){
					res.send(exp);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Export.save(
					conn,
					req.params.cycle,
					req.params.export,
					req.body,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(exp){
					res.send(exp);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Export.update(
					conn,
					req.params.cycle,
					req.params.export,
					req.body,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(exp){
					res.send(exp);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Export.create(
					conn,
					req.params.cycle,
					req.body,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(exp){
					res.send(exp);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		delete: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Export.delete(
					conn,
					req.params.cycle,
					req.params.export,
					req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(exp){
					res.send(exp);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

	};
};
