'use strict';

angular.module('gandhi-component-message', ['gandhi-component'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.register({
		id: 'message',
		title: 'Message',
		directives: {
			default: 'gandhi-component-message'
		}
	});
})

.controller('gandhi-component-message', function(){

});
