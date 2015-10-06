angular.module('gandhi')

.config(['$stateProvider', function($stateProvider) {
	'use strict';

	$stateProvider

	.state('portal.cycles', {
		url: '/cycles',
		template: '<div ui-view></div>',
		abstract: true,
		controller: ['$scope', '$state', '$stateParams', 'Cycle', function($scope, $state, $stateParams, Cycle) {

			$scope.table = {
				query: {
					sort: [{path: ['title'], direction: 'asc'}]
				},
				pages: {},
				columns: [
					{sortable: true, title: 'Title',   path: ['title'],     flex: 4, template: null},
					{sortable: true, title: 'Status',  path: ['status_id'], flex: 1, template: '<span style="text-transform: capitalize;">{{row.status_id}}</span>'},
					{sortable: true, title: 'Open',    path: ['open'],      flex: 1, template: '{{row.open ? \'Yes\' : \'No\'}}'},
					{sortable: true, title: 'Created', path: ['created'],   flex: 2, template: '{{row.created * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'},
					{sortable: true, title: 'Updated', path: ['updated'],   flex: 2, template: '{{row.updated * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'},
				]
			};

			// Get Resources
			// -------------

			function getCycles(query){
				Cycle.query(query || $scope.table.query, function(cycles, h){
					$scope.cycles = $scope.table.data = cycles;
					$scope.table.pages = JSON.parse(h('pages'));
				});
			}
			$scope.$on('Cycle', getCycles);
			$scope.$watch('table.query', getCycles, true);

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
