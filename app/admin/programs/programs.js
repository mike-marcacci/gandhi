angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.programs', {
			url: "/programs",
			templateUrl: "admin/programs/programs.html",
			controller: function($scope, Restangular){
				$scope.programs = Restangular.all('programs').getList().$object;
			}
		})

});