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

			// create a new project
			create: 'gandhi-component-start-create',

			// admin modes
			contentAdmin: 'gandhi-component-start',
			stageAdmin: 'gandhi-component-start-cycle-admin'
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
					new Project({title: context.project.title}).$update({id: context.project.id}).$promise
				}

			});
		}]
	}
})

.directive('gandhiComponentStartCycleAdmin', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-start/app/cycleAdmin.html',
		controller: ['$scope', '$element', '$attrs', 'Stage', function($scope, $element, $attrs, Stage) {
			$scope.$watch('context', function(context) {

				// give the view access to the context
				angular.extend($scope, context);

				// make the editable component
				$scope.componentEdit = angular.copy(context.stage.component);

				$scope.updateComponent = function(){
					new Stage({component: $scope.componentEdit}).$update({cycle: context.cycle.id, id: context.stage.id});
				}

			});
		}]
	}
});
