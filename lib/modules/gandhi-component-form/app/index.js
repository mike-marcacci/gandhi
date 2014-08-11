'use strict';

angular.module('gandhi-component-form', ['gandhi-component'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.components['form'] = {
		directive: 'gandhi-component-form'
	};
})

.directive('gandhiComponentForm', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-form/app/index.html',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state) {

			$scope.$watch('context', function(context) {
				$scope.stage = context.cycle.flow[context.stage];
				$scope.options = context.cycle.flow[context.stage].component.options;

				$scope.permissions = {
					read: context.role === null || ($scope.options.permissions.read ? $scope.options.permissions.read.indexOf(context.role) !== -1 : false),
					write: context.role === null || ($scope.options.permissions.write ? $scope.options.permissions.write.indexOf(context.role) !== -1 : false)
				}

				$scope.data = context.project.flow[context.stage] ? context.project.flow[context.stage].data : {};

				$scope.submit = function(){

					var project = {flow:{}};
					project.flow[context.stage] = {
						id: context.stage,
						data: $scope.data,
						status: 'complete'
					}

					context.project.patch(project).then(function(res){

						// update the project
						$rootScope.$broadcast('projects');

						// redirect to the next stage
						// $state.go('portal.projects.show', {project: res.id, stage: $scope.options.next});


						alert("Successfully saved!")
					}, function(err){
						alert('Sorry, but there was an error submitting this application. Pleast contact us.');
					});
				}

			});
		}
	}
});

