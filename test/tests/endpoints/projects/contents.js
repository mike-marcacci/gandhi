// 'use strict';

// require('../../../init.js');

// var li = require('li');
// var r = require('rethinkdb');
// var _ = require('lodash');
// var jwt = require('jsonwebtoken');

// var assert = require('chai').assert;
// var request, fixtures;

// var blacklist = ['password', 'recovery_token'];
// var whitelist = ['id', 'email', 'name', 'href', 'admin', 'created','updated'];

// before(function(){
// 	request = global.setup.api;
// 	fixtures = global.setup.fixtures.db.projects;
// });

// describe('Contents', function(){
// 	var adminToken, adminId, applicantToken, applicantId, reviewerToken, reviewerId;

// 	before(function(done){
// 		request
// 			.post('/api/tokens')
// 			.send({
// 				email: 'mike.marcacci@test.gandhi.io',
// 				password: 'mike1234'
// 			})
// 			.expect(201)
// 			.end(function(err, res){
// 				if(err) return done(err);
// 				assert.isString(res.body.token);
// 				adminToken = res.body.token;
// 				adminId = jwt.decode(adminToken).sub;
// 				done();
// 			});
// 	});

// 	before(function(done){
// 		request
// 			.post('/api/tokens')
// 			.send({
// 				email: 'tim.marcacci@test.gandhi.io',
// 				password: 'tim1234'
// 			})
// 			.expect(201)
// 			.end(function(err, res){
// 				if(err) return done(err);
// 				assert.isString(res.body.token);
// 				applicantToken = res.body.token;
// 				applicantId = jwt.decode(applicantToken).sub;
// 				done();
// 			});
// 	});

// 	describe('#list', function(){
// 		it('rejects an anonymous request', function(done){
// 			request
// 				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents')
// 				.expect(401)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					assert.isNotArray(res.body);
// 					done();
// 				});
// 		});
// 		it('returns 404 for nonexistant project', function(done){
// 			request
// 				.get('/api/projects/foo/contents')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.expect(404)
// 				.end(done);
// 		});
// 		it('shows all contents to an admin user', function(done){
// 			request
// 				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.expect(200)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					assert.lengthOf(Object.keys(res.body), 1);
// 					done();
// 				});
// 		});
// 		it('shows visible contents to a non-admin user', function(done){
// 			request
// 				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents')
// 				.set('Authorization', 'Bearer ' + applicantToken)
// 				.expect(200)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					assert.lengthOf(Object.keys(res.body), 1);
// 					done();
// 				});
// 		});
// 		it.skip('hides non-allowed contents from a non-admin user');
// 	});

// 	describe('#get', function(){
// 		it('rejects an anonymous request', function(done){
// 			request
// 				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
// 				.expect(401)
// 				.end(done);
// 		});
// 		it('returns 404 for nonexistant project', function(done){
// 			request
// 				.get('/api/projects/foo/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.expect(404)
// 				.end(done);
// 		});
// 		it('returns 404 for nonexistant project content', function(done){
// 			request
// 				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/foo')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.expect(404)
// 				.end(done);
// 		});
// 		it('shows an content to an admin user', function(done){
// 			request
// 				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.expect(200)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					assert.equal(res.body.id, '514d3645-a768-4749-b6da-8b1b4d08cf1c');
// 					done();
// 				});
// 		});
// 		it('shows an content to a non-admin user', function(done){
// 			request
// 				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
// 				.set('Authorization', 'Bearer ' + applicantToken)
// 				.expect(200)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					assert.equal(res.body.id, '514d3645-a768-4749-b6da-8b1b4d08cf1c');
// 					done();
// 				});
// 		});
// 		it.skip('hides a non-allowed content from a non-admin user');
// 	});

