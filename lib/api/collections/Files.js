'use strict';

var r       = require('rethinkdb');
var Promise = require('bluebird');
var errors  = require('../errors');

var File = require('../models/File');

function Files(){}

Files.prototype.query = function(conn, query, user) {

	// Filter Files
	// --------------------

	var files = r.table('files');

	// OPTIMIZATION: restrict to own files for non-admin users
	if(user !== true)
		files = files.filter({user_id: user.id});

	// restrict to user
	if(typeof query.userId === 'string')
		files = files.filter({user_id: query.userId});

	// filter
	if(query.filter) query.filter.forEach(function(f){
		files = files.filter(f);
	});

	// search
	if(typeof query.search === 'string' && query.search.length)
		files = files.filter(r.or(
			r.row('name').downcase().match(query.search.toLowerCase()),
			r.row('email').downcase().match(query.search.toLowerCase())
		));


	// Build Result
	// ------------

	var result = files;

	// sort
	if(query.sort)
		result = result.orderBy.apply(result, query.sort);

	// skip
	if(query.skip)
		result = result.skip(query.skip);

	// limit
	if(query.limit)
		result = result.limit(query.limit);

	return r.expr({

		// get the total results count
		total: files.count(),

		// get the processed files
		files: result.coerceTo('array')

	}).run(conn)

	// return as an array
	.then(function(results){
		return Promise.filter(results.files.map(function(data){
			return new File(conn, data, user)
			.catch(function(err){

				// suppress ForbiddenError
				if(err instanceof errors.ForbiddenError)
					return null;

				// re-throw all other errors
				return Promise.reject(err);
			});
		}), function(c){ return !!c; })
		.then(function(files){
			files.total = results.total;
			return files;
		});
	});
};


Files.prototype.get = function(conn, id, user) {
	return r.table('files').get(id).run(conn).then(function(data) {
		if(!data) return Promise.reject(new errors.NotFoundError());
		return new File(conn, data, user);
	});
};


Files.prototype.create = function(conn, data, user) {
	return File.create(conn, data, user);
};


module.exports = Files;
