'use strict';

require('../../init.js');

var li = require('li');
var r = require('rethinkdb');
var _ = require('lodash');
var jwt = require('jsonwebtoken');

var assert = require('chai').assert;
var request, fixtures;

var blacklist = ['password', 'recovery_token'];
var whitelist = ['id', 'email', 'name', 'admin', 'created', 'preferences', 'updated'];

before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.users;
});

describe('Users', function(){
	var adminToken, adminId, ids = [];

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

	describe('#create', function(){
		var userToken, userId;
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
		it('rejects a misformatted user', function(done){
			request
				.post('/api/users')
				.send({
					cool: 'beans'
				})
				.expect(400)
				.end(done);
		});
		it('prevents email collisions', function(done){
			request
				.post('/api/users')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					password: 'tim1234'
				})
				.expect(409)
				.end(done);
		});
		it('allows anonymous creation of a user', function(done){
			request
				.post('/api/users')
				.send({
					email: 'heather.harbottle@test.gandhi.io',
					password: 'heather1234'
				})
				.expect(201)
				.end(function(err, res){
					if(err) return done(err);
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.email, 'heather.harbottle@test.gandhi.io');
					blacklist.forEach(function(prop){
						assert.notProperty(res.body, prop);
					});
					done();
				});
		});
		it('prevents anonymous creation of an admin user', function(done){
			request
				.post('/api/users')
				.send({
					email: 'solène.clavel@test.gandhi.io',
					password: 'solène1234',
					admin: true
				})
				.expect(403)
				.end(function(err, res){
					if(err) return done(err);
					assert.isUndefined(res.body.id);
					done();
				});
		});
		it('prevents creation of an admin user by a non-admin user', function(done){
			request
				.post('/api/users')
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					email: 'solène.clavel@test.gandhi.io',
					password: 'solène1234',
					admin: true
				})
				.expect(403)
				.end(function(err, res){
					if(err) return done(err);
					assert.isUndefined(res.body.id);
					done();
				});
		});
		it('allows creation of an admin user by an admin user', function(done){
			request
				.post('/api/users')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({
					email: 'solène.clavel@test.gandhi.io',
					password: 'solène1234',
					admin: true
				})
				.expect(201)
				.end(function(err, res){
					if(err) return done(err);
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.email, 'solène.clavel@test.gandhi.io');
					blacklist.forEach(function(prop){
						assert.notProperty(res.body, prop);
					});
					done();
				});
		});
	});

	describe('#read', function(){
		var userToken, userId;
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

		describe('(list) /users', function(){
			it('rejects an anonymous request', function(done){
				request
					.get('/api/users')
					.expect(401)
					.end(function(err, res){
						if(err) return done(err);
						assert.isNotArray(res.body);
						done();
					});
			});
			it('returns list of users', function(done){
				request
					.get('/api/users')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.isArray(res.body);
						assert.lengthOf(res.body, Math.min(50, fixtures.length + ids.length));
						done();
					});
			});
			it('accepts per_page parameters', function(done){
				request
					.get('/api/users?per_page=5')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						// assert.equal(links.next, '/api/users?per_page=5&page=2');
						// assert.equal(links.last, '/api/users?per_page=5&page='+Math.ceil((fixtures.length + ids.length) / 5));
						done();
					});
			});
			it('accepts page parameters', function(done){
				request
					.get('/api/users?per_page=5&page=2')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						// assert.equal(links.first, '/api/users?per_page=5&page=1');
						// assert.equal(links.prev, '/api/users?per_page=5&page=1');
						done();
					});
			});
			it('only includes whitelisted fields to unaffiliated users', function(done){
				request
					.get('/api/users')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.isArray(res.body);
						_.each(res.body, function(user){
							whitelist.forEach(function(prop){
								assert.property(user, prop);
							}, 'missing whitelist property');
							if(user.email != 'tim.marcacci@test.gandhi.io')
								assert.lengthOf(Object.keys(user), whitelist.length, 'contains properties in addition to whitelist');
						})
						done();
					});
			});
			it('includes all non-blacklisted fields to self', function(done){
				request
					.get('/api/users')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.isArray(res.body);
						var user = _.find(res.body, {email: 'tim.marcacci@test.gandhi.io'});
						blacklist.forEach(function(prop){
							assert.notProperty(user, prop);
						}, 'contains blacklisted property');

						// TODO: test for other properties

						done();
					});
			});
			it('includes all non-blacklisted fields to admin users', function(done){
				request
					.get('/api/users')
					.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.isArray(res.body);
						var user = _.find(res.body, {email: 'tim.marcacci@test.gandhi.io'});
						blacklist.forEach(function(prop){
							assert.notProperty(user, prop);
						}, 'contains blacklisted property');

						// TODO: test for other properties

						done();
					});
			});
		});

		describe('(show) /users/:id', function(){
			it('rejects an anonymous request', function(done){
				request
					.get('/api/users/' + userId)
					.expect(401)
					.end(function(err, res){
						if(err) return done(err);
						assert.isNotArray(res.body);
						done();
					});
			});
			it('returns the correct user', function(done){
				request
					.get('/api/users/' + userId)
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.property(res.body, 'id');
						assert.equal(res.body.id, userId);
						done();
					});
			});
			it('only includes whitelisted fields to unaffiliated users', function(done){
				request
					.get('/api/users/' + adminId)
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						whitelist.forEach(function(prop){
							assert.property(res.body, prop);
						}, 'missing whitelist property');
						assert.equal(res.body.id, adminId);
						assert.lengthOf(Object.keys(res.body), whitelist.length, 'contains properties in addition to whitelist');
						done();
					});
			});
			it('includes all non-blacklisted fields to self', function(done){
				request
					.get('/api/users/' + userId)
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.property(res.body, 'id');
						assert.equal(res.body.id, userId);
						blacklist.forEach(function(prop){
							assert.notProperty(res.body, prop);
						}, 'contains blacklisted property');

						// TODO: test for other properties

						done();
					});
			});
			it('includes all non-blacklisted fields to admin users', function(done){
				request
					.get('/api/users/' + userId)
					.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.property(res.body, 'id');
						assert.equal(res.body.id, userId);
						blacklist.forEach(function(prop){
							assert.notProperty(res.body, prop);
						}, 'contains blacklisted property');

						// TODO: test for other properties

						done();
					});
			});
		});
	});

	describe('#update', function(){
		var userToken, userId;
		before(function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'heather.harbottle@test.gandhi.io',
					password: 'heather1234'
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

		it('rejects an anonymous request', function(done){
			request
				.patch('/api/users/' + userId)
				.send({
					name: 'Woops!'
				})
				.expect(401)
				.end(function(err, res){
					if(err) return done(err);
					done();
				});
		});
		it('rejects an update from an unaffiliated, non-admin user', function(done){
			request
				.patch('/api/users/' + adminId)
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					name: 'Woops!'
				})
				.expect(403)
				.end(done);
		});
		it('processes an update from self', function(done){
			request
				.patch('/api/users/' + userId)
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					name: 'Emily Shafer Marcacci'
				})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, userId);
					assert.equal(res.body.name, 'Emily Shafer Marcacci');
					done();
				});
		});
		it('processes an update from an admin user', function(done){
			request
				.patch('/api/users/' + userId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({
					name: 'Emily S. Marcacci'
				})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, userId);
					assert.equal(res.body.name, 'Emily S. Marcacci');
					done();
				});
		});
		it('rejects promition of a user to admin by a non-admin user', function(done){
			request
				.patch('/api/users/' + userId)
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					admin: true
				})
				.expect(403)
				.end(done);
		});
		it('rejects a misformatted update', function(done){
			request
				.patch('/api/users/' + userId)
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					foo: 'bar'
				})
				.expect(400)
				.end(done);
		});
		it.skip('rejects an update to blacklisted properties', function(){});
	});

	describe('#replace', function(){
		var userToken, userId, user;
		before(function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'heather.harbottle@test.gandhi.io',
					password: 'heather1234'
				})
				.expect(201)
				.end(function(err, res){
					if(err) return done(err);
					assert.isString(res.body.token);
					userToken = res.body.token;
					userId = jwt.decode(userToken).sub;
					return done();
				});
		});
		before(function(done){
			request
				.get('/api/users/' + userId)
				.set('Authorization', 'Bearer ' + userToken)
				.end(function(err, res){
					if(err) return done(err);
					user = res.body;
					return done();
				});
		});

		it('rejects an anonymous replace', function(done){
			request
				.put('/api/users/' + userId)
				.send(_.extend({}, user, {
					name: 'Woops!'
				}))
				.expect(401)
				.end(done);
		});
		it('rejects a replace from an unaffiliated, non-admin user', function(done){
			request
				.put('/api/users/' + adminId)
				.set('Authorization', 'Bearer ' + userToken)
				.send(_.extend({}, user, {
					name: 'Woops!'
				}))
				.expect(403)
				.end(done);
		});
		it('processes a replace from self', function(done){
			request
				.put('/api/users/' + userId)
				.set('Authorization', 'Bearer ' + userToken)
				.send(_.extend({}, user, {
					name: 'Emily Martha Shafer Marcacci',
					password: 'heather1234'
				}))
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, userId);
					assert.equal(res.body.name, 'Emily Martha Shafer Marcacci');
					done();
				});
		});
		it('processes a replace from an admin user', function(done){
			request
				.put('/api/users/' + userId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send(_.extend({}, user, {
					name: 'Emily Marcacci',
					password: 'heather1234'
				}))
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, userId);
					assert.equal(res.body.name, 'Emily Marcacci');
					done();
				});
		});
		it.skip('rejects a misformatted replace', function(done){
			request
				.put('/api/users/' + userId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send(_.extend({}, user, {
					foo: 'bar'
				}))
				.expect(400)
				.end(done);
		});
		it.skip('rejects a replace of blacklisted properties', function(){});
	});

	describe('#delete', function(){
		var userToken, userId;
		before(function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'heather.harbottle@test.gandhi.io',
					password: 'heather1234'
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

		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/users/' + userId)
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/users/' + userToken)
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it.skip('rejects a delete of self by an admin user', function(done){
			request
				.delete('/api/users/' + adminId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(400)
				.end(done);
		});
		it('processes a delete of another user by an admin user', function(done){
			request
				.delete('/api/users/' + userId)
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.id, userId);
					done();
				});
		});
	});

	// remove any users we just created
	after(function(done){
		if(!ids.length)
			return done();

		r.connect(global.setup.config.db, function(err, conn){
			r.table('users').getAll(ids).delete().run(conn, function(err, res){
				conn.close();
				done(err, res);
			});
		});
	});

});
