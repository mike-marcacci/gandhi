angular.module('gandhi')

.config(function($stateProvider, $urlRouterProvider, RestangularProvider) {

	$stateProvider
		.state('portal.start', {
			url: '/start/:cycle',
			templateUrl: 'portal/projects/start.html',
			resolve: {},
			controller: function ($scope, $state, $stateParams) {
				$scope.chooseCycle = function(){
					$state.go('portal.start',{cycle: $scope.cycle ? $scope.cycle.id : null});
				}


				$scope.$watchCollection('cycles', function(cycles, old) {
					if(!cycles)
						return;

					if(!$stateParams.cycle)
						return;

					$scope.cycle = _.find(cycles, {id: $stateParams.cycle});
					$scope.stage = $scope.cycle.flow.root;

					var component = $scope.cycle.flow.stages[$scope.stage].component.name;
					$scope.component = 'components/'+component+'/portal/index.html';
				})
			}
		})

		.state('portal.projects', {
			url: '/projects/:project',
			templateUrl: 'portal/projects/index.html',
			abstract: true,
			controller: function ($scope, $state, $stateParams, Restangular) {
				$scope.project = null;
				$scope.cycle = null;
				$scope.role = null;
				$scope.users = Restangular.one('projects', $stateParams.project).getList('users').$object;

				$scope.$watchCollection('[projects, cycles]', function(newValues, oldValues) {
					if(!newValues[0] || !newValues[1]) return;

					var projects = newValues[0];
					var cycles = newValues[1];

					// get the correct project
					$scope.$watchCollection('projects', function(newValue, oldValue){
						$scope.projects.some(function(project){
							if(project.id != $stateParams.project)
								return false;

							return $scope.project = project;
						});

						// get the correct cycle
						if($scope.project)
							cycles.get($scope.project.cycle_id).then(function(cycle){
								$scope.cycle = cycle;

								// decide the user's role in this project
								if($scope.project.users[$scope.currentUser.id])
									$scope.role = $scope.project.users[$scope.currentUser.id].role;
								else
									$scope.role = $scope.cycle.users[$scope.currentUser.id].role;
							});
					});
				});
			}
		})

		.state('portal.projects.stage', {
			url: '/:stage',
			template: '<ng-include src="component"></ng-include>',
			controller: function($scope, $stateParams){
				$scope.stage = $stateParams.stage;

				$scope.$watch('[project, cycle]', function(newValues, oldValues) {
					if(!newValues[0] || !newValues[1]) return;

					var project = newValues[0];
					var cycle = newValues[1];

					var stageProject = project.flow.stages[$stateParams.stage];
					var stageCycle = cycle.flow.stages[$stateParams.stage];

					// the lock is now set server side
					// TODO: remove references to this in the views?
					if(!$scope.currentUser.admin)
						$scope.lock = stageProject.lock;

					console.log(stageProject);

					$scope.component = 'components/'+stageCycle.component.name+'/portal/index.html';
				}, true);
			}
		})
		
})