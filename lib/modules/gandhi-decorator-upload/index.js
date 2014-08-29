angular.module('gandhi-decorator-upload', [])

.config(['schemaFormDecoratorsProvider', function(decoratorsProvider){
	decoratorsProvider.addMapping('bootstrapDecorator', 'upload', 'modules/gandhi-decorator-upload/index.html');
}])

.directive('gandhiDecoratorUpload', function(){
	return {
		template: ''
			+'<div ng-hide="model" class="form-control">'
			+'	<input ng-hide="inProgress > 0" type="file" ng-file-select="upload($files)">'
			+'	<div ng-show="inProgress" class="progress">'
			+'	  <div class="progress-bar progress-bar-striped active" role="progressbar" style="width: 100%"></div>'
			+'	</div>'
			+'</div>'
			+'<div ng-show="model">'
			+'  <div class="btn btn-default" ng-click="download()">Download</div>'
			+'  <div class="btn btn-danger" ng-click="remove()"><i class="glyphicon glyphicon-trash"></i> Remove File</div>'
			+'</div>',
		restrict: 'A',
		require: 'ngModel',
		scope: {
			model: '=ngModel'
		},
		controller: function($scope, $upload, $window){
			$scope.inProgress = false;

			$scope.upload = function($files) {
				$scope.inProgress = true;
				$upload.upload({
					url: 'api/files',
					method: 'POST',
					data: {},
					file: $files,
				}).success(function(data, status, headers, config) {
					$scope.inProgress = false;
					$scope.model = data[0].id;
				})
				.error(function(err){
					$scope.inProgress = false;
					alert('There was an issue uploading your file. Please try again.');
				})
			};

			$scope.remove = function(){
				$scope.model = null;
			}

			$scope.download = function(){
				$window.open('api/files/' + $scope.model);
			}
		}
	}
});