// 	describe('#put', function(){
// 		it('rejects an anonymous put', function(done){
// 			request
// 				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.send({id:'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae',role:'applicant',name:'Test',email:'test@email.com'})
// 				.expect(401)
// 				.end(done);
// 		});
// 		it('rejects a put by a non-admin user', function(done){
// 			request
// 				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.set('Authorization', 'Bearer ' + applicantToken)
// 				.send({id:'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae',role:'applicant',name:'Test',email:'test@email.com'})
// 				.expect(403)
// 				.end(done);
// 		});
// 		it('rejects an invalid put', function(done){
// 			request
// 				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.send({foo:'bar'})
// 				.expect(400)
// 				.end(done);
// 		});
// 		it('returns 404 for nonexistant project', function(done){
// 			request
// 				.put('/api/projects/foo/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.send({id:'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae',role:'applicant',name:'Test',email:'test@email.com'})
// 				.expect(404)
// 				.end(done);
// 		});
// 		it('allows a new put by an admin user', function(done){
// 			request
// 				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.send({id:'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae',role:'applicant',name:'Test',email:'test@email.com'})
// 				.expect(200)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					assert.equal(res.body.id, 'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae');
// 					done();
// 				});
// 		});
// 		it('allows an existing put by an admin user', function(done){
// 			request
// 				.put('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.send({id:'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae',role:'applicant',name:'Test PUT',email:'test@email.com'})
// 				.expect(200)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					assert.equal(res.body.id, 'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae');
// 					assert.equal(res.body.name, 'Test PUT');
// 					done();
// 				});
// 		});
// 	});

// 	describe('#patch', function(){
// 		it('rejects an anonymous put', function(done){
// 			request
// 				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.send({name:'Oops'})
// 				.expect(401)
// 				.end(done);
// 		});
// 		it('rejects a patch by a non-admin user', function(done){
// 			request
// 				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.set('Authorization', 'Bearer ' + applicantToken)
// 				.send({name:'Oops'})
// 				.expect(403)
// 				.end(done);
// 		});
// 		it('rejects an invalid patch', function(done){
// 			request
// 				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.send({foo:'bar'})
// 				.expect(400)
// 				.end(done);
// 		});
// 		it('rejects a new patch by an admin user', function(done){
// 			request
// 				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/foo')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.send({name:'Oops'})
// 				.expect(404)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					done();
// 				});
// 		});
// 		it('returns 404 for nonexistant project', function(done){
// 			request
// 				.patch('/api/projects/foo/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.send({name:'Oops'})
// 				.expect(404)
// 				.end(done);
// 		});
// 		it('allows an existing patch by an admin user', function(done){
// 			request
// 				.patch('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.send({name:'Patched'})
// 				.expect(200)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					assert.equal(res.body.name, 'Patched');
// 					done();
// 				});
// 		});
// 	});

// 	describe('#delete', function(){
// 		it('rejects an anonymous delete', function(done){
// 			request
// 				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.expect(401)
// 				.end(done);
// 		});
// 		it('rejects a delete by a non-admin user', function(done){
// 			request
// 				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.set('Authorization', 'Bearer ' + applicantToken)
// 				.expect(403)
// 				.end(done);
// 		});
// 		it('returns 404 for nonexistant project', function(done){
// 			request
// 				.delete('/api/projects/foo/contents/514d3645-a768-4749-b6da-8b1b4d08cf1c')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.expect(404)
// 				.end(done);
// 		});
// 		it('returns 404 for nonexistant project content', function(done){
// 			request
// 				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/foo')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.expect(404)
// 				.end(done);
// 		});
// 		it('deletes an content for an admin user', function(done){
// 			request
// 				.delete('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009/contents/c7efa7cf-bab2-44a6-862f-7ca5e154b1ae')
// 				.set('Authorization', 'Bearer ' + adminToken)
// 				.expect(200)
// 				.end(function(err, res){
// 					if(err) return done(err);
// 					assert.equal(res.body.id, 'c7efa7cf-bab2-44a6-862f-7ca5e154b1ae');
// 					done();
// 				});
// 		});
// 	});

// });
