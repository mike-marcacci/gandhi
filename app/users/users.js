angular.module('portal')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('user', {
			url: "/user",
			templateUrl: "app/users/users.html"
		})

});