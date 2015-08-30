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
	fixtures = global.setup.fixtures.db.projects;
});

describe('Contents', function(){
	var adminToken, adminId, applicantToken, applicantId, reviewerToken, reviewerId;

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
				applicantToken = res.body.token;
				applicantId = jwt.decode(applicantToken).sub;
			})
			.end(done);
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents')
				.expect(401)
				.expect(function(res){
					assert.isNotArray(res.body);
				})
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.get('/api/projects/foo/contents')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows all contents to an admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 7);
				})
				.end(done);
		});
		it.skip('returns default values for a nonexistant content');
		it.skip('returns the correct content permissions for an admin user');
		it.skip('returns the correct content permissions for a non-admin user');
		it.skip('shows visible stages to a non-admin user according to stage permission', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents')
				.set('Authorization', 'Bearer ' + applicantToken)
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 1);
				})
				.end(done);
		});
		it.skip('shows limited contents to a non-admin user according to content permission', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents')
				.set('Authorization', 'Bearer ' + applicantToken)
				.expect(200)
				.expect(function(res){
					assert.lengthOf(Object.keys(res.body), 1);
				})
				.end(done);
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.get('/api/projects/foo/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant project content', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it.skip('refuses to show a hidden stage to a non-admin user without stage permission', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.expect(401)
				.end(done);
		});
		it.skip('refuses to show content to a non-admin user without content permission', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/administrative_review')
				.set('Authorization', 'Bearer ' + applicantToken)
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '514d3645-a768-4749-b6da-8b1b4d08cf1c');
				})
				.end(done);
		});
		it('shows a content to an admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/administrative_review')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'administrative_review');
				})
				.end(done);
		});
		it.skip('shows limited content to a non-admin user with content permission', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.set('Authorization', 'Bearer ' + applicantToken)
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '514d3645-a768-4749-b6da-8b1b4d08cf1c');
				})
				.end(done);
		});
	});

	describe('#put', function(){
		it('rejects an anonymous put', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/administrative_review')
				.send({id:'administrative_review',status_id:'draft',data:{foo:'bar'}})
				.expect(401)
				.end(done);
		});
		it('rejects an invalid put', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/application')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({data: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/application')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'foo',status_id:'draft',data:{foo:'bar'}})
				.expect(400)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.put('/api/projects/foo/contents/application')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'application',status_id:'draft',data:{foo:'bar'}})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant stage', function(done){
			request
				.put('/api/projects/foo/b37e83a5-d613-4d64-8873-fdcc8df0a009/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae',role:'applicant',name:'Test',email:'test@email.com'})
				.expect(404)
				.end(done);
		});
		it.skip('rejects a put by a non-admin user without stage permission', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/application')
				.set('Authorization', 'Bearer ' + applicantToken)
				.send({id:'application',status_id:'draft',data:{foo:'bar'}})
				.expect(403)
				.end(done);
		});
		it.skip('rejects a put by a non-admin user without content permission', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/application')
				.set('Authorization', 'Bearer ' + applicantToken)
				.send({id:'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae',role:'applicant',name:'Test',email:'test@email.com'})
				.expect(403)
				.end(done);
		});
		it.skip('allows a new put by an admin user', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/administrative_review')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'xxxxxx',status_id:'draft',data:{foo:'bar'}})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae');
					assert.equal(res.body.name, 'Test PUT');
				})
				.end(done);
		});
		it.skip('allows an existing put by an admin user', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/administrative_review')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'xxxxxx',status_id:'draft',data:{foo:'bar'}})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae');
					assert.equal(res.body.name, 'Test PUT');
				})
				.end(done);
		});
		it.skip('allows a new put by a non-admin user with permission', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae',role:'applicant',name:'Test',email:'test@email.com'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae');
				})
				.end(done);
		});
		it.skip('allows an existing put by a non-admin user with permission', function(done){
			request
				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'xxxxxx',status_id:'draft',data:{foo:'bar'}})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae');
					assert.equal(res.body.name, 'Test PUT');
				})
				.end(done);
		});
	});

	describe.skip('#patch', function(){
		it('rejects an anonymous put', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
				.send({name:'Oops'})
				.expect(401)
				.end(done);
		});
		it('rejects a patch by a non-admin user', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
				.set('Authorization', 'Bearer ' + applicantToken)
				.send({name:'Oops'})
				.expect(403)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({data: true})
				.expect(400)
				.end(done);
		});
		it('rejects mismatched ids', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/application')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'foo',status_id:'draft',data:{foo:'bar'}})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({name:'Oops'})
				.expect(404)
				.expect(function(res){
				})
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.patch('/api/projects/foo/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({name:'Oops'})
				.expect(404)
				.end(done);
		});
		it('allows an existing patch by an admin user', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({name:'Patched'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.name, 'Patched');
				})
				.end(done);
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
				.expect(401)
				.end(done);
		});
		it('does not support method for an admin user', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(405)
				.end(done);
		});
		it('does not support method for a non-admin user', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
				.set('Authorization', 'Bearer ' + applicantToken)
				.expect(405)
				.end(done);
		});
	});

});
