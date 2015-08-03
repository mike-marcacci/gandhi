'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Content = require('../../models/project/Content');

function Contents (data, parent) {
	this.model = Content;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Contents, EmbeddedCollection);

// TODO: check authorizations for project/contents:read
// TODO: check authorizations for content:visible

module.exports = Contents;