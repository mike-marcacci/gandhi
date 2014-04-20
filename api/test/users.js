var assert = require("assert");
var request = require('request');
var apiUrl = 'http://localhost:3000';


request({ uri: apiUrl + '/tokens', form: {email: 'test@gandhi.io', password: '123456'}, method: 'post', json: true}, function(err, res, body) {
	var token = body.token;

	describe('Users', function(){

		describe('list', function(){

			it('should reject anonymous access', function(done){
				request({ uri: apiUrl + '/users', method: 'get', json: true}, function(err, res, body) {
					assert.equal(res.statusCode, 401);
					done();
				});
			});

			it('should list users', function(done){
				request({ uri: apiUrl + '/users', method: 'get', headers: {'Authorization': 'Bearer '+token}, json: true}, function(err, res, body) {
					assert.equal(res.statusCode, 200);
					assert(body.data);
					assert.equal(body.data.constructor.name, 'Array')
					done();
				});
			});

		});



		describe('show', function(){

			it('should reject anonymous access', function(done){
				request({ uri: apiUrl + '/user', method: 'get', json: true}, function(err, res, body) {
					assert.equal(res.statusCode, 401);
					done();
				});
			});

			it('should show the currently logged in user by default', function(done){
				request({ uri: apiUrl + '/user', method: 'get', headers: {'Authorization': 'Bearer '+token}, json: true}, function(err, res, body) {
					assert.equal(res.statusCode, 200);
					assert(body.data);
					assert.equal(body.data.id, 'f555ced3-363b-49fc-a9ec-b94df6cf60e7');
					done();
				});
			});

			it('should show the specified user', function(done){
				request({ uri: apiUrl + '/user/c5262654-70fc-427c-8250-7652478d74e6', method: 'get', headers: {'Authorization': 'Bearer '+token}, json: true}, function(err, res, body) {
					assert.equal(res.statusCode, 200);
					assert(body.data);
					assert.equal(body.data.id, 'c5262654-70fc-427c-8250-7652478d74e6');
					done();
				});
			});

		});


		describe('create', function(){

			it('should allow anonymous access', function(done){
				request({ uri: apiUrl + '/users', method: 'post', json: true}, function(err, res, body) {
					assert.notEqual(res.statusCode, 401);
					done();
				});
			});

			it('should allow authenticated access', function(done){
				request({ uri: apiUrl + '/users', method: 'post', headers: {'Authorization': 'Bearer '+token}, json: true}, function(err, res, body) {
					assert.notEqual(res.statusCode, 401);
					done();
				});
			});

			it('should return authentication token on successful create', function(done){
				request({ uri: apiUrl + '/users', method: 'post', form: {email:'test+'+Date.now()+'@gandhi.io', password: '123456', name: 'TEST-CI'}, json: true}, function(err, res, body) {
					assert.equal(res.statusCode, 203);
					assert.equal(typeof res.body.token, 'string');
					done();
				});
			});

			// it('should NOT return authentication token on authenticated access', function(done){
			// 	request({ uri: apiUrl + '/users', method: 'post', form: {email:'test+'+Date.now()+'@gandhi.io', password: '123456', name: 'TEST-CI'}, json: true}, function(err, res, body) {
			// 		assert.equal(res.statusCode, 201);
			// 		assert.equal(typeof res.body.token, 'undefined');
			// 		done();
			// 	});
			// });

		});


		describe('update', function(){

			it('should reject anonymous access', function(done){
				request({ uri: apiUrl + '/user', method: 'patch', json: true}, function(err, res, body) {
					assert.equal(res.statusCode, 401);
					done();
				});
			});

			it('should return authentication token on successful update', function(done){
				var now = Date.now();
				request({ uri: apiUrl + '/user', method: 'patch', headers: {'Authorization': 'Bearer '+token}, form: {name: 'TEST-BASE-'+now}, json: true}, function(err, res, body) {
					assert.equal(res.statusCode, 203);
					assert.equal(body.data.id, 'f555ced3-363b-49fc-a9ec-b94df6cf60e7');
					assert.equal(res.body.data.name, 'TEST-BASE-'+now);
					assert.equal(typeof res.body.token, 'string');
					done();
				});
			});

		});

	});

});
