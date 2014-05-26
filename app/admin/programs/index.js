angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.programs', {
			url: "/programs",
			templateUrl: "admin/programs/index.html",
			controller: function($scope, Restangular){
				$scope.programs = Restangular.all('programs').getList().$object;
			}
		})

});