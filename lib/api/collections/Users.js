'use strict';

var r       = require('rethinkdb');
var Promise = require('bluebird');
var errors  = require('../errors');

var User = require('../models/User');

function Users(){}

Users.prototype.query = function(conn, query) {

	// Filter Users
	// ------------

	var users = r.table('users');

	// get by email
	if(typeof query.email === 'string')
		users = users.filter({email: query.email});

	// filter
	if(query.filter) query.filter.forEach(function(f){
		users = users.filter(f);
	});

	// search
	if(typeof query.search === 'string' && query.search.length)
		users = users.filter(r.or(
			r.row('name').downcase().match(query.search.toLowerCase()),
			r.row('email').downcase().match(query.search.toLowerCase())
		));


	// Build Result
	// ------------

	var result = users;

	// sort
	if(query.sort)
		result = result.orderBy.apply(result, query.sort);

	// skip
	if(query.skip)
		result = result.skip(query.skip);

	// limit
	if(query.limit)
		result = result.limit(query.limit);

	return r.expr({

		// get the total results count
		total: users.count(),

		// get the processed users
		users: result.coerceTo('array')

	}).run(conn)

	// return as an array
	.then(function(results){
		return Promise.all(results.users.map(function(data){
			return new User(conn, data);
		}))
		.then(function(users){
			users.total = results.total;
			return users;
		});
	});
};


Users.prototype.get = function(conn, id) {
	return r.table('users').get(id).run(conn).then(function(data) {
		if(!data) return Promise.reject(new errors.NotFoundError());
		return new User(conn, data);
	});
};


Users.prototype.create = function(conn, data) {
	return User.create(conn, data);
};


module.exports = Users;
