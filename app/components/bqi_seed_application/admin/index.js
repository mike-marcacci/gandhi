angular.module('gandhi')

.controller('Components.Admin.BqiSeedApplication', function($scope, $state, Restangular) {

	$scope.data = $scope.stage.project.data;

	$scope.disabled = true;

	$scope.ckeditor = $scope.limit_300 = $scope.limit_200 = $scope.limit_150 = {
		toolbar: [],
		removePlugins: 'elementspath,wordcount',
		readOnly: true
	};

});