'use strict';

require('../../init.js');

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
	fixtures = global.setup.fixtures.db.notifications;
});

describe('Notifications', function(){
	var adminToken, adminId, userToken, userId, ids = [];

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
				userToken = res.body.token;
				userId = jwt.decode(userToken).sub;
			})
			.end(done);
	});

	describe('#post', function(){
		it('prevents anonymous creation', function(done){
			request
				.post('/api/notifications')
				.send({
					user_id: '84fbaa78-54b0-42fc-9754-c9ea7dc24538',
					subject: 'Test',
					content: 'Test notification',
				})
				.expect(401)
				.end(done);
		});
		it('prevents non-admin creation', function(done){
			request
				.post('/api/notifications')
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					user_id: '84fbaa78-54b0-42fc-9754-c9ea7dc24538',
					subject: 'Test',
					content: 'Test notification',
				})
				.expect(403)
				.end(done);
		});
		it('rejects a misformatted notification', function(done){
			request
				.post('/api/notifications')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({
					cool: 'beans'
				})
				.expect(400)
				.expect(function(res){
				})
				.end(done);
		});
		it('allows creation of minimal notification', function(done){
			request
				.post('/api/notifications')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({
					user_id: '84fbaa78-54b0-42fc-9754-c9ea7dc24538',
					subject: 'Test',
					content: 'Test notification',
				})
				.expect(201)
				.expect(function(res){
					assert.isString(res.body.id);
					ids.push(res.body.id);
					assert.equal(res.body.subject, 'Test');
					assert.equal(res.body.status_id, 'unread');
				})
				.end(done);
		});
	});

	describe('#list', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/notifications')
				.expect(401)
				.expect(function(res){
					assert.isNotArray(res.body);
				})
				.end(done);
		});
		it('shows all notifications to an admin user', function(done){
			request
				.get('/api/notifications')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, fixtures.length + ids.length);
				})
				.end(done);
		});
		it('hides others\' notifications from a non-admin user', function(done){
			request
				.get('/api/notifications')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, 2);
				})
				.end(done);
		});
		it('accepts per_page parameters', function(done){
			request
				.get('/api/notifications?per_page=2')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, 2);
					var links = li.parse(res.headers.link);
					// assert.equal(links.next, '/api/notifications?per_page=2&page=2');
					// assert.equal(links.last, '/api/notifications?per_page=2&page=2');
				})
				.end(done);
		});
		it('accepts page parameters', function(done){
			request
				.get('/api/notifications?per_page=2&page=2')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.isArray(res.body);
					assert.lengthOf(res.body, 1);
					var links = li.parse(res.headers.link);
					// assert.equal(links.first, '/api/notifications?per_page=2&page=1');
					// assert.equal(links.prev, '/api/notifications?per_page=2&page=1');
				})
				.end(done);
		});
	});

	describe('#get', function(){
		it('rejects an anonymous request', function(done){
			request
				.get('/api/notifications/2df77fb9-6fe0-448f-ad06-a4d145ca8c46')
				.expect(401)
				.end(done);
		});
		it('returns 404 for nonexistant notification', function(done){
			request
				.get('/api/notifications/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('shows another user\'s notification to an admin user', function(done){
			request
				.get('/api/notifications/2df77fb9-6fe0-448f-ad06-a4d145ca8c46')
				.query({admin: true})
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, '2df77fb9-6fe0-448f-ad06-a4d145ca8c46');
				})
				.end(done);
		});
		it('shows notification to the recipiant non-admin user', function(done){
			request
				.get('/api/notifications/df973a3b-99d2-420c-800b-6463778dedf2')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, 'df973a3b-99d2-420c-800b-6463778dedf2');
				})
				.end(done);
		});
		it('hides another user\'s notification from a non-admin user', function(done){
			request
				.get('/api/notifications/2df77fb9-6fe0-448f-ad06-a4d145ca8c46')
				.set('Authorization', 'Bearer ' + userToken)
				.expect(403)
				.end(done);
		});
	});

	describe('#patch', function(){
		it('rejects an anonymous update', function(done){
			request
				.patch('/api/notifications/' + ids[0])
				.send({subject: 'Woops!'})
				.expect(401)
				.end(done);
		});
		it('rejects a non-status update of a user\'s own notification by a non-admin user', function(done){
			request
				.patch('/api/notifications/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.send({subject: 'Woops!'})
				.expect(403)
				.end(done);
		});
		it('rejects a status-only update of another user\'s notification by a non-admin user', function(done){
			request
				.patch('/api/notifications/2df77fb9-6fe0-448f-ad06-a4d145ca8c46')
				.set('Authorization', 'Bearer ' + userToken)
				.send({status_id: 'read'})
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant notification', function(done){
			request
				.patch('/api/notifications/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({subject: 'UPDATED'})
				.expect(404)
				.end(done);
		});
		it('allows a status-only update by a non-admin user', function(done){
			request
				.patch('/api/notifications/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.send({status_id: 'read'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, ids[0]);
					assert.equal(res.body.status_id, 'read');
				})
				.end(done);
		});
		it('allows an update by an admin user', function(done){
			request
				.patch('/api/notifications/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({subject: 'UPDATED'})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, ids[0]);
					assert.equal(res.body.subject, 'UPDATED');
				})
				.end(done);
		});
	});

	describe.skip('#put', function(){
		it('rejects an anonymous replace', function(done){
			request
				.put('/api/notifications/' + ids[0])
				.send({
					user_id: '84fbaa78-54b0-42fc-9754-c9ea7dc24538',
					subject: 'REPLACED',
					content: 'Test notification',
					id: ids[0]
				})
				.expect(401)
				.end(done);
		});
		it('rejects a replace by a non-admin user', function(done){
			request
				.put('/api/notifications/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.send({
					user_id: '84fbaa78-54b0-42fc-9754-c9ea7dc24538',
					subject: 'REPLACED',
					content: 'Test notification',
					id: ids[0]
				})
				.expect(403)
				.end(done);
		});
		it('allows a replace by an admin user', function(done){
			request
				.put('/api/notifications/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.send({
					user_id: '84fbaa78-54b0-42fc-9754-c9ea7dc24538',
					subject: 'REPLACED',
					content: 'Test notification',
					id: ids[0]
				})
				.expect(200)
				.expect(function(res){
					assert.equal(res.body.id, ids[0]);
				})
				.end(done);
		});
	});

	describe('#delete', function(){
		it('rejects an anonymous delete', function(done){
			request
				.delete('/api/notifications/' + ids[0])
				.expect(401)
				.end(done);
		});
		it('rejects a delete by a non-admin user', function(done){
			request
				.delete('/api/notifications/' + ids[0])
				.set('Authorization', 'Bearer ' + userToken)
				.query({admin: true})
				.expect(403)
				.end(done);
		});
		it('returns 404 for nonexistant notification', function(done){
			request
				.delete('/api/notifications/foo')
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(404)
				.end(done);
		});
		it('allows a delete by an admin', function(done){
			request
				.delete('/api/notifications/' + ids[0])
				.set('Authorization', 'Bearer ' + adminToken)
				.query({admin: true})
				.expect(200)
				.end(done);
		});
	});

	// // test embedded collections
	// ['statuses','roles','assignments','invitations','triggers','stages','exports'].forEach(function(c){
	// 	require('./notifications/' + c);
	// });

	// remove any notifications we just created
	after(function(done){
		if(!ids.length)
			return done();

		r.connect(global.setup.config.db, function(err, conn){
			r.table('notifications').getAll(ids).delete().run(conn, function(err, res){
				conn.close();
				done(err, res);
			});
		});
	});

});
