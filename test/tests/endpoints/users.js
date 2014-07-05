'use strict';

require('../../init.js');

var li = require('li');
var r = require('rethinkdb');
var assert = require('chai').assert;
var request, fixtures;

var blacklist = ['password'];
var whitelist = ['id','email','name'];

before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.users;
});

describe('Users', function(){
	var adminToken, ids = [];

	before(function(done){
		request
			.post('/api/tokens')
			.send({
				email: 'mike.marcacci@test.gandhi.io',
				password: 'mike1234'
			})
			.expect(201)
			.end(function(err, res){
				assert.isString(res.body.token);
				adminToken = res.body.token;
				done(err);
			});
	});

	describe('#create', function(){
		var userToken;
		before(function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					password: 'tim1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isString(res.body.token);
					userToken = res.body.token;
					done(err);
				});
		});

		it('rejects a misformatted user', function(done){
			request
				.post('/api/users')
				.send({
					cool: 'beans'
				})
				.expect(400)
				.end(function(err, res){
					done(err);
				});
		});

		it('prevents email collisions', function(done){
			request
				.post('/api/users')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					password: 'tim1234'
				})
				.expect(409)
				.end(function(err, res){
					done(err);
				});
		});

		it('allows anonymous creation of a user', function(done){
			request
				.post('/api/users')
				.send({
					email: 'emily.marcacci@test.gandhi.io',
					password: 'emily1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.email, 'emily.marcacci@test.gandhi.io');
					blacklist.forEach(function(prop){
						assert.notProperty(res.body, prop);
					});
					done(err);
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
					assert.isUndefined(res.body.id);
					done(err);
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
					assert.isUndefined(res.body.id);
					done(err);
				});
		});

		it('allows creation of an admin user by an admin user', function(done){
			request
				.post('/api/users')
				.set('Authorization', 'Bearer ' + adminToken)
				.send({
					email: 'solène.clavel@test.gandhi.io',
					password: 'solène1234',
					admin: true
				})
				.expect(201)
				.end(function(err, res){
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.email, 'solène.clavel@test.gandhi.io');
					blacklist.forEach(function(prop){
						assert.notProperty(res.body, prop);
					});
					done(err);
				});
		});
	});

	describe('#read', function(){
		var userToken;
		before(function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'tim.marcacci@test.gandhi.io',
					password: 'tim1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isString(res.body.token);
					userToken = res.body.token;
					done(err);
				});
		});

		describe('(list) /customers', function(){
			it('rejects an anonymous request', function(done){
				request
					.get('/api/users')
					.expect(401)
					.end(function(err, res){
						assert.isNotArray(res.body);
						done(err);
					});
			});
			it('returns list of users', function(done){
				request
					.get('/api/users')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						assert.isArray(res.body);
						assert.lengthOf(res.body, Math.min(50, fixtures.length + ids.length));
						done(err);
					});
			});
			it('accepts per_page parameters', function(done){
				request
					.get('/api/users?per_page=5')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						assert.equal(links.next, '/api/users?per_page=5&page=2');
						assert.equal(links.last, '/api/users?per_page=5&page='+Math.ceil((fixtures.length + ids.length) / 5));
						done(err);
					});
			});
			it('accepts page parameters', function(done){
				request
					.get('/api/users?per_page=5&page=2')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						assert.equal(links.first, '/api/users?per_page=5&page=1');
						assert.equal(links.prev, '/api/users?per_page=5&page=1');
						done(err);
					});
			});
			it('only includes whitelisted fields to unaffiliated users', function(){});
			it('includes all non-blacklisted fields to self', function(){});
			it('includes all non-blacklisted fields to admin users', function(){});
		});

		describe('(show) /customers/:id', function(){
		});
	});

	describe('#update', function(){
		var userToken;
		before(function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'emily.marcacci@test.gandhi.io',
					password: 'emily1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isString(res.body.token);
					userToken = res.body.token;
					done(err);
				});
		});

		it('rejects an anonymous update', function(){});
		it('rejects an update from an unaffiliated user', function(){});
		it('processes an update from self', function(){});
		it('processes an update from an admin user', function(){});
		it('rejects a misformatted update', function(){});
		it('rejects a misformatted update', function(){});
	});

	describe('#delete', function(){
		var userToken;
		before(function(done){
			request
				.post('/api/tokens')
				.send({
					email: 'emily.marcacci@test.gandhi.io',
					password: 'emily1234'
				})
				.expect(201)
				.end(function(err, res){
					assert.isString(res.body.token);
					userToken = res.body.token;
					done(err);
				});
		});

		it('rejects an anonymous update', function(){});
		it('rejects an update from an unaffiliated user', function(){});
		it('rejects an update from self', function(){});
		it('processes an update from an admin user', function(){});
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
