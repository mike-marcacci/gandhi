angular.module('portal')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('dashboard', {
			url: "/dashboard",
			templateUrl: "app/dashboard/dashboard.html"
		})
		.state('dashboard.alerts', {
			url: "/alerts",
			templateUrl: "app/dashboard/dashboard.alerts.html",
			controller: function($scope) {
				$scope.alerts = ["A", "List", "Of", "Items"];
			}
		})

});