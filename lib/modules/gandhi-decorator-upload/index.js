angular.module('gandhi-decorator-upload', [])

.config(['schemaFormDecoratorsProvider', function(decoratorsProvider){
	decoratorsProvider.addMapping('bootstrapDecorator', 'upload', 'modules/gandhi-decorator-upload/index.html');
}])

.directive('gandhiDecoratorUpload', function($upload, $window, sfSelect, schemaForm, sfValidator){
	return {
		template: ''
			+'<div ng-hide="data" class="form-control">'
			+'	<input ng-disabled="form.readonly" ng-hide="inProgress > 0" type="file" ng-file-select="upload($files)">'
			+'	<div ng-show="inProgress" class="progress">'
			+'	  <div class="progress-bar progress-bar-striped active" role="progressbar" style="width: 100%"></div>'
			+'	</div>'
			+'</div>'
			+'<div ng-show="data">'
			+'  <div class="btn btn-default" ng-click="download()">Download</div>'
			+'  <div ng-if="!form.readonly" class="btn btn-danger" ng-click="remove()"><i class="glyphicon glyphicon-trash"></i> Remove File</div>'
			+'</div>',
		restrict: 'A',
		scope: false,
		require: 'ngModel',
		link: function(scope, element, attrs, ngModel) {
			scope.inProgress = false;
			scope.data = sfSelect(scope.form.key, scope.model);

			scope.upload = function($files) {
				scope.inProgress = true;
				$upload.upload({
					url: 'api/files',
					method: 'POST',
					data: {},
					file: $files,
				}).success(function(data, status, headers, config) {
					scope.inProgress = false;
					scope.data = data[0].id;
					ngModel.$setViewValue(data[0].id);
					ngModel.$commitViewValue();
					scope.validate();
				})
				.error(function(err){
					scope.inProgress = false;
					alert('There was an issue uploading your file. Please try again.');
				})
			};

			scope.remove = function(){
				scope.data = undefined;
				ngModel.$setViewValue(undefined);
				ngModel.$commitViewValue();
			}

			scope.download = function(){
				var d = window.document.getElementById('downloads');
				if(d)
					d.src = 'api/files/' + scope.data + '?download=true';
				else
					$window.open('api/files/' + scope.data + '?download=true');
			}


			var error;

			scope.validate = function() {
				sfValidator.validate(scope.form, scope.data);
			};

			scope.$on('schemaFormValidate', scope.validate);

			scope.hasSuccess = function() {
				return ngModel.$valid && !ngModel.$pristine;
			};

			scope.hasError = function() {
				return ngModel.$invalid;
			};

			scope.schemaError = function() {
				return error;
			};

		}
	}
});
