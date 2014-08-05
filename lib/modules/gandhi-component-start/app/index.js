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
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state) {
			$scope.$watch('context', function(context) {
				var options = context.cycle.flow[context.stage].component.options;

				console.log(options.permissions)

				$scope.permissions = {
					read: context.role === null || (options.permissions.read ? options.permissions.read.indexOf(context.role) !== -1 : false),
					write: context.role === null || (options.permissions.write ? options.permissions.write.indexOf(context.role) !== -1 : false)
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

							// update the project
							$rootScope.$broadcast('projects');

							// redirect to the next stage
							$state.go('portal.projects.show', {project: res.id, stage: options.next});
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
							status: options.status
						};

						console.log(project)

						// add user
						project.users[$rootScope.currentUser.id] = {
							id: $rootScope.currentUser.id,
							role: options.role
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
							$state.go('portal.projects.show', {project: res.id, stage: options.next});
						}, function(err){
							alert('Sorry, but there was an error submitting this application. Pleast contact us.');
						});
					}


				}

			});
		}
	}
});

