angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {
	$stateProvider
		.state('admin', {
			url: "/admin",
			templateUrl: "admin/index.html",
			abstract: true,
			resolve: {},
			controller: function($scope, Restangular, $q, $rootScope){
				$rootScope.bqi = false;

				$scope.nav = {};
				$scope.cycles = null;
				$scope.projects = null;

				$scope.$watch('user', function( newValue, oldValue ) {

					if(!newValue || !newValue.id)
						return;

					$q.all([
						Restangular.all('cycles').getList(),
						newValue.getList('projects')
					]).then(function(res){

						// add cycles to nav
						$scope.cycles = res[0];

						// map user's projects to corresponding cycle in nav
						$scope.projects = res[1];

					});
				});

				$scope.$watch('[projects, cycles]', function(newValues, oldValues){
					if(!newValues[0] || !newValues[1]) return;


					var projects = newValues[0]
					var cycles = newValues[1]

					cycles.forEach(function(cycle){
						$scope.nav[cycle.id] = {
							id: cycle.id,
							title: cycle.title,
							projects: {}
						}
					});

					projects.forEach(function(project){
						$scope.nav[project.cycle_id].projects[project.id] = {
							id: project.id,
							title: project.title,
							flow: project.flow
						};
					});

				}, true);

			}
		})
		.state('admin.dashboard', {
			url: "",
			templateUrl: "admin/dashboard.html",
			controller: function($scope){
				
			}
		})

});