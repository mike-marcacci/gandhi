angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal.user', {
			url: "/user",
			templateUrl: "portal/users/index.html"
		})

});