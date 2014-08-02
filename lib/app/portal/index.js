angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {
	$stateProvider
		.state('portal', {
			url: "",
			templateUrl: "portal/index.html",
			abstract: true,
			resolve: {},
			controller: function($scope, Restangular, $q){
				$scope.cycles = null;
				$scope.projects = null;
				$scope.projectsByRole = null;
				$scope.nav = null;
				$scope.navByRole = null;

				// current user
				$scope.$watch('currentUser', function( newValue, oldValue ) {

					if(!newValue || !newValue.id)
						return;

					$q.all([
						Restangular.all('cycles').getList(),
						newValue.getList('projects')
					]).then(function(res){
						$scope.cycles = res[0];
						$scope.projects = res[1];
					});
				});

				// projects & cycles
				$scope.$watch('[projects, cycles]', function(newValues, oldValues){
					if(!newValues[0] || !newValues[1])
						return;

					var projects = newValues[0]
					var cycles = newValues[1]

					// index projects by current user's role
					$scope.projectsByRole = {};
					projects.forEach(function(project){
						var cycle = _.find(cycles, {id: project.cycle_id});
						var assignment = project.users[$scope.currentUser.id] || cycle.users[$scope.currentUser.id];

						if(!assignment)
							return;

						if(!$scope.projectsByRole[assignment.role])
							$scope.projectsByRole[assignment.role] = [];

						$scope.projectsByRole[assignment.role].push(project);
					});

					function buildNav(projects){
						if(!$scope.cycles)
							return;

						var nav = {};

						projects.forEach(function(project){
							nav[project.cycle_id] = nav[project.cycle_id] || {
								id: project.cycle_id,
								title: _.find($scope.cycles, {id: project.cycle_id}).title,
								projects: {}
							}
							nav[project.cycle_id].projects[project.id] = project;
						});

						return nav;
					}

					$scope.nav = buildNav(projects);
					$scope.navByRole = {};
					_.each($scope.projectsByRole, function(projects, role){
						$scope.navByRole[role] = buildNav(projects);
					});

				}, true);
			}
		})
		.state('portal.dashboard', {
			url: "/",
			templateUrl: "portal/portal.dashboard.html",
			controller: function($scope){

			}
		})

});
