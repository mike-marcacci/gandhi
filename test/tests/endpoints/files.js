'use strict';

require('../../init.js');

var li = require('li');
var r = require('rethinkdb');
var _ = require('lodash');
var jwt = require('jsonwebtoken');
var fs = require('fs');

var assert = require('chai').assert;
var request, fixtures;

var blacklist = ['password', 'recovery_token'];
var whitelist = ['id', 'email', 'name', 'href', 'admin', 'created','updated'];


before(function(){
	request = global.setup.api;
	fixtures = global.setup.fixtures.db.files;
});

describe('Files', function(){
	var adminToken, adminId, userToken, userId, ids = [];

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

	describe('#create', function(){
		it('prevents anonymous creation', function(done){
			request
				.post('/api/files')
				.send({
					title: 'Woops!'
				})
				.expect(401)
				.end(done);
		});
		it('allows create by non-admin users', function(done){
			request
				.post('/api/files')
				.set('Authorization', 'Bearer ' + userToken)
				.attach('logo', __dirname + '/../../fixtures/logo.png')
				.expect(201)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body[0].name, 'logo.png')
					assert.equal(res.body[0].user_id, userId)
					ids.push(res.body[0].id);
					done();
				})
		})
	});

	describe('#read', function(){
		describe('(list) /files', function(){
			it('rejects an anonymous request', function(done){
				request
					.get('/api/files')
					.expect(401)
					.end(function(err, res){
						if(err) return done(err);
						assert.isNotArray(res.body);
						done();
					});
			});
			it('returns an array at least', function(done){
				request
					.get('/api/files')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.isArray(res.body);
						done();
					});
			});
			it.skip('accepts per_page parameters', function(done){
				request
					.get('/api/files?per_page=5')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						// assert.equal(links.next, '/api/files?per_page=5&page=2');
						// assert.equal(links.last, '/api/files?per_page=5&page='+Math.ceil((fixtures.length + ids.length) / 5));
						done();
					});
			});
			it.skip('accepts page parameters', function(done){
				request
					.get('/api/files?per_page=5&page=2')
					.set('Authorization', 'Bearer ' + userToken)
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.isArray(res.body);
						assert.lengthOf(res.body, 5);
						var links = li.parse(res.headers.link);
						// assert.equal(links.first, '/api/files?per_page=5&page=1');
						// assert.equal(links.prev, '/api/files?per_page=5&page=1');
						done();
					});
			});
		});

		describe('(show) /files/:id', function(){
			it('shows a file to an anonymous user', function(done){
				request
					.get('/api/files/' + ids[0])
					.expect(200)
					.end(done);
			});
			it('shows a file contents to an anonymous user', function(done){
				request
					.get('/api/files/' + ids[0])
					.query({download: true})
					.expect(200)
					.end(function(err, res){
						if(err) return done(err);
						assert.equal(res.headers['content-type'], 'image/png');
						assert.equal(res.headers['content-length'], '21592');
						assert.equal(res.headers['content-disposition'], 'attachment; filename="logo.png"');
						done();
					});
			});
		});
	});

	describe('#update', function(){
		it('rejects an anonymous update', function(done){
			request
				.patch('/api/files/' + ids[0])
				.send({title: 'Woops!'})
				.expect(401)
				.end(done);
		});
		it('accepts an update by an unaffiliated admin user', function(done){
			request
				.patch('/api/files/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({
					name: 'UPDATED.png'
				})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.name, 'UPDATED.png');
					done();
				});
		});
	});

	describe('#replace', function(){
		var file;
		before(function(done){
			request
				.get('/api/files/?filter[id][eq]=' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					file = res.body[0];
					done();
				});
		});

		it('rejects an anonymous replace', function(done){
			request
				.put('/api/files/' + ids[0])
				.send(_.extend({}, file, {
					name: 'REPLACED.png'
				}))
				.expect(401)
				.end(done);
		});
		it.skip('rejects a replace by an unaffiliated non-admin user', function(done){
			request
				.put('/api/files/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.send(_.extend({}, file, {
					name: 'REPLACED.png'
				}))
				.expect(403)
				.end(done);
		});
		it.skip('accepts a replace by an unaffiliated admin user', function(done){
			request
				.put('/api/files/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send(_.extend({}, file, {
					name: 'REPLACED.png'
				}))
				.expect(200)
				.end(function(err, res){
					if(err) return done(err);
					assert.equal(res.body.name, 'REPLACED.png');
					done();
				});
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/files/' + ids[0])
				.expect(401)
				.end(done);
		});
		it.skip('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/files/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
		it('deletes a file for an admin user', function(done){
			request
				.delete('/api/files/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(done);
		});
	});

	// remove any files we just created
	after(function(done){
		if(!ids.length)
			return done();

		r.connect(global.setup.config.db, function(err, conn){
			r.table('files').getAll(ids).delete().run(conn, function(err, res){
				conn.close();
				done(err, res);
			});
		});
	});

});
