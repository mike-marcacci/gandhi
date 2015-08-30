'use strict';

var Q = require('q');
var _ = require('lodash');

var errors = require('../../../api/errors.js');

module.exports = function(router, resources){
	resources.components.review = {
		stage: {
			read: function(conn, stage) {
				return stage;
			},
			write: function(conn, input, stage) {
				var result = _.merge({}, stage, input);

				// assign any set options options
				if(input.component && input.component.options)
					result.component.options = _.assign({}, stage.component.options, input.component.options);

				// build manifest from schema
				if(result.component.options.schema && result.component.options.schema.properties) {
					result.component.manifest = {};
					Object.keys(result.component.options.schema.properties).map(function(key){
						result.component.manifest[key] = {
							id: key,
							title: result.component.options.schema.properties[key].title || '',
							schema: result.component.options.schema.properties[key]
						};
					});
				}

				// make sure permissions are listed
				if(result.component && result.component.permissions) {
					result.component.permissions['read:public'] = result.component.permissions['read:public'] || {};
					result.component.permissions['read:private'] = result.component.permissions['read:private'] || {};
					result.component.permissions['read:authors'] = result.component.permissions['read:authors'] || {};
					result.component.permissions.write = result.component.permissions.write || {};
				}

				return result;
			}
		},
		content: {
			read: function(conn, content, stage) {
				if(!content.authorizations['read:public']) return _.extend({}, content, {data: {}});

				var data = {}, i=0;

				// // hide the author ID
				if(content.authorizations['read:authors'])
					data = _.extend({}, content.data || {});
				else
					_.each(content.data, function(review, id){
						data[i] = review;
					});


				// remove private reviews
				if(!content.authorizations['read:private'])
					_.each(data, function(review, id){
						_.each(review, function(value, key){
							if(!value.public) delete review[key];
						});
					});

				content.data = data;
				return content;
			},
			write: function(conn, input, content, stage) {
				if(!content.authorizations.write) return Q.reject(new errors.UnauthorizedError('You are not authorized to write this content.'));

				// TODO: restrict to own comments

				return _.merge({}, content, input);
			}
		}
	};
};
