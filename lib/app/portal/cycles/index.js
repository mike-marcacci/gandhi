angular.module('gandhi')

.config(['$stateProvider', function($stateProvider) {
	'use strict';

	$stateProvider

	.state('portal.cycles', {
		url: '/cycles',
		template: '<div ui-view></div>',
		abstract: true,
		controller: ['$scope', '$state', '$stateParams', 'Cycle', function($scope, $state, $stateParams, Cycle) {

			// Get Resources
			// -------------

			function getCycles(){
				Cycle.query().$promise.then(function(cycles){
					$scope.cycles = cycles;
					$scope.cyclesById = _.indexBy(cycles, 'id');
				});
			}
			getCycles();
			$scope.$on('Cycle', getCycles);

		}]
	})

	.state('portal.cycles.list', {
		url: '',
		templateUrl: 'portal/cycles/list.html'
	})

	.state('portal.cycles.show', {
		url: '/show/:cycle',
		templateUrl: 'portal/cycles/show.html',
		controller: ['$scope', '$state', '$stateParams', 'Cycle', 'Project', function($scope, $state, $stateParams, Cycle, Project) {
			$scope.project = new Project({
				cycle_id: $stateParams.cycle
			});

			// Get Resources
			// -------------

			function getCycle(){
				Cycle.get({id: $stateParams.cycle}).$promise.then(function(cycle){
					$scope.cycle = cycle;
				});
			}
			getCycle();
			$scope.$on('Cycle', getCycle);



			$scope.assignedOnly = true;
			$scope.setAssignedOnly = function(assignedOnly){ $scope.assignedOnly = !!assignedOnly; }
			function getProjects(assignedOnly){
				assignedOnly = assignedOnly || $scope.assignedOnly;

				var query = {

					// restrict to cycle
					cycle: $stateParams.cycle,

					// order by most recently updated
					sort: [{path: ['updated'], direction: 'desc'}]
				};

				// restrict to assigned projects
				if(assignedOnly) {
					query.user = $scope.currentUser.id;
				}

				// restrict to projects with an actual role
				else {
					query.filter = [{
						op: 'ne',
						path: '/role',
						value: true
					}];
				}

				$scope.projects = Project.query(query);
			}
			$scope.$watch('assignedOnly', getProjects);
			$scope.$on('Project', getProjects);




			// Actions
			// -------

			$scope.createProject = function(){
				$scope.project.$create().then(function(project){
					$state.go('portal.projects.show', {project: project.id});
				});
			}

		}]
	})

}])
