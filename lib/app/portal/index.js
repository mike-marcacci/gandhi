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

				// current user
				$scope.$watch('currentUser', function( newValue, oldValue ) {

					if(!newValue || !newValue.id)
						return;

					$scope.cycles = Restangular.all('cycles').getList({open: true}).$object;

					// TODO: replace this with a list of "starred" projects from currentUser.starred
					$scope.projects = $scope.currentUser.getList('projects').$object;

				});

				$scope.$on('projects', function(){
					$scope.projects = $scope.projects.getList().$object;
				});

			}
		})
		.state('portal.dashboard', {
			url: "/",
			templateUrl: "portal/portal.dashboard.html",
			controller: function($scope){

			}
		})
});
