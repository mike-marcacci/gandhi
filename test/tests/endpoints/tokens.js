'use strict';

require('../../init.js');

var assert = require('chai').assert;
var request;

before(function(){
	request = global.setup.api;
});

describe('Tokens', function(){
	describe('create', function(){
		it('rejects misformatted credentials', function(done){
			request
				.post('/api/tokens')
				.send({
					cool: 'beans'
				})
				.expect(400)
				.end(function(err, res){
					assert.isUndefined(res.body.token);
					done(err);
				});
		});
		it('rejects unknown email', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'null@test.gandhi.io',
					password: 'wrong password'
				})
				.expect(404)
				.end(function(err, res){
					assert.isUndefined(res.body.token);
					done(err);
				});
		});
		it('rejects incorrect password', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'mike.marcacci@test.gandhi.io',
					password: 'wrong password'
				})
				.expect(401)
				.end(function(err, res){
					assert.isUndefined(res.body.token);
					done(err);
				});
		});
		it('returns a token for valid credentials', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'mike.marcacci@test.gandhi.io',
					password: 'mike1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isNull(err);
					assert.isString(res.body.token);
					done(err);
				});
		});
	});
});
