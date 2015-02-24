'use strict';

var Q = require('q');
var _ = require('lodash');

module.exports = function(router, resources){
	resources.components.review = {
		stage: {
			get: function(stage, cycle) {
				return stage;
			},
			update: function(data, stage, cycle) {
				return data;
			},
			save: function(data, stage, cycle) {
				return data;
			}
		},
		content: {
			get: function(content, stage, project, cycle) {
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
			update: function(data, content, stage, project, cycle) {
				if(!content.authorizations['write']) return Q.reject({code: 403, message: 'You are not authorized to write this content.'});

				// TODO: restrict to own comments

				return data;
			},
			save: function(data, content, stage, project, cycle) {
				if(!content.authorizations['write']) return Q.reject({code: 403, message: 'You are not authorized to write this content.'});

				// TODO: restrict to own comments

				return data;
			}
		}
	};
};
