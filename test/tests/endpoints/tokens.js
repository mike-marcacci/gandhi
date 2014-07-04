'use strict';

require('../../init.js');

var assert = require('chai').assert;
var request, token;

before(function(){
	request = global.setup.api;
});

describe('Tokens', function(){
	describe('create', function(){
		it('rejects unknown email', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'nonexistent@example.com',
					password: 'wrong password'
				})
				.expect(401)
				.end(function(err, res){
					assert.isNotNull(err);
					done();
				});
		});
		it('rejects incorrect password', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'mike.marcacci@gmail.com',
					password: 'wrong password'
				})
				.expect(401)
				.end(function(err, res){
					assert.isNotNull(err);
					done();
				});
		});
		it('returns a token for valid credentials', function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'mike.marcacci@gmail.com',
					password: 'mike1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isNull(err);
					done();
				});
		});
	});
});
