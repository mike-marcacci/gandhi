'use strict';

var url = require('url');
var qs = require('qs');
var op = require('objectpath');
var li = require('li');
var _ = require('lodash');
var r = require('rethinkdb');
var async = require('async');
var fs = require('fs');

function sanitize(o){
	delete o.href;
	delete o.id;
}

module.exports = function(config, resources) {
	return {
		create: function(req, res, next) {
			if(!req.user)
				return res.error(401);

			// sanitize the input
			sanitize(req.body);

			// make sure we have files to upload
			if(!req.files || Object.keys(req.files).length === 0)
				return res.error(400);
			
			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// insert the file records into the db
				async.map(_.map(req.files),
					function(file, callback){

						// read the file from the uploads directory
						fs.readFile(file.path, function(err, data) {
							if(err)
								return callback(err);

							r.table('files').insert({
								user_id: req.user.id,
								name: file.originalname,
								encoding: file.encoding,
								mimetype: file.mimetype,
								data: data,
								extension: file.extension,
								size: file.size,
								lock: false,
								created: r.now(),
								updated: r.now()
							}, {returnChanges: true})('new_val').without('data').run(conn, function(err, result){
								if(err)
									return callback(err);

								// delete file from the uploads directory
								fs.unlink(file.path, function (err) {
								  return callback(undefined, result); // TODO: do we care if this errors?
								});
							})
						});
					},
					function(err, results){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						res.status(201).send(results);
					}
				);
			});
		},
		list: function(req, res, next) {
			if(!req.user)
				return res.error(401);

			// get the file records from the DB
			var query = r.table('files');

			// hide others' files from non-admin users
			if(!req.user.admin)
				query = query.filter({user_id: req.user.id});

			// filter by user
			if(req.params.user)
				query = query.filter({user_id: req.params.user});

			// filter
			if(req.query.filter)
				query = query.filter(_.transform(req.query.filter, function(base, value, path) {
					try { value = JSON.parse(value); } catch(e){}
					var o = op.parse(path), l = o.length - 1, cursor = base;
					for (var i in o) {
						cursor = cursor[o[i]] = i < l ? {} : value;
					}
					return base;
				}));

			// search
			if(req.query.search && req.query.search !== '')
				query = query.filter(r.row('title').downcase().match(req.query.search.toLowerCase()));

			// sort
			if(typeof req.query.sort === 'string') {
				var pointer = r.row;
				op.parse(req.query.sort).forEach(function(key){
					pointer = pointer(key);
				});
				query = req.query.direction === 'desc' ? query.orderBy(r.desc(pointer)) : query.orderBy(pointer);
			}

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

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
						return res.error(err);

					var files = results.files;
					var pages = {
						first: 1,
						last: Math.ceil(results.total / per_page)
					};

					if(page > 1)
						pages.prev = page - 1;

					if(page < pages.last)
						pages.next = page + 1;

					res.set('Pages', JSON.stringify(pages));
					res.set('Link', li.stringify(_.mapValues(pages, function(value){
						return req.path + '?' + qs.stringify(_.extend({}, req.query, {page: value, per_page: per_page}));
					})));
					res.send(files);
				});
			});
		},
		show: function(req, res, next) {
			// if(!req.user)
			// 	return res.error(401);

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get files from the DB
				r.table('files').get(req.params.file).run(conn, function(err, file){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					if(!file)
						return res.error(404);

					// hide others' files from non-admin users
					// if(!file || (!req.user.admin && files.user_id !== req.user.id))
					// 	return res.error(404);

					res.set('Content-Type', file.mimetype);
					res.set('Content-Length', file.size);
					res.set('Content-Disposition', 'attachment; filename="' + file.name + '"');
					return res.send(file.data);
				});
			});
		},
		update: function(req, res, next) {
			if(!req.user)
				return res.error(401);

			// sanitize the input
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('file', req.body, {checkRequired: false});
			if(err)
				return res.error({code: 400, message: err});

			// make sure data is not replaced
			delete req.body.data;

			// set timestamps
			delete req.body.created;
			req.body.updated = r.now();

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get files from the DB
				r.table('files').get(req.params.file).update(req.body, {returnChanges: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var file = result.new_val;

					return res.send(file);
				});
			});
		},
		replace: function(req, res, next) {
			if(!req.user)
				return res.error(401);

			if(!req.user.admin)
				return res.error(403, 'Only administrators may replace a file.');

			// sanitize the input
			sanitize(req.body);

			// validate request against schema
			var err = resources.validator.validate('file', req.body, {useDefault: true});
			if(err)
				return res.error({code: 400, message: err});

			// inject ID
			req.body.id = req.params.files;

			// make sure data is not replaced
			req.body.data = r.row('data');

			// set timestamps
			req.body.created = r.row('created');
			req.body.updated = r.now();

			// transform dates
			if(typeof req.body.open === 'string')
				req.body.open = new Date(req.body.open);

			if(typeof req.body.close === 'string')
				req.body.close = new Date(req.body.close);

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get files from the DB
				r.table('files').get(req.params.file).replace(req.body, {returnChanges: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var file = result.new_val;

					return res.send(file);
				});
			});
		},
		destroy: function(req, res, next) {
			if(!req.user)
				return res.error(401);

			// if(!req.user.admin)
			// 	return res.error(403, 'Only administrators may delete a file.');

			// TODO: check that there are no projects that depend on this file

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get users from the DB
				r.table('files').get(req.params.file).without('data').run(conn, function(err, file){
					if(err) {
						resources.db.release(conn);
						return res.error(err);
					}

					if(!file) {
						resources.db.release(conn);
						return res.error(404);
					}

					if(file.user_id === req.user.id && !req.user.admin) {
						resources.db.release(conn);
						return res.error(403);
					}

					if(file.lock) {
						resources.db.release(conn);
						return res.error(423);
					}

					// destroy the db entry
					r.table('files').get(req.params.file).delete().run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return res.error(err);

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
