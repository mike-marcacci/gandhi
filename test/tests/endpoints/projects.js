'use strict';

require('../../init.js');

var li = require('li');
var r = require('rethinkdb');
var _ = require('lodash');
var jwt = require('jsonwebtoken');

var assert = require('chai').assert;
var request, fixtures;

var collections = ['assignments', 'contents', 'invitations'];

before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.projects;
});

describe('Projects', function(){
	var adminToken, adminId,
	    soleneToken, soleneId,
	    mattToken, markId,
	    ids = [];

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
				soleneToken = res.body.token;
				soleneId = jwt.decode(soleneToken).sub;
				done();
			});
	});

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'matt.shafer@test.gandhi.io',
				password: 'matt1234'
			})
			.expect(201)
			.end(function(err, res){
				if(err) return done(err);
				assert.isString(res.body.token);
				mattToken = res.body.token;
				markId = jwt.decode(mattToken).sub;
				done();
			});
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/projects')
				.expect(401)
				.end(function(err, res){
					if(err) return done(err);
					assert.isNotArray(res.body);
					done();
				});
		});
		it('shows all projects to an admin user', function(done){
			request
				.get('/api/projects')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 3);
					done();
				});
		});
		it('shows all project-assigned projects to a non-admin user', function(done){
			request
				.get('/api/projects')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
					done();
				});
		});
		it('shows all cycle-assigned projects to a non-admin user', function(done){
			request
				.get('/api/projects')
				.set('Authorization', 'Bearer ' + mattToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 2);
					done();
				});
		});
		it('shows correct role for each project', function(done){
			request
				.get('/api/projects')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.equal(res.body[0].role.id, 'applicant');
					done();
				});
		});
		it('shows correct authorizations for each project', function(done){
			request
				.get('/api/projects')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.isTrue(res.body[0].authorizations['project:read']);
					assert.isTrue(res.body[0].authorizations['project:create']);
					assert.isTrue(res.body[0].authorizations['project:update']);
					assert.isFalse(res.body[0].authorizations['project:delete']);
					assert.isTrue(res.body[0].authorizations['project/assignments:read']);
					assert.isTrue(res.body[0].authorizations['project/assignments:write']);
					assert.isTrue(res.body[0].authorizations['project/contents:read']);
					assert.isTrue(res.body[0].authorizations['project/contents:write']);
					done();
				});
		});
		it.skip('shows exported values for each project to an admin user', function(done){
			request
				.get('/api/projects')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.equal(_.find(res.body, {id: 'b37e83a5-d613-4d64-8873-fdcc8df0a009'}).exports.application.proposal, '4f406e9f-a1ba-4b7b-9aae-c37b42a0cc03');
					done();
				});
		});
		it.skip('hides exported values for each project from a non-admin user');
		it('shows correct events for each trigger', function(done){
			request
				.get('/api/projects')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					var project = _.find(res.body, {id: 'b37e83a5-d613-4d64-8873-fdcc8df0a009'});
					assert.lengthOf(Object.keys(project.events), 8);
					_.each(project.events, function(group){
						assert.isArray(group);
						_.each(group, function(event){
							assert.isBoolean(event.value);
						});
					});
					done();
				});
		});
		it('hides all embedded collections', function(done){
			request
				.get('/api/projects')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					res.body.forEach(function(project){
						collections.forEach(function(collection){
							assert.notProperty(project, collection);
						});
					});
					done();
				});
		});
		it('accepts filter parameters', function(done){
			request
				.get('/api/projects')
				.query({filter: '[{"path":"/id","op":"eq","value":"e264d6f7-d26a-4be3-8365-13416ac41029"}]'})
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
					done();
				});
		});
		it('accepts search parameters', function(done){
			request
				.get('/api/projects')
				.query({search: 'Tim\'s Character '})
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
					done();
				});
		});
		it('accepts per_page parameters', function(done){
			request
				.get('/api/projects?per_page=2')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 2);
					var links = li.parse(res.headers.link);
					// assert.equal(links.next, '/api/projects?per_page=2&page=2');
					// assert.equal(links.last, '/api/projects?per_page=2&page='+Math.ceil((fixtures.length + ids.length) / 2));
					done();
				});
		});
		it('accepts page parameters', function(done){
			request
				.get('/api/projects?per_page=2&page=2')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
					var links = li.parse(res.headers.link);
					// assert.equal(links.first, '/api/projects?per_page=2&page=1');
					// assert.equal(links.prev, '/api/projects?per_page=2&page=1');
					done();
				});
		});
	});

	describe('#post', function(){
		it('prevents anonymous creation', function(done){
			request
				.post('/api/projects')
				.send({
					title: 'Woops!'
				})
				.expect(401)
				.end(done);
		});
		it('applies defaults to a new project for non-admin users', function(done){
			request
				.post('/api/projects')
				.set('Authorization', 'Bearer ' + soleneToken)
				.send({
					title: 'CREATE - Minimal Project',
					cycle_id: '128f2348-99d4-40a1-b5ab-91d9019f272d'
				})
				.expect(201)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.title, 'CREATE - Minimal Project')
					assert.equal(res.body.cycle_id, '128f2348-99d4-40a1-b5ab-91d9019f272d')
					// assert.property(res.body.assignments, soleneId);
					// assert.equal(res.body.assignments[soleneId].role, 'applicant');
					assert.equal(res.body.status_id, 'active');
					ids.push(res.body.id);
					done();
				})
		})
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.get('/api/projects/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows a project to an unaffiliated admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, 'b37e83a5-d613-4d64-8873-fdcc8df0a009');
					done();
				});
		});
		it('shows correct role for the project', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.role.id, 'applicant');
					done();
				});
		});
		it('shows correct authorizations for the project', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009')
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.isTrue(res.body.authorizations['project:read']);
					assert.isTrue(res.body.authorizations['project:create']);
					assert.isTrue(res.body.authorizations['project:update']);
					assert.isFalse(res.body.authorizations['project:delete']);
					assert.isTrue(res.body.authorizations['project/assignments:read']);
					assert.isTrue(res.body.authorizations['project/assignments:write']);
					assert.isTrue(res.body.authorizations['project/contents:read']);
					assert.isTrue(res.body.authorizations['project/contents:write']);
					done();
				});
		});
		it.skip('shows exported values for the project to an admin user', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.exports.application.proposal, '4f406e9f-a1ba-4b7b-9aae-c37b42a0cc03');
					done();
				});
		});
		it.skip('hides exported values for each project from a non-admin user');
		it('shows correct events for each trigger', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.lengthOf(Object.keys(res.body.events), 8);
					_.forEach(res.body.events, function(group){
						assert.isArray(group);
						_.forEach(group, function(event){
							assert.isBoolean(event.value);
						});
					});
					done();
				});
		});
		it.skip('only runs a single trigger once');
		it('hides all embedded collections', function(done){
			request
				.get('/api/projects/b37e83a5-d613-4d64-8873-fdcc8df0a009')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					collections.forEach(function(collection){
						assert.notProperty(res.body, collection);
					});
					done();
				});
		});
		it.skip('rejects a request from an unaffiliated non-admin user');
		it.skip('rejects a request from an affiliated non-admin user without authorization');
		it('shows a project to an affiliated non-admin user with authorization');
	});

	describe('#patch', function(){
		it('rejects an anonymous update', function(done){
			request
				.patch('/api/projects/' + ids[0])
				.send({title: 'Woops!'})
				.expect(401)
				.end(done);
		});
		it('rejects an update by an unaffiliated non-admin user', function(done){
			request
				.patch('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + mattToken)
				.send({title: 'Woops!'})
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.patch('/api/projects/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({title: 'Woops!'})
				.expect(404)
				.end(done);
		});
		it('accepts an update by an unaffiliated admin user', function(done){
			request
				.patch('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({
					title: 'UPDATED (By Admin)',
					invitations: {
						'72d8153e-dc53-4fcc-98c8-febfc4f171ed': {
						  id: '72d8153e-dc53-4fcc-98c8-febfc4f171ed',
						  role_id: 'applicant',
						  name: 'Mark Boerneke',
						  email: 'mark.boerneke@test.gandhi.io'
						}
					}
				})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, ids[0]);
					done();
				});
		});
	});

	describe.skip('#put', function(){
		var project;
		before(function(done){
			request
				.get('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					project = res.body;
					done();
				});
		});

		it('rejects an anonymous replace', function(done){
			request
				.put('/api/projects/' + ids[0])
				.send({title: 'Woops!'})
				.expect(401)
				.end(done);
		});
		it('rejects a replace by a non-admin user', function(done){
			request
				.put('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + soleneToken)
				.send(_.extend({}, project, {
					title: 'UPDATED'
				}))
				.expect(403)
				.end(done);
		});
		it('accepts a replace by an unaffiliated admin user', function(done){
			request
				.put('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send(_.extend({}, project, {
					title: 'UPDATED'
				}))
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, ids[0]);
					done();
				});
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/projects/' + ids[0])
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + soleneToken)
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant project', function(done){
			request
				.delete('/api/projects/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('deletes a project for an admin user', function(done){
			request
				.delete('/api/projects/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(done);
		});
	});

	// remove any projects we just created
	after(function(done){
		if(!ids.length)
			return done();

		r.connect(global.setup.config.db, function(err, conn){
			r.table('projects').getAll(ids).delete().run(conn, function(err, res){
				conn.close();
				done(err, res);
			});
		});
	});

});
