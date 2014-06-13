angular.module('gandhi')

.controller('Components.BqiSeedDecision', function($scope, $state, Restangular) {
	$scope.statuses = [
		{slug: 'approved', title: 'Approved'},
		{slug: 'rejected', title: 'Rejected'},
	];

	$scope.data = $scope.project.flow.stages[$scope.stage] && $scope.project.flow.stages[$scope.stage].data ? angular.copy($scope.project.flow.stages[$scope.stage].data) : {}

});
