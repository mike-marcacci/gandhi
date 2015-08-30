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

before(function() {
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.cycles;
});

describe('Assignments', function() {
	var adminToken, adminId, userToken, userId;

	before(function(done) {
		request
			.post('/api/tokens')
			.send({
				email: 'mike.marcacci@test.gandhi.io',
				password: 'mike1234'
			})
			.expect(201)
			.expect(function(res) {
				assert.isString(res.body.token);
				adminToken = res.body.token;
				adminId = jwt.decode(adminToken).sub;
			})
			.end(done);
	});

	before(function(done) {
		request
			.post('/api/tokens')
			.send({
				email: 'tim.marcacci@test.gandhi.io',
				password: 'tim1234'
			})
			.expect(201)
			.expect(function(res) {
				assert.isString(res.body.token);
				userToken = res.body.token;
				userId = jwt.decode(userToken).sub;
			})
			.end(done);
	});

	describe('#list', function() {
		it('rejects an anonymous request', function(done) {
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments')
				.expect(401)
				.expect(function(res) {
					assert.isNotArray(res.body);
				})
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done) {
			request
				.get('/api/cycles/foo/assignments')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows all assignments to an admin user', function(done) {
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res) {
					assert.lengthOf(Object.keys(res.body), 2);
				})
				.end(done);
		});
		it('shows all assignments to a non-admin user', function(done) {
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res) {
					assert.lengthOf(Object.keys(res.body), 2);
				})
				.end(done);
		});
	});

	describe('#get', function() {
		it('rejects an anonymous request', function(done) {
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done) {
			request
				.get('/api/cycles/foo/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant cycle assignment', function(done) {
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows an assignment to an admin user', function(done) {
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res) {
					assert.equal(res.body.id, '5a3cf444-9d87-4125-8026-2d5ffb834676');
				})
				.end(done);
		});
		it('shows an assignment to a non-admin user', function(done) {
			request
				.get('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res) {
					assert.equal(res.body.id, '5a3cf444-9d87-4125-8026-2d5ffb834676');
				})
				.end(done);
		});
	});

	describe('#put', function() {
		it('rejects an anonymous put', function(done) {
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(401)
				.end(done);
		});

		it('rejects a put by a non-admin user', function(done) {
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + userToken)
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid put', function(done) {
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id: true})
				.expect(400)
				.end(done);
		});
		it('rejects a mismatched id', function(done) {
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'5cd2dc98-e280-4e72-a437-9a916d98b639',role_id:'advisor'})
				.expect(400)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done) {
			request
				.put('/api/cycles/foo/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'5a3cf444-9d87-4125-8026-2d5ffb834676',role_id:'advisor'})
				.expect(404)
				.end(done);
		});
		it('allows a new put by an admin user', function(done) {
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(200)
				.expect(function(res) {
					assert.equal(res.body.id, '3cd2dc98-e280-4e72-a437-9a916d98b636');
				})
				.end(done);
		});
		it('allows an existing put by an admin user', function(done) {
			request
				.put('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'applicant'})
				.expect(200)
				.expect(function(res) {
					assert.equal(res.body.id, '3cd2dc98-e280-4e72-a437-9a916d98b636');
					assert.equal(res.body.role_id, 'applicant');
				})
				.end(done);
		});
	});

	describe('#patch', function() {
		it('rejects an anonymous put', function(done) {
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.send({role_id:'applicant'})
				.expect(401)
				.end(done);
		});
		it('rejects a patch by a non-admin user', function(done) {
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + userToken)
				.send({role_id:'applicant'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done) {
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id: true})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done) {
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id:'applicant'})
				.expect(404)
				.expect(function(res) {
				})
				.end(done);
		});
		it('rejects a mismatched id', function(done) {
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'5cd2dc98-e280-4e72-a437-9a916d98b639',role_id:'advisor'})
				.expect(400)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done) {
			request
				.patch('/api/cycles/foo/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(404)
				.end(done);
		});
		it('allows an existing patch by an admin user', function(done) {
			request
				.patch('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id:'applicant'})
				.expect(200)
				.expect(function(res) {
					assert.equal(res.body.role_id, 'applicant');
				})
				.end(done);
		});
	});

	describe('#delete', function() {
		it('rejects an anonymous delete', function(done) {
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done) {
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant cycle', function(done) {
			request
				.delete('/api/cycles/foo/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant cycle assignment', function(done) {
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('deletes an assignment for an admin user', function(done) {
			request
				.delete('/api/cycles/128f2348-99d4-40a1-b5ab-91d9019f272d/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res) {
					assert.equal(res.body.id, '3cd2dc98-e280-4e72-a437-9a916d98b636');
				})
				.end(done);
		});
	});

});
