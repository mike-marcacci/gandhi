angular.module('gandhi-component')

.factory('component', function() {

	var defaults = {
		'admin.projects.main': 'Component failed to load. Please refresh.',
		'admin.projects.summary': '',
		'admin.cycle.main': 'Component failed to load. Please refresh.',
		'main': 'Component failed to load. Please refresh.'
	}

	var registry = {};

	function retreive(name, template) {
		return registry[name] && registry[name][template] ? '<ng-include src="components/' + name + '/' + registry[name][template] + '"></ng-include>' : defaults[template] ? defaults[template] : null;
	}

	retreive.register = function register(name, component) {
		registry[name] = component;
	}

	return retreive;
});