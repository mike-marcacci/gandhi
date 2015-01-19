angular.module('gandhi')

.config(['$stateProvider', function($stateProvider) {
	'use strict';

	$stateProvider

	.state('portal.projects', {
		url: '/projects',
		template: '<div ui-view></div>',
		abstract: true,
		controller: ['$scope', '$state', '$stateParams', 'Cycle', 'Project', function($scope, $state, $stateParams, Cycle, Project) {

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



			$scope.assignedOnly = true;
			$scope.setAssignedOnly = function(assignedOnly){ $scope.assignedOnly = !!assignedOnly; }
			function getProjects(assignedOnly){
				assignedOnly = assignedOnly || $scope.assignedOnly;

				// order by most recently updated
				var query = {
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

		}]
	})

	.state('portal.projects.list', {
		url: '',
		templateUrl: 'portal/projects/list.html'
	})

	.state('portal.projects.show', {
		url: '/show/:project',
		templateUrl: 'portal/projects/show.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Project', 'Cycle', 'Role', 'Status', 'Stage', function($scope, $state, $stateParams, $window, Project, Cycle, Role, Status, Stage){
			var projectBackup = null;

			$scope.projectEdit = null;
			$scope.toggleEdit = function(){
				$scope.projectEdit = $scope.projectEdit ? null : new Project($scope.project);
			};

			$scope.source = {project: null};
			$scope.toggleSource = function(){
				if($scope.source.project)
				return ($scope.source.project = null);

				$scope.source.project = angular.copy($scope.project);

				// remove calculated properties
				delete $scope.source.project.role;
				delete $scope.source.project.events;
				delete $scope.source.project.values;
			};

			// Get Resources
			// -------------

			function getProject(){
				if(!$stateParams.project)
					return;

				// get the project
				Project.get({id: $stateParams.project}).$promise.then(function(project){
					$scope.project = project;
					projectBackup = angular.copy(project);

					// get the cycle
					Cycle.get({id: project.cycle_id}).$promise.then(function(cycle){
						$scope.cycle = cycle;
					});

					// get cycle roles
					Role.query({cycle: project.cycle_id}).$promise.then(function(roles){
						$scope.roles = roles;
						$scope.rolesById = _.indexBy(roles, 'id');
					});

					// get cycle statuses
					Status.query({cycle: project.cycle_id}).$promise.then(function(statuses){
						$scope.statuses = statuses;
						$scope.statusesById = _.indexBy(statuses, 'id');
					});

					// get cycle stages
					Stage.query({cycle: project.cycle_id}).$promise.then(function(stages){
						$scope.stages = stages;
						$scope.stagesById = _.indexBy(stages, 'id');
					});
				});
			}
			getProject();
			$scope.$on('Project', getProject);



			// Actions
			// -------

			$scope.update = function(){
				$scope.projectEdit.$update({id: $scope.project.id}).then(function(){
					$scope.projectEdit = null;
				});
			};

			$scope.updatePermissions = function(){
				new Project({permissions: $scope.project.permissions}).$update({id: $scope.project.id}).then(function(){
					$scope.projectPermissionsEdit = false;
				});
			};

			$scope.updateSource = function(){
				new Project($scope.source.project).$update({id: $scope.project.id}).then(function(){
					$scope.source.project = null;
				});
			};

			$scope.destroy = function(){
				if(!$window.confirm('Are you sure you want to delete this project?'))
					return;

				$scope.project.$delete({id: $scope.project.id}).then(function(){
					// redirect
					$state.go('portal.admin.projects.list');
				});
			};
		}]
	})

}])
