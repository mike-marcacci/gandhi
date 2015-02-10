'use strict';

var _ = require('lodash');

module.exports = function(config, resources) {
	return {
		list: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				// TODO: build query from req.query
				var query = {};

				resources.collections.Content.query(
					conn,
					req.params.project,
					query,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(contents){
					res.send(contents);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		get: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Content.get(
					conn,
					req.params.project,
					req.params.content,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(content){
					res.send(content);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		put: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Content.save(
					conn,
					req.params.project,
					req.params.content,
					req.body,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(content){
					res.send(content);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		patch: function(req, res, next){
			return resources.db.acquire(function(err, conn){
				if(err) return next(err);

				resources.collections.Content.update(
					conn,
					req.params.project,
					req.params.content,
					req.body,
					req.user && req.user.admin ? true : req.user
				)
				.finally(function(){
					resources.db.release(conn);
				})
				.then(function(content){
					res.send(content);
				})
				.catch(function(err){
					return next(err);
				});
			});
		},

		post: function(req, res, next){
			return res.status(405).send();
		},

		delete: function(req, res, next){
			return res.status(405).send();
		},

	};
};
