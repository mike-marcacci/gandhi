'use strict';

var url = require('url');
var li = require('li');
var _ = require('lodash');
var r = require('rethinkdb');
var async = require('async');
var fs = require('fs');

module.exports = function(config, resources) {
	return {
		create: function(req, res) {
			if(!req.user)
				return res.error(401);

			// make sure we have files to upload
			if(!req.files || Object.keys(req.files).length === 0)
				return res.error(400);
			
			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// insert the file records into the db
				async.map(_.map(req.files),
					function(file, callback){
						r.table('files').insert({
							user_id: req.user.id,
							name: file.originalname,
							encoding: file.encoding,
							mimetype: file.mimetype,
							path: file.path,
							extension: file.extension,
							size: file.size,
							lock: false,
							created: r.now(),
							updated: r.now()
						}, {returnVals: true}).run(conn, callback);
					},
					function(err, results){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						res.status(201).send(_.pluck(results, 'new_val'));
					}
				);
			});
		},
		list: function(req, res) {
			if(!req.user)
				return res.error(401);

			// get the file records from the DB
			var query = r.table('files');

			// hide others' files from non-admin users
			if(!req.user.admin)
				query = query.filter({user_id: req.user.id});

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

					var links = {};
					var files = results.files;
					var pages = Math.ceil(results.total / per_page);

					function buildLink(query){
						return url.format({
							// protocol: req.protocol,
							// host: req.host,
							pathname: req.path,
							query: _.extend({}, req.query, query),
						});
					}

					// add links
					links.first = buildLink({page: 1, per_page: per_page});
					if(page && page != 1) links.prev = buildLink({page: page - 1, per_page: per_page});
					if(!page || page < pages) links.next = buildLink({page: page + 1, per_page: per_page});
					links.last = buildLink({page: pages, per_page: per_page});

					res.set('Link', li.stringify(links));
					res.send(files);
				});
			});
		},
		show: function(req, res) {
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

					fs.readFile(file.path, function(err, data){
						res.set('Content-Type', file.mimetype);
						res.set('Content-Length', file.size);
						res.set('Content-Disposition', 'attachment; filename="' + file.name + '"');
						return res.send(data);
					});
				});
			});
		},
		update: function(req, res) {
			if(!req.user)
				return res.error(401);

			// validate request against schema
			var err = resources.validator.validate('file', req.body, {checkRequired: false});
			if(err)
				return res.error({code: 400, message: err});

			// set timestamps
			delete req.body.created;
			req.body.updated = r.now();

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get files from the DB
				r.table('files').get(req.params.file).update(req.body, {returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var file = result.new_val;

					return res.send(file);
				});
			});
		},
		replace: function(req, res) {
			if(!req.user)
				return res.error(401);

			if(!req.user.admin)
				return res.error(403, 'Only administrators may replace a file.');

			// validate request against schema
			var err = resources.validator.validate('file', req.body, {useDefault: true});
			if(err)
				return res.error({code: 400, message: err});

			// set timestamps
			// req.body.created = r.row('created');
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
				r.table('files').get(req.params.file).replace(req.body, {returnVals: true}).run(conn, function(err, result){
					resources.db.release(conn);

					if(err)
						return res.error(err);

					var file = result.new_val;

					return res.send(file);
				});
			});
		},
		destroy: function(req, res) {
			if(!req.user)
				return res.error(401);

			// if(!req.user.admin)
			// 	return res.error(403, 'Only administrators may delete a file.');

			// TODO: check that there are no projects that depend on this file

			resources.db.acquire(function(err, conn) {
				if(err)
					return res.error(err);

				// get users from the DB
				r.table('files').get(req.params.file).run(conn, function(err, file){
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
					r.table('files').get(req.params.file).delete({returnVals: true}).run(conn, function(err, result){
						resources.db.release(conn);

						if(err)
							return res.error(err);

						if(!result.old_val)
							return res.error(500);

						var file = result.old_val;

						// destroy the actual file
						fs.unlink(file.path, function(err){
							if(err)
								return res.error(err);

							return res.send(file);
						});
					});
				});
			});
		}
	};
}
