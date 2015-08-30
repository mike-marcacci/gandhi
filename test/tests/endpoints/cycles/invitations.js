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

var id;

before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.cycles;
});

describe.skip('Invitations', function(){
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
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations')
				.expect(401)
				.end(function(err, res){
					if(err) return done(err);
					assert.isNotArray(res.body);
					done();
				});
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.get('/api/cycles/foo/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows all invitations to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.lengthOf(Object.keys(res.body), 1);
					done();
				});
		});
		it('shows all invitations to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.lengthOf(Object.keys(res.body), 1);
					done();
				});
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/3350caac-84b9-4827-a5e4-c7a413760a0a')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.get('/api/cycles/foo/invitations/3350caac-84b9-4827-a5e4-c7a413760a0a')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant cycle invitation', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows an invitation to an admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/3350caac-84b9-4827-a5e4-c7a413760a0a')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, '3350caac-84b9-4827-a5e4-c7a413760a0a');
					done();
				});
		});
		it('shows an invitation to a non-admin user', function(done){
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/3350caac-84b9-4827-a5e4-c7a413760a0a')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, '3350caac-84b9-4827-a5e4-c7a413760a0a');
					done();
				});
		});
	});

	describe('#post', function(){
		it('rejects an anonymous post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations')
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(401)
				.end(done);
		});
		it('rejects a post by a non-admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations')
				.set('Authorization', 'Bearer ' + userToken)
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid post', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id: true})
				.expect(400)
				.end(done);
		});
		it('rejects a post with an id', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id: 'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae', role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(400)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.post('/api/cycles/foo/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(404)
				.end(done);
		});
		it('accepts a post by an admin user', function(done){
			request
				.post('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(201)
				.end(function(err, res){
					if(err) return done(err);
					assert.isDefined(res.body.id);
					id = res.body.id;
					done();
				});
		});
	});

	describe('#put', function(){
		it('rejects an anonymous put', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(401)
				.end(done);
		});
		it('rejects a put by a non-admin user', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + userToken)
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid put', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id: true})
				.expect(400)
				.end(done);
		});
		it('rejects a mismatched id', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id: '5350caac-84b9-4827-a5e4-c7a413760a09',role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(400)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.put('/api/cycles/foo/invitations/' + id)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id: id, role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(404)
				.end(done);
		});
		it('rejects a new put by an admin user', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/5350caac-84b9-4827-a5e4-c7a413760a09')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'5350caac-84b9-4827-a5e4-c7a413760a09',role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(404)
				.end(done);
		});
		it('allows an existing put by an admin user', function(done){
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id: id, role_id:'applicant',name:'Test PUT',email:'test@email.com'})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, id);
					assert.equal(res.body.name, 'Test PUT');
					done();
				});
		});
	});

	describe('#patch', function(){
		it('rejects an anonymous put', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.send({name:'Oops'})
				.expect(401)
				.end(done);
		});
		it('rejects a patch by a non-admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + userToken)
				.send({name:'Oops'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id: true})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({name:'Oops'})
				.expect(404)
				.end(function(err, res){
					if(err) return done(err);
					done();
				});
		});
		it('rejects a mismatched id', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'57efa7cf-bab2-44a6-862f-7ca5e154b1a9',role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(400)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.patch('/api/cycles/foo/invitations/' + id)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({name:'Oops'})
				.expect(404)
				.end(done);
		});
		it('allows an existing patch by an admin user', function(done){
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({name:'Patched'})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.name, 'Patched');
					done();
				});
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.delete('/api/cycles/foo/invitations/3350caac-84b9-4827-a5e4-c7a413760a0a')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant cycle invitation', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('deletes an invitation for an admin user', function(done){
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/invitations/' + id)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, id);
					done();
				});
		});
	});

});
