'use strict';

require('../../../init.js');

var li = require('li');
var r = require('rethinkdb');
var _ = require('lodash');
var jwt = require('jsonwebtoken');

var assert = require('chai').assert;
var request, fixtures;

var blacklist = ['password', 'recovery_token'];
var whitelist = ['id', 'email', 'name', 'href', 'admin', 'created','updated'];

before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.cycles;
});

describe('Statuses', function(){
	var adminToken, adminId, userToken, userId, statusId;

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'mike.marcacci@test.gandhi.io',
				password: 'mike1234'
			})
			.expect(201)
			.expect(function(res){
				assert.isString(res.body.token);
				adminToken = res.body.token;
				adminId = jwt.decode(adminToken).sub;
			})
			.end(done);
	});

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'tim.marcacci@test.gandhi.io',
				password: 'tim1234'
			})
			.expect(201)
			.expect(function(res){
				assert.isString(res.body.token);
				userToken = res.body.token;
				userId = jwt.decode(userToken).sub;
			})
			.end(done);
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses')
				.expect(401)
				.expect(function(res){
					assert.isNotArray(res.body);
				})
				.end(done);
		});
		it('shows all statuses to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 4);
				})
				.end(done);
		});
		it('shows all statuses to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 4);
				})
				.end(done);
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/archived')
				.expect(401)
				.end(done);
		});
		it('shows a status to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/archived')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'archived');
				})
				.end(done);
		});
		it('shows a status to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/archived')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'archived');
				})
				.end(done);
		});
	});

	describe('#post', function(){
		it('rejects an anonymous post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses')
				.send({title:'Test'})
				.expect(401)
				.end(done);
		});
		it('rejects a post by a non-admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses')
				.set('Authorization', 'Bearer ' + userToken)
				.send({title:'Test'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'foo',title:'Test'})
				.expect(400)
				.end(done);
		});
		it('allows a post by an admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title:'Test'})
				.expect(200)
				.expect(function(res){
					assert.isString(res.body.id);
					statusId = res.body.id;
				})
				.end(done);
		});
	});

	describe('#patch', function(){
		it('rejects an anonymous post', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/' + statusId)
				.send({title:'Oops'})
				.expect(401)
				.end(done);
		});
		it('rejects a patch by a non-admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/' + statusId)
				.set('Authorization', 'Bearer ' + userToken)
				.send({title:'Oops'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/' + statusId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/' + statusId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'foo',title:'Test'})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title:'Oops'})
				.expect(404)
				.expect(function(res){
				})
				.end(done);
		});
		it('allows an existing patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/' + statusId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title:'Patched'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.title, 'Patched');
				})
				.end(done);
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/' + statusId)
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/' + statusId)
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('deletes a status for an admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/statuses/' + statusId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, statusId);
				})
				.end(done);
		});
	});

});
