'use strict';

require('../../../init.js');

var li = require('li');
var r = require('rethinkdb');
var _ = require('lodash');
var jwt = require('jsonwebtoken');

var assert = require('chai').assert;
var request, fixtures;

before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.projects;
});

describe('Assignments', function(){
	var adminToken, adminId, soleneToken, soleneId;

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
				email: 'solene.clavel@test.gandhi.io',
				password: 'solene1234'
			})
			.expect(201)
			.expect(function(res){
				assert.isString(res.body.token);
				soleneToken = res.body.token;
				soleneId = jwt.decode(soleneToken).sub;
			})
			.end(done);
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments')
				.expect(401)
				.expect(function(res){
					assert.isNotArray(res.body);
				})
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.get('/api/projects/foo/assignments')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 403 for unaffiliated project', function(done){
			request
				.get('/api/projects/cdd28e4a-9309-454f-a8ed-3f9708d0c10c/assignments')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(403)
				.end(done);
		});
		it('shows all assignments to an admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, 2);
				})
				.end(done);
		});
		it('shows visible assignments to a non-admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
				})
				.end(done);
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.get('/api/projects/foo/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant project assignment', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows an assignment to an admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '5a3cf444-9d87-4125-8026-2d5ffb834676');
				})
				.end(done);
		});
		it('shows an allowed assignment to a non-admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/cf237901-2890-439f-add3-dc641b867459')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'cf237901-2890-439f-add3-dc641b867459');
				})
				.end(done);
		});
		it('hides a non-allowed assignment to a non-admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(403)
				.end(done);
		});
	});

	describe('#put', function(){
		it('rejects an anonymous put', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(401)
				.end(done);
		});
		it.skip('rejects a put by a non-admin user without permission', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + soleneToken)
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid put', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'5cd2dc98-e280-4e72-a437-9a916d98b630',role_id:'advisor'})
				.expect(400)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.put('/api/projects/foo/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(404)
				.end(done);
		});
		it('allows a new put by an admin user', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '3cd2dc98-e280-4e72-a437-9a916d98b636');
				})
				.end(done);
		});
		it('allows an existing put by an admin user', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'applicant'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '3cd2dc98-e280-4e72-a437-9a916d98b636');
					assert.equal(res.body.role_id, 'applicant');
				})
				.end(done);
		});
		it.skip('allows a new put by a non-admin user with permission', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '3cd2dc98-e280-4e72-a437-9a916d98b636');
				})
				.end(done);
		});
		it.skip('allows an existing put by a non-admin user with permission', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'applicant'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '3cd2dc98-e280-4e72-a437-9a916d98b636');
					assert.equal(res.body.role_id, 'applicant');
				})
				.end(done);
		});
		it.skip('rejects a put from a non-admin user without permission');
		it.skip('rejects a put with an invalid invitation');
		it.skip('allows an unaffiliated user to put with a valid invitation');
	});

	describe('#patch', function(){
		it('rejects an anonymous put', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.send({role_id:'applicant'})
				.expect(401)
				.end(done);
		});
		it.skip('rejects a patch by a non-admin user', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + soleneToken)
				.send({role_id:'applicant'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'5cd2dc98-e280-4e72-a437-9a916d98b630',role_id:'advisor'})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id:'applicant'})
				.expect(404)
				.expect(function(res){
				})
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.patch('/api/projects/foo/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'3cd2dc98-e280-4e72-a437-9a916d98b636',role_id:'advisor'})
				.expect(404)
				.end(done);
		});
		it('allows an existing patch by an admin user', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id:'applicant'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.role_id, 'applicant');
				})
				.end(done);
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.expect(401)
				.end(done);
		});
		it('rejects a delete by an unaffiliated non-admin user', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/5a3cf444-9d87-4125-8026-2d5ffb834676')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.delete('/api/projects/foo/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant project assignment', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('deletes an assignment for an admin user', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/assignments/3cd2dc98-e280-4e72-a437-9a916d98b636')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '3cd2dc98-e280-4e72-a437-9a916d98b636');
				})
				.end(done);
		});
	});

});
