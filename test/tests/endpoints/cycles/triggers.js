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

describe('Triggers', function(){
	var adminToken, adminId, userToken, userId, triggerId;

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
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers')
				.expect(401)
				.expect(function(res){
					assert.isNotArray(res.body);
				})
				.end(done);
		});
		it('shows all triggers to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 8);
				})
				.end(done);
		});
		it('shows all triggers to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 8);
				})
				.end(done);
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/accept')
				.expect(401)
				.end(done);
		});
		it('shows a trigger to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/accept')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'accept');
				})
				.end(done);
		});
		it('shows a trigger to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/accept')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'accept');
				})
				.end(done);
		});
	});

	describe.skip('#post', function(){});

	describe('#post', function(){
		it('rejects an anonymous post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers')
				.send({conditions:[[{name:'date',invert:false,options:{timestamp:1412164799.999}}]],listeners:[],title:'Test Trigger'})
				.expect(401)
				.end(done);
		});
		it('rejects a post by a non-admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers')
				.set('Authorization', 'Bearer ' + userToken)
				.send({conditions:[[{name:'date',invert:false,options:{timestamp:1412164799.999}}]],listeners:[],title:'Test Trigger'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({conditions:[[{name:'date',invert:false,options:{timestamp:1412164799.999}}]],id:'foo',listeners:[],title:'Test Trigger'})
				.expect(400)
				.end(done);
		});
		it('allows a post by an admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({conditions:[[{name:'date',invert:false,options:{timestamp:1412164799.999}}]],listeners:[],title:'Test Trigger'})
				.expect(200)
				.expect(function(res){
					assert.isString(res.body.id);
					triggerId = res.body.id;
				})
				.end(done);
		});
	});

	describe('#patch', function(){
		it('rejects an anonymous post', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/' + triggerId)
				.send({title:'Oops'})
				.expect(401)
				.end(done);
		});
		it('rejects a patch by a non-admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/' + triggerId)
				.set('Authorization', 'Bearer ' + userToken)
				.send({title:'Oops'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/' + triggerId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/' + triggerId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({conditions:[[{name:'date',invert:false,options:{timestamp:1412164799.999}}]],id:'foo',listeners:[],title:'Test Trigger'})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/foo')
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
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/' + triggerId)
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
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/' + triggerId)
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/' + triggerId)
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('deletes a trigger for an admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/triggers/' + triggerId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, triggerId);
				})
				.end(done);
		});
	});

});
