angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {
	$stateProvider
		.state('portal.admin', {
			url: "/admin",
			template: "<div ui-view></div>",
			abstract: true,
			resolve: {},
			controller: function($scope, $state){
				$scope.$watch('currentUser', function(currentUser){
					// non-admin users don't belong here
					if(currentUser && !currentUser.admin)
						$state.go('portal.dashboard');
				});
			}
		})
		.state('portal.admin.dashboard', {
			url: "",
			templateUrl: "portal/admin/dashboard.html",
			controller: function($scope){

			}
		})

});
