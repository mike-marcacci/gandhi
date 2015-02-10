'use strict';

angular.module('gandhi-component-start', ['gandhi-component', 'schemaForm'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.register({
		id: 'start',
		title: 'Start',
		permissions: {
			read: {
				id: 'read',
				title: 'Read'
			},
			write: {
				id: 'write',
				title: 'Write'
			}
		},
		directives: {
			default: 'gandhi-component-start',
			contentAdmin: 'gandhi-component-start',
			stageAdmin: 'gandhi-component-start-stage-admin'
		}
	});
})

.directive('gandhiComponentStart', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-start/app/default.html',
		controller: ['$scope', '$element', '$attrs', '$q', 'Project', 'Content', function($scope, $element, $attrs, $q, Project, Content) {
			$scope.$watch('context', function(context) {

				// give the view access to the context
				angular.extend($scope, context);

				$scope.update = function(){
					new Project({title: context.project.title}).$update({
						admin: context.mode === 'contentAdmin',
						id: context.project.id
					}).$promise
				}

			});
		}]
	}
})

.directive('gandhiComponentStartStageAdmin', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-start/app/stageAdmin.html',
		controller: ['$scope', '$element', '$attrs', 'Stage', function($scope, $element, $attrs, Stage) {
			$scope.$watch('context', function(context) {

				// give the view access to the context
				angular.extend($scope, context);

			});
		}]
	}
});
