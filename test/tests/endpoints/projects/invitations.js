'use strict';

require('../../../init.js');

var li = require('li');
var r = require('rethinkdb');
var _ = require('lodash');
var jwt = require('jsonwebtoken');

var assert = require('chai').assert;
var request, fixtures;

var ids = [];

before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.projects;
});

describe('Invitations', function(){
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
				email: 'solene.clavel@test.gandhi.io',
				password: 'solene1234'
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
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations')
				.expect(401)
				.end(function(err, res){
					if(err) return done(err);
					assert.isNotArray(res.body);
					done();
				});
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.get('/api/projects/foo/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows all invitations to an admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations')
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
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.lengthOf(Object.keys(res.body), 1);
					done();
				});
		});
		it.skip('hides non-allowed invitations from a non-admin user');
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.get('/api/projects/foo/invitations/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant project invitation', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows an invitation to an admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, '514d3645-a768-4749-b6da-8b1b4d08cf1c');
					done();
				});
		});
		it('shows an invitation to a non-admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, '514d3645-a768-4749-b6da-8b1b4d08cf1c');
					done();
				});
		});
		it.skip('hides a non-allowed invitation from a non-admin user');
	});

	describe('#post', function(){
		it('rejects an anonymous post', function(done){
			request
				.post('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations')
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(401)
				.end(done);
		});
		it('rejects an invalid post', function(done){
			request
				.post('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id: true})
				.expect(400)
				.end(done);
		});
		it.skip('ignores an id in a post', function(){});
		it('returns 404 for nonexistant cycle', function(done){
			request
				.post('/api/projects/foo/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(404)
				.end(done);
		});
		it('accepts a post by an admin user', function(done){
			request
				.post('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(201)
				.end(function(err, res){
					if(err) return done(err);
					assert.isDefined(res.body.id);
					ids.push(res.body.id);
					done();
				});
		});
		it('rejects a post by a non-admin user', function(done){
			request
				.post('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations')
				.set('Authorization', 'Bearer ' + userToken)
				.send({role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(201)
				.end(function(err, res){
					if(err) return done(err);
					assert.isDefined(res.body.id);
					ids.push(res.body.id);
					done();
				});
		});
	});

	describe('#patch', function(){
		it('rejects an anonymous put', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/' + ids[0])
				.send({name:'Oops'})
				.expect(401)
				.end(done);
		});
		it('rejects an invalid patch', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({role_id: true})
				.expect(400)
				.end(done);
		});
		it('rejects an invalid put', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({id:'57efa7cf-bab2-44a6-862f-7ca5e154b1a9',role_id:'applicant',name:'Test',email:'test@email.com'})
				.expect(400)
				.end(done);
		});
		it('rejects a new patch by an admin user', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({name:'Oops'})
				.expect(404)
				.end(function(err, res){
					if(err) return done(err);
					done();
				});
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.patch('/api/projects/foo/invitations/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({name:'Oops'})
				.expect(404)
				.end(done);
		});
		it('allows an existing patch by an admin user', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/' + ids[0])
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
		it('allows an existing patch by an non-admin user', function(done){
			request
				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/' + ids[1])
				.set('Authorization', 'Bearer ' + userToken)
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
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/' + ids[0])
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.delete('/api/projects/foo/invitations/514d3645-a768-4749-b6da-8b1b4d08cf1c')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('returns 404 for nonexistant project invitation', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('deletes an invitation for an admin user', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, ids[0]);
					done();
				});
		});
		it('deletes an invitation for a non-admin user', function(done){
			request
				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/invitations/' + ids[1])
				.set('Authorization', 'Bearer ' + userToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, ids[1]);
					done();
				});
		});
	});

});
