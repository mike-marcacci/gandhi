'use strict';

var Promise    = require('bluebird');
var express    = require('express');
var bodyParser = require('body-parser');

var errors     = require('./api/errors');
var Users      = require('./api/collections/Users');
var users      = new Users();

module.exports = function(config, resources) {
	var router = express.Router();

	config.sso.path = config.sso.path || '/sso';
	var saml = new (require('passport-saml').SAML)(config.sso);


	// redirect to the identity provider
	router.get('/', function(req, res, next) {
		saml.getAuthorizeUrl(req, function(err, url) {
			if(err) return next(err);
			res.redirect(url);
		});
	});



	// process the SSO response
	router.post('/',
		bodyParser.urlencoded({extended: true}),
		function(req, res, next) {

			if (req.body && req.body.SAMLResponse)
				return saml.validatePostResponse(req.body, processProfile);

			if (req.body && req.body.SAMLRequest)
				return saml.validatePostRequest(req.body, processProfile);

			else
				return next(new errors.ValidationError('No SAMLResponse or SAMLRequest present.'));

			function processProfile(err, profile, isLoggedOut){
				if(err) return next(err);

				// The user is supposed to be logged out
				if (isLoggedOut) {
					return res.status(401).send();

					// TODO: log the user out... which has to be done client side since
					// we don't actually use sessions or even cookies for auth
					//
					// if (profile) {
					// 	req.samlLogoutRequest = profile;
					// 	return saml.getLogoutResponseUrl(req, function(err) {
					//		if(err) return next(err);
					//		return res.redirect('/');
					//  });
					// }
				}





				// grab a db conn
				return Promise.using(resources.db.disposer(), function(conn) {

					// look for a user by email
					return users.query(conn, {email: profile.email})
					.then(function(u){

						// no such user, create a new onw
						if(!u.length) return users.create(conn, {
							email: profile.email,
							name: profile.cn || '',
							password: resources.auth.random()
						});

						// the current user
						return u[0];
					});
				})

				// sign a token and redirect
				.then(function(user) {

					// sign the token
					var token = resources.auth.signToken({admin: user.admin}, { expiresInMinutes: 24*60, subject: user.id });

					// redirect the user
					res.redirect(req.protocol + '://' + (req.headers.host || req.hostname) + config.root + '/#/?token=' + token);
				})

				.catch(next);
			}
		}
	);

	return router;
};


