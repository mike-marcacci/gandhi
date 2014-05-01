angular.module('portal')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('portal', {
			url: "/portal",
			templateUrl: "app/portal/portal.html",
			resolve: {
				user: function(){
					return {};
					return Restangular.one("users", $rootScope.userId).get()
				}
			},
			controller: function($scope, user){
				$scope.user = user;
			}
		})
		.state('portal.dashboard', {
			url: "/",
			templateUrl: "app/portal/portal.dashboard.html",
			controller: function($scope){
				
			}
		})

});