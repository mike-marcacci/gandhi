'use strict';

angular.module('gandhi-component', [])

.provider('GandhiComponent', function() {
	var self = this;

	self.components = {};

	self.register = function(c){
		self.components[c.id] = c;
	}

	self.$get = function() {
		return self.components;
	};
})

.directive('gandhiComponent', function(GandhiComponent, $compile){
	return {
		restrict: 'A',
		scope: {
			context: '=gandhiComponent'
		},
		link: function(scope, element, attrs){
			scope.$watchCollection('context', function(context) {
				if(!context.cycle || !context.stage)
					return;

				// make sure this component exists... we might actually want to error here...
				if(!GandhiComponent[context.stage.component.name])
					return;

				// inject the HTML
				element.html('<div ' + GandhiComponent[context.stage.component.name].directives[context.mode || 'default'] + '="context"></div>');

				// compile it
				$compile(element.contents())(scope);
			})
		}
	}
})
