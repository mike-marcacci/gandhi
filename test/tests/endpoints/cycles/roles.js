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

describe('Roles', function(){
	var adminToken, adminId, userToken, userId, roleId;

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
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.expect(401)
				.expect(function(res){
					assert.isNotArray(res.body);
				})
				.end(done);
		});
		it('shows all roles to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 4);
				})
				.end(done);
		});
		it('shows all roles to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
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
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/advisor')
				.expect(401)
				.end(done);
		});
		it('shows a role to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/advisor')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'advisor');
				})
				.end(done);
		});
		it('shows a role to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/advisor')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'advisor');
				})
				.end(done);
		});
	});

	describe('#post', function(){
		it('rejects an anonymous post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.send({assignable:{staff:true},title:'Test',visible:{advisor:true,reviewer:true,staff:true,test:true}})
				.expect(401)
				.end(done);
		});
		it.skip('rejects a post by a non-admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.set('Authorization', 'Bearer ' + userToken)
				.send({assignable:{staff:true},title:'Test',visible:{advisor:true,reviewer:true,staff:true,test:true}})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('allows a post by an admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({assignable:{staff:true},title:'Test',visible:{advisor:true,reviewer:true,staff:true,test:true}})
				.expect(200)
				.expect(function(res){
					assert.isString(res.body.id);
					roleId = res.body.id;
				})
				.end(done);
		});
	});

	describe('#patch', function(){
		it('rejects an anonymous post', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/' + roleId)
				.send({title:'Oops'})
				.expect(401)
				.end(done);
		});
		it('rejects a patch by a non-admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/' + roleId)
				.set('Authorization', 'Bearer ' + userToken)
				.send({title:'Oops'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/' + roleId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({assignable:{staff:true},id:'foo',title:'Test',visible:{advisor:true,reviewer:true,staff:true,test:true}})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/foo')
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
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/' + roleId)
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
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/' + roleId)
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/' + roleId)
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('deletes a role for an admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/' + roleId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, roleId);
				})
				.end(done);
		});
	});

});
