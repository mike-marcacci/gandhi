angular.module('portal')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.user', {
			url: "/user",
			templateUrl: "app/users/users.html"
		})

});