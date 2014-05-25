angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.users', {
			url: "/users",
			templateUrl: "admin/users/users.html",
			controller: function($scope, Restangular){
				$scope.users = Restangular.all('users').getList().$object;
			}
		})

});