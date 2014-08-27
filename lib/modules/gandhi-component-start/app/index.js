'use strict';

angular.module('gandhi-component-start', ['gandhi-component'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.components['start'] = {
		directive: 'gandhi-component-start'
	};
})

.directive('gandhiComponentStart', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-start/app/index.html',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state, $sce) {
			$scope.$watch('context', function(context) {

				// is this bad practice?
				$scope.cycle = context.cycle;

				$scope.stage = context.cycle.flow[context.stage];
				$scope.options = context.cycle.flow[context.stage].component.options;
				$scope.description = $sce.trustAsHtml(context.cycle.flow[context.stage].description);

				$scope.permissions = {
					read: context.role === null || ($scope.options.permissions.read ? $scope.options.permissions.read.indexOf(context.role) !== -1 : false),
					write: context.role === null || ($scope.options.permissions.write ? $scope.options.permissions.write.indexOf(context.role) !== -1 : false)
				}

				$scope.data = Object.create(context.project || {});

				$scope.submit = function(){

					// if we're updating an existing project
					if(context.project){

						// just take the edits directly for now...
						var project = $scope.data;

						if(!project.flow[context.stage])
							project.flow[context.stage] = {};

						project.flow[context.stage].status = 'complete';

						context.project.patch(project).then(function(res){

							if(context.project)
								angular.extend(context.project, res);

							// update the project
							$rootScope.$broadcast('projects');

							// redirect to the next stage
							$state.go('portal.projects.show.stage', {project: res.id, stage: $scope.options.next});
						}, function(err){
							alert('Sorry, but there was an error submitting this application. Pleast contact us.');
						});

					}

					// we're creating a new project
					else {
						// create the base project
						var project = {
							title: $scope.data.title,
							cycle_id: context.cycle.id,
							users: {},
							flow: {},
							status: $scope.options.status
						};

						// add user
						project.users[$rootScope.currentUser.id] = {
							id: $rootScope.currentUser.id,
							role: $scope.options.role
						};

						// this stage has been submitted
						project.flow[context.stage] = {
							id: context.stage,
							status: 'complete',
							data: {}
						};

						Restangular.all('projects').post(project).then(function(res){

							// update the project elsewhere
							$rootScope.$broadcast('projects');

							// TODO: add to user's favorites

							// TODO: refresh sidebar projects when sidebar is pulling from favorites

							// redirect to the next stage
							$state.go('portal.projects.show.stage', {project: res.data.id, stage: $scope.options.next});
						}, function(err){
							alert('Sorry, but there was an error submitting this application. Pleast contact us.');
						});
					}


				}

			});
		}
	}
});

