angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {
	$stateProvider
		.state('admin', {
			url: "/admin",
			templateUrl: "admin/index.html",
			abstract: true,
			resolve: {},
			controller: function($scope, Restangular, $q, $rootScope){
				$rootScope.bqi = true;

				$scope.nav = {};
				$scope.programs = null;
				$scope.projects = null;

				$scope.$watch('user', function( newValue, oldValue ) {

					if(!newValue || !newValue.id)
						return;

					$q.all([
						Restangular.all('programs').getList(),
						newValue.getList('projects')
					]).then(function(res){

						// add programs to nav
						$scope.programs = res[0];

						// map user's projects to corresponding program in nav
						$scope.projects = res[1];

					});
				});

				$scope.$watch('[projects, programs]', function(newValues, oldValues){
					if(!newValues[0] || !newValues[1]) return;


					var projects = newValues[0]
					var programs = newValues[1]

					programs.forEach(function(program){
						$scope.nav[program.id] = {
							id: program.id,
							title: program.title,
							projects: {}
						}
					});

					projects.forEach(function(project){
						$scope.nav[project.program_id].projects[project.id] = {
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