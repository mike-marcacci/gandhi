'use strict';

angular.module('gandhi-component', [])

.provider('GandhiComponentProvider', function() {

	var Configurer = {};
	Configurer.init = function(object, config){

	}

	var globalConfiguration = {};

	Configurer.init(this, globalConfiguration);


	this.$get = function() {

	};

	// var defaults = {
	// 	'admin.projects.main': 'Component failed to load. Please refresh.',
	// 	'admin.projects.summary': '',
	// 	'admin.cycle.main': 'Component failed to load. Please refresh.',
	// 	'main': 'Component failed to load. Please refresh.'
	// }

	// var registry = {};

	// function retreive(name, template) {
	// 	return registry[name] && registry[name][template] ? '<ng-include src="assets/bower/' + registry[name][template] + '"></ng-include>' : defaults[template] ? defaults[template] : null;
	// }

	// retreive.register = function register(name, component) {
	// 	registry[name] = component;
	// }

	// return retreive;
});
