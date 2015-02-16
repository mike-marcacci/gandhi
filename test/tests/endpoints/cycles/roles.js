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
	var adminToken, adminId, userToken, userId;

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'mike.marcacci@test.gandhi.io',
				password: 'mike1234'
			})
			.expect(201)
			.end(function(err, res){
				if(err) return done(err);
				assert.isString(res.body.token);
				adminToken = res.body.token;
				adminId = jwt.decode(adminToken).sub;
				done();
			});
	});

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'tim.marcacci@test.gandhi.io',
				password: 'tim1234'
			})
			.expect(201)
			.end(function(err, res){
				if(err) return done(err);
				assert.isString(res.body.token);
				userToken = res.body.token;
				userId = jwt.decode(userToken).sub;
				done();
			});
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.expect(401)
				.end(function(err, res){
					if(err) return done(err);
					assert.isNotArray(res.body);
					done();
				});
		});
		it('shows all roles to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.lengthOf(Object.keys(res.body), 4);
					done();
				});
		});
		it('shows all roles to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.lengthOf(Object.keys(res.body), 4);
					done();
				});
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
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'advisor');
					done();
				});
		});
		it('shows a role to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/advisor')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'advisor');
					done();
				});
		});
	});

	describe('#put', function(){
		it('rejects an anonymous put', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.send({assignable:{staff:true},id:'test',title:'Test',visible:{advisor:true,reviewer:true,staff:true,test:true}})
				.expect(401)
				.end(done);
		});
		it('rejects a put by a non-admin user', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + userToken)
				.send({assignable:{staff:true},id:'test',title:'Test',visible:{advisor:true,reviewer:true,staff:true,test:true}})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid put', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({assignable:{staff:true},id:'foo',title:'Test',visible:{advisor:true,reviewer:true,staff:true,test:true}})
				.expect(400)
				.end(done);
		});
		it('allows a new put by an admin user', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({assignable:{staff:true},id:'test',title:'Test',visible:{advisor:true,reviewer:true,staff:true,test:true}})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'test');
					done();
				});
		});
		it('allows an existing put by an admin user', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({assignable:{staff:true},id:'test',title:'Test',visible:{advisor:true,reviewer:true,staff:true,test:false}})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'test');
					assert.equal(res.body.visible.test, false);
					done();
				});
		});
	});

	describe('#patch', function(){
		it('rejects an anonymous put', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.send({title:'Oops'})
				.expect(401)
				.end(done);
		});
		it('rejects a patch by a non-admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + userToken)
				.send({title:'Oops'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
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
				.end(function(err, res){
					if(err) return done(err);
					done();
				});
		});
		it('allows an existing patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title:'Patched'})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.title, 'Patched');
					done();
				});
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('deletes a role for an admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/roles/test')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'test');
					done();
				});
		});
	});

});
