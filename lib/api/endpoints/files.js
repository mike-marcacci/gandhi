'use strict';

var fs = require('fs');
var url = require('url');
var li = require('li');
var _ = require('lodash');
var r = require('rethinkdb');
var passport = require('passport');
var scrypt = require('scrypt');
	scrypt.hash.config.keyEncoding = scrypt.verify.config.keyEncoding = 'utf8';
	scrypt.hash.config.outputEncoding = scrypt.verify.config.outputEncoding = 'base64';

module.exports = function(config, router, resources){

	var controller = require('../controllers/users');

	//////////////
	// Files
	//////////////
	router.get('/api/users/:user/files/:file', function(req, res){

		// TODO: restrict access for non-admin users???

		var root = config.files.directory + '/' + req.params.user + '/';
		var file = root + '/' + req.params.file;

		if(!fs.existsSync(file))
			return res.error(404);

		return res.sendfile(file);
	});

	router.post('/api/users/:user/files', function(req, res){

		// restrict access to self for non-admin users
		if(!req.user.admin && req.user.id != req.params.user)
			return res.error(403);

		var response = {};
		_.each(req.files, function(file){

			// make sure files directory exists
			if(!fs.existsSync(config.files.directory + '/'))
				fs.mkdirSync(config.files.directory + '/');

			// build the destination root
			var root = config.files.directory + '/' + req.params.user + '/';

			// name the file
			var filename = Date.now() + '-' + file.originalFilename;

			// make sure user files directory exists
			if(!fs.existsSync(root))
				fs.mkdirSync(root);

			// move the file to its destination
			fs.renameSync(file.path, root + filename);

			response[file.fieldName] = {
				path: '/users/' + req.params.user + '/files/' + encodeURIComponent(filename),
				filename: filename
			};
		});

		// TODO: record this in the DB along with the user, etc

		res.send(200, response);
	});
};
