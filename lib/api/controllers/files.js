'use strict';

var _          = require('lodash');
var Promise    = require('bluebird');
var controller = require('../controller.js');
var errors     = require('../errors.js');
var using      = Promise.using;

var File       = require('../models/File');
var Files      = require('../collections/Files');
var files      = new Files();

function prepare(record) {
	if(Array.isArray(record)) return record.map(prepare);
	delete record.password;
	delete record.recovery_token;
	return record;
}

module.exports = function(config, resources) {
	return {
		query: function(req, res, next){
			
			// parse the query
			var query = controller.parseQuery(req.query);

			// restrict to the provided given user
			if(req.params.user || req.query.user)
				query.userId = req.params.user || req.query.user;

			return using(resources.db.disposer(), function(conn){
				return files.query(
					conn,
					query,
					req.admin || req.user
				);
			})
			.then(function(files){

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					files.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(files));
			})
			.catch(next);
		},

		get: function(req, res, next){

			// because these need to be access anonymously, the user
			// is always unaffiliated
			var user = false;

			return using(resources.db.disposer(), function(conn){
				return files.get(
					conn,
					req.params.file,
					user
				);
			})
			.then(function(file){
				
				// just send the db record
				if(!req.query.download)
					return res.send(file);

				// download the file
				return res.download(file.path, file.name);
			})
			.catch(next);
		},

		save: function(req, res, next){
			return res.status(405).send();
		},

		update: function(req, res, next){
			return using(resources.db.disposer(), resources.redlock.disposer('files:' + req.params.file, 1000), function(conn){
				return files.get(
					conn,
					req.params.file,
					req.admin || req.user
				)
				.then(function(file){
					return file.update(conn, req.body);
				});
			})
			.then(function(file){
				res.send(prepare(file));
			})
			.catch(next);
		},

		create: function(req, res, next){
			return using(resources.db.disposer(), function(conn){

				// make sure we have files to upload
				if(!req.files || Object.keys(req.files).length === 0)
					return new Promise.reject(new errors.ValidationError());

				// add all uploaded files to the db
				return Promise.map(_.values(req.files), function(file){
					return File.create(conn, {
						user_id: req.user.id,
						name: file.originalname,
						encoding: file.encoding,
						mimetype: file.mimetype,
						path: file.path,
						extension: file.extension,
						size: file.size,
						lock: false,
					}, req.admin || req.user);
				});
			})
			.then(function(files){
				res.status(201).send(prepare(files));
			})
			.catch(next);
		},

		delete: function(req, res, next){
			return using(resources.db.disposer(), resources.redlock.disposer('files:' + req.params.file, 1000), function(conn){
				return files.get(
					conn,
					req.params.file,
					req.admin || req.user
				)
				.then(function(file){
					
					// can only be deleted by admin
					if(!req.admin)
						return new Promise.reject(new errors.ForbiddenError());

					return file.delete(conn);
				});
			})
			.then(function(file){
				res.send(prepare(file));
			})
			.catch(next);
		}

	};
};
