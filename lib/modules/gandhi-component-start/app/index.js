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
			admin: 'gandhi-component-start-admin'
		}
	});
})

.directive('gandhiComponentStart', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-start/app/default.html',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state, $sce) {
			$scope.$watch('context', function(context) {

				// is this bad practice? we don't ever want to access the cycle directly...
				$scope.cycle = context.cycle;

				$scope.stage = context.cycle.flow[context.stage];
				$scope.options = context.cycle.flow[context.stage].component.options;
				$scope.description = $sce.trustAsHtml(context.cycle.flow[context.stage].description);

				// TODO: figure out a way to get permissions without an actual project...
				$scope.permissions = context.project ? context.project.flow[context.stage].permissions : context.cycle.flow[context.stage].component.permissions;

				$scope.data = context.project ? Object.create(context.project) : {};
				$scope.status = context.project ? context.project.flow[context.stage].status : null;

				$scope.submit = function(){
					if(!$scope.permissions.write)
						return alert('Sorry, but you do not have write permissions.');

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
							$state.go('portal.projects.show.flow', {project: res.data.id, stage: $scope.options.next});
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
							$state.go('portal.projects.show.flow', {project: res.data.id, stage: $scope.options.next});
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
		templateUrl: 'assets/bower/gandhi-component-start/app/admin.html',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state) {
			$scope.$watch('context', function(context) {

				$scope.cycle = context.cycle;

				$scope.stage = context.cycle.flow[context.stage];
				$scope.options = context.cycle.flow[context.stage].component.options;
				$scope.data = angular.copy($scope.options);

				$scope.save = function(){
					var data = {flow: {}}; data.flow[context.stage] = {component: {options: $scope.data}};
					context.cycle.patch(data).then(function(res){

						// update the local lists
						$rootScope.$broadcast('cycles');

						alert('Changes successfully saved.');

					}, function(err){
						if(err.data && err.data.message)
							alert(err.data.message);
						else
							alert("There was a problem saving your changes.");
					});
				}
			});
		}
	}
});
