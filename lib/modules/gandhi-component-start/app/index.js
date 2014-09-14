'use strict';

angular.module('gandhi-component-start', ['gandhi-component', 'schemaForm'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.components['start'] = {
		default: 'gandhi-component-start',
		admin: 'gandhi-component-start-admin'
	};
})

.directive('gandhiComponentStart', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-start/app/index.html',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state, $sce) {
			$scope.$watch('context', function(context) {

				// is this bad practice? we don't ever want to access the cycle directly...
				$scope.cycle = context.cycle;

				$scope.stage = context.cycle.flow[context.stage];
				$scope.options = context.cycle.flow[context.stage].component.options;
				$scope.description = $sce.trustAsHtml(context.cycle.flow[context.stage].description);

				$scope.permissions = {
					read: context.role === null || ($scope.options.permissions.read ? $scope.options.permissions.read.indexOf(context.role) !== -1 : false),
					write: context.role === null || ($scope.options.permissions.write ? $scope.options.permissions.write.indexOf(context.role) !== -1 : false)
				}

				$scope.lock = context.project ? context.project.flow[context.stage].lock : null;
				$scope.data = context.project ? Object.create(context.project) : {};

				$scope.submit = function(){
					if(!$scope.permissions.write)
						return alert('Sorry, but you do not have write permissions.');

					if($scope.lock)
						return alert('Sorry, but this stage is locked.');

					// if we're updating an existing project
					if(context.project){

						// just take the edits directly for now...
						var project = _.extend({}, $scope.data);
						project.flow = project.flow || {};
						project.flow = project.flow || {};
						project.flow[context.stage] = project.flow[context.stage] || {};
						project.flow[context.stage].status = 'complete';

						context.project.patch(project).then(function(res){

							if(context.project)
								angular.extend(context.project, res.data);

							// update the project
							$rootScope.$broadcast('projects');

							// redirect to the next stage
							$state.go('portal.projects.show.stage', {project: res.data.id, stage: $scope.options.next});
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
})

.directive('gandhiComponentStartAdmin', function() {
	return {
		scope: false,
		template: 'admin',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state) {

		}
	}
});
