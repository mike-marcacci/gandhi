'use strict';

var r = require('rethinkdb');
var Q = require('q');

module.exports = function File(config, resources) {
	return {
		query: queryFiles,
		get: getFile,
		create: createFile,
		save: saveFile,
		update: updateFile,
		delete: deleteFile
	};

	function queryFiles(conn, query, user){
		if(!user) return Q.reject(401);

		// Filter Files
		// -------------

		var files = r.table('files');

		// hide others' from non-admin users
		if(user !== true)
			files = files.filter(r.row('user_id').eq(user.id));

		// filter
		if(query.filter) query.filter.forEach(function(f){
			files = files.filter(f);
		});

		// search
		if(typeof query.search === 'string' && query.search.length)
			files = files.filter(r.row('title').downcase().match(query.search.toLowerCase()));


		// Build Result
		// ------------

		var result = files;

		// sort
		if(query.sort)
			result = result.orderBy.apply(result.orderBy, query.sort);

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
			results.files.total = results.total;
			return results.files;
		});
	}


	function getFile(conn, fileId, user){
		if(!user) return Q.reject(401);
		return r.table('files').get(fileId).do(function(file){

			// get the file
			return r.branch(
				file.not(),
				r.error('{"code": 404, "message": "File not found."}'),

				// show any file to an admin
				user === true ?
				file

				// restrict non-admins to own files
				: r.branch(
					file('user_id').ne(user.id),
					r.error('{"code": 403, "message": "You do not have permission to view this file."}'),
					file
				)
			);
		}).run(conn);
	}


	function createFile(conn, data, user){
		if(!user) return Q.reject(401);

		if(user !== true && data.user_id !== user.id)
			return Q.reject({code: 403, message: 'Only an admin user may create a file on behaf of another user.'});

		// validate id
		if(data.id) return Q.reject({code: 400, message: 'File must not already have an id.'});

		// validate file
		var err = resources.validator.validate('http://www.gandhi.io/schema/file', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		var delta = r.expr(data).merge({
			id: r.uuid(),
			created: r.now().toEpochTime(),
			updated: r.now().toEpochTime()
		});

		// insert the file
		return delta.do(function(write){
			return r.table('files').insert(write).do(function(result){
				return r.branch(
					result('errors').gt(0),
					r.error('{"code": 500, "message": "Error writing to the database."}'),

					// return new value
					write
				);
			});
		}).run(conn);
	}


	function updateFile(conn, fileId, data, user){
		if(!user) return Q.reject(401);
		
		if(user !== true && data.user_id !== user.id)
			return Q.reject({code: 403, message: 'Only an admin user may create a file on behaf of another user.'});

		// validate id
		if(typeof data.id !== 'undefined' && fileId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate file
		var err = resources.validator.validate('http://www.gandhi.io/schema/file', data, {checkRequired: false});
		if(err) return Q.reject({code: 400, message: err});

		// get the file
		return r.table('files').get(fileId).do(function(file){
			var delta = r.expr(data).merge({
				path: file('path').default(''),
				updated: r.now().toEpochTime()
			});

			return r.branch(
				file.not(),
				r.error('{"code": 404, "message": "File not found."}'),

				// update the file
				file.merge(delta).do(function(write){
					return r.branch(
						r.table('files').get(fileId).replace(write)('errors').gt(0),
						r.error('{"code": 500, "message": "Error writing to the database."}'),

						// return new value
						write
					);
				})
			);
		}).run(conn);
	}


	function saveFile(conn, fileId, data, user){
		if(!user) return Q.reject(401);
		
		if(user !== true && data.user_id !== user.id)
			return Q.reject({code: 403, message: 'Only an admin user may create a file on behaf of another user.'});

		// validate id
		if(fileId !== data.id) return Q.reject({code: 400, message: 'The request body\'s id did not match the URL param.'});

		// validate file
		var err = resources.validator.validate('http://www.gandhi.io/schema/file', data, {useDefault: true});
		if(err) return Q.reject({code: 400, message: err});

		// get the file
		return r.table('files').get(fileId).do(function(file){
			var delta = r.literal(r.expr(data).merge({
				path: file('path').default(''),
				created: file('created').default(r.now().toEpochTime()),
				updated: r.now().toEpochTime()
			}));
			
			return r.branch(
				file.not(),
				r.error('{"code": 404, "message": "File not found."}'),

				// update the file
				file.merge(delta).do(function(write){
					return r.branch(
						r.table('files').get(fileId).replace(write)('errors').gt(0),
						r.error('{"code": 500, "message": "Error writing to the database."}'),

						// return new value
						write
					);
				})
			);
		}).run(conn);
	}


	function deleteFile(conn, fileId, user){
		if(!user) return Q.reject(401);
		if(user !== true) return Q.reject(403);
		return r.table('files').get(fileId).do(function(file){

			// get the file
			return r.branch(
				file.not(),
				r.error('{"code": 404, "message": "File not found."}'),

				// delete the file
				r.branch(
					r.table('files').get(fileId).delete()('errors').gt(0),
					r.error('{"code": 500, "message": "Error writing to the database."}'),

					// return old value
					file
				)
			);
		}).run(conn);
	}

};
