angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.reports', {
			url: "/reports",
			template: "<h2>Reports</h2><p>Coming Soon</p>",
			controller: function($scope, $stateParams, $state, Restangular){

			}
		})
});