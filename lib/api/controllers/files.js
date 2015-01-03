'use strict';

var url = require('url');
var _ = require('lodash');
var r = require('rethinkdb');
var async = require('async');
var fs = require('fs');

var controller = require('../controller.js');

function sanitize(o){
	delete o.href;
	delete o.id;
}

module.exports = function(config, resources) {
	return {
		post: function(req, res, next) {
			if(!req.user)
				return next(401);

			// sanitize the input
			sanitize(req.body);

			// make sure we have files to upload
			if(!req.files || Object.keys(req.files).length === 0)
				return next(400);
			
			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// insert the file records into the db
				r.table('files').insert(_.map(req.files, function(file){
					return {
						user_id: req.user.id,
						name: file.originalname,
						encoding: file.encoding,
						mimetype: file.mimetype,
						path: file.path,
						extension: file.extension,
						size: file.size,
						lock: false,
						created: r.now().toEpochTime(),
						updated: r.now().toEpochTime()
					};
				}), {returnChanges: true})('changes').map(function(row){
					return row('new_val');
				}).run(conn, function(err, results){
					resources.db.release(conn);

					if(err)
						return next(err);

					res.status(201).send(results);
				});
			});
		},
		list: function(req, res, next) {
			if(!req.user)
				return next(401);

			// get the file records from the DB
			var query = r.table('files');

			// hide others' files from non-admin users
			if(!req.user.admin)
				query = query.filter({user_id: req.user.id});

			// filter by user
			if(req.params.user)
				query = query.filter({user_id: req.params.user});

			// filter
			query = controller.filter(req, query);

			// search
			if(req.query.search && req.query.search !== '')
				query = query.filter(r.row('title').downcase().match(req.query.search.toLowerCase()));

			// sort
			query = controller.sort(req, query);

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				var per_page = parseInt(req.query.per_page, 10) || 50;
				var page = parseInt(req.query.page, 10) || 1;

				r.expr({
					// get the total results count
					total: query.count(),
					// get the results for this page
					files: query.skip(per_page * (page - 1)).limit(per_page).coerceTo('array')
				}).run(conn, function(err, results){
					resources.db.release(conn);

					if(err)
						return next(err);

					var files = results.files;

					// set pagination headers
					controller.paginate(req, res, page, per_page, results.total);

					res.send(files);
				});
			});
		},
		get: function(req, res, next) {
			// if(!req.user)
			// 	return next(401);

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// get files from the DB
				r.table('files').get(req.params.file).run(conn, function(err, file){
					resources.db.release(conn);

					if(err)
						return next(err);

					if(!file)
						return next(404);

					// hide others' files from non-admin users
					// if(!file || (!req.user.admin && files.user_id !== req.user.id))
					// 	return next(404);

					fs.readFile(file.path, function(err, data){
						if(err)
							return next(err);

						res.set('Content-Type', file.mimetype);
						res.set('Content-Length', file.size);
						res.set('Content-Disposition', 'attachment; filename="' + file.name + '"');
						return res.send(data);
					});
				});
			});
		},
		patch: function(req, res, next) {
			if(!req.user)
				return next(401);

			// sanitize the input
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/file', req.body, {checkRequired: false});
			if(err)
				return next({code: 400, message: err});

			// make sure path is not changes
			delete req.body.path;

			// set timestamps
			delete req.body.created;
			req.body.updated = r.now().toEpochTime();

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// get files from the DB
				r.table('files').get(req.params.file).update(req.body, {returnChanges: true})('changes').nth(0)('new_val').run(conn, function(err, file){
					resources.db.release(conn);

					if(err)
						return next(err);

					return res.send(file);
				});
			});
		},
		put: function(req, res, next) {
			if(!req.user)
				return next(401);

			if(!req.user.admin)
				return next(403, 'Only administrators may replace a file.');

			// sanitize the input
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('http://www.gandhi.io/schema/file', req.body, {useDefault: true});
			if(err)
				return next({code: 400, message: err});

			// inject ID
			req.body.id = req.params.file;

			// make sure path is not changed
			req.body.path = r.row('path');

			// set timestamps
			req.body.created = r.row('created').default(r.now().toEpochTime());
			req.body.updated = r.now().toEpochTime();

			// transform dates
			if(typeof req.body.open === 'string')
				req.body.open = new Date(req.body.open);

			if(typeof req.body.close === 'string')
				req.body.close = new Date(req.body.close);

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// get files from the DB
				r.table('files').get(req.params.file).replace(req.body, {returnChanges: true})('changes').nth(0)('new_val').run(conn, function(err, file){
					resources.db.release(conn);

					if(err)
						return next(err);

					return res.send(file);
				});
			});
		},
		delete: function(req, res, next) {
			if(!req.user)
				return next(401);

			// if(!req.user.admin)
			// 	return next(403, 'Only administrators may delete a file.');

			// TODO: check that there are no projects that depend on this file

			resources.db.acquire(function(err, conn) {
				if(err)
					return next(err);

				// get files from the DB
				r.table('files').get(req.params.file).run(conn, function(err, file){
					if(err) {
						resources.db.release(conn);
						return next(err);
					}

					if(!file) {
						resources.db.release(conn);
						return next(404);
					}

					if(file.user_id === req.user.id && !req.user.admin) {
						resources.db.release(conn);
						return next(403);
					}

					if(file.lock) {
						resources.db.release(conn);
						return next(423);
					}

					// destroy the db entry
					r.table('files').get(req.params.file).delete().run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return next(err);

						// TODO: unlink the file

						res.set('Content-Type', file.mimetype);
						res.set('Content-Length', file.size);
						res.set('Content-Disposition', 'attachment; filename="' + file.name + '"');
						return res.send(file);
					});
				});
			});
		}
	};
}
