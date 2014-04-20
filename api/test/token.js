var assert = require("assert");
var request = require('request');
var apiUrl = 'http://localhost:3000';

describe('Tokens', function(){
		
	it('should block anonymous access to protected paths', function(done){
		request.get(apiUrl + '/users', {}, function(err, res, body) {
			assert.equal(res.statusCode, 401);
			done();
		});
	});

	it('should allow anonymous access to excluded paths', function(done){
		request.post(apiUrl + '/tokens', {}, function(err, res, body) {
			assert.notEqual(res.statusCode, 401);
			done();
		});
	});


	var token;

	/*************************
	 * Begin endpoint tests
	 */

	it('should not return a token for invalid credentials', function(done){
		request({ uri: apiUrl + '/tokens', form: {email: 'test@gandhi.io', password: 'wrong-password'}, method: 'post', json: true}, function(err, res, body) {
			assert.equal(res.statusCode, 400);
			done();
		});
	});

	it('should return a token for valid credentials', function(done){
		request({ uri: apiUrl + '/tokens', form: {email: 'test@gandhi.io', password: '123456'}, method: 'post', json: true}, function(err, res, body) {
			assert.equal(res.statusCode, 201);
			assert(typeof body.token != 'undefined');
			token = body.token;
			done();
		});
	});

	/*
	 * End endpoint tests
	 *************************/

	it('should allow authenticated access to protected paths', function(done){
		request({ uri: apiUrl + '/users', method: 'get', headers: {'Authorization': 'Bearer '+token}}, function(err, res, body) {
			assert.equal(res.statusCode, 200);
			done();
		});
	});

});
