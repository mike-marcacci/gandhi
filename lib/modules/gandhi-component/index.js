'use strict';

angular.module('gandhi-component', [])

.provider('GandhiComponent', function() {
	var self = this;

	self.components = {};

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
			scope.$watch('context', function(context) {
				if(!context.stage)
					return;

				// make sure this component exists... we might actually want to error here...
				if(!GandhiComponent[context.cycle.flow[context.stage].component.name])
					return;

				// inject the HTML
				element.html('<div ' + GandhiComponent[context.stage].directive + '="context"></div>');

				// compile it
				$compile(element.contents())(scope);
			})
		}
	}
})
