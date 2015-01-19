'use strict';

angular.module('gandhi-component-message', ['gandhi-component'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.register({
		id: 'message',
		title: 'Message',
		permissions: {
			read: {
				id: 'read',
				title: 'Read'
			}
		},
		directives: {
			default: 'gandhi-component-message',
			contentAdmin: 'gandhi-component-message',
			stageAdmin: 'gandhi-component-message'
		}
	});
})
