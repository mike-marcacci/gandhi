angular.module('gandhi')

.controller('Components.Admin.BqiSeedSupplement', function($scope, $state, Restangular) {

	$scope.data = $scope.stage.project.data;

	$scope.ckeditor = $scope.limit_300 = $scope.limit_200 = $scope.limit_150 = {
		toolbar: [],
		removePlugins: 'elementspath,wordcount',
		readOnly: true
	};

});