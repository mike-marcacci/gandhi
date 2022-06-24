angular.module('gandhi-decorator-upload', ['schemaForm'])

// This is a modified version of this:
// https://github.com/json-schema-form/angular-schema-form-bootstrap/blob/0.2.0/src/default.html
.run(['$templateCache', function(templateCache) {
	templateCache.put(
		'modules/gandhi-decorator-upload/index.html',
		`
		<div class="form-group schema-form-upload {{form.htmlClass}}"
		     ng-class="{'has-error': form.disableErrorState !== true && hasError(), 'has-success': form.disableSuccessState !== true && hasSuccess(), 'has-feedback': form.feedback !== false }">
		  <label class="control-label {{form.labelHtmlClass}}" ng-class="{'sr-only': !showTitle()}" for="{{form.key.slice(-1)[0]}}">{{form.title}}</label>

		  <div ng-if="!form.fieldAddonLeft && !form.fieldAddonRight"
		         gandhi-decorator-upload
		         ng-show="form.key"
		         sf-changed="form"
		         placeholder="{{form.placeholder}}"
		         id="{{form.key.slice(-1)[0]}}"
		         sf-field-model
		         ng-disabled="form.readonly"
		         schema-validate="form"
		         name="{{form.key.slice(-1)[0]}}"
		         aria-describedby="{{form.key.slice(-1)[0] + 'Status'}}" />

		  <div ng-if="form.fieldAddonLeft || form.fieldAddonRight"
		       ng-class="{'input-group': (form.fieldAddonLeft || form.fieldAddonRight)}">
		    <span ng-if="form.fieldAddonLeft"
		          class="input-group-addon"
		          ng-bind-html="form.fieldAddonLeft"></span>
		    <div ng-show="form.key"
		           gandhi-decorator-upload
		           sf-changed="form"
		           placeholder="{{form.placeholder}}"
		           id="{{form.key.slice(-1)[0]}}"
		           sf-field-model
		           ng-disabled="form.readonly"
		           schema-validate="form"
		           name="{{form.key.slice(-1)[0]}}"
		           aria-describedby="{{form.key.slice(-1)[0] + 'Status'}}" />

		    <span ng-if="form.fieldAddonRight"
		          class="input-group-addon"
		          ng-bind-html="form.fieldAddonRight"></span>
		  </div>

		  <span ng-if="form.feedback !== false"
		        class="form-control-feedback"
		        ng-class="evalInScope(form.feedback) || {'glyphicon': true, 'glyphicon-ok': hasSuccess(), 'glyphicon-remove': hasError() }"
		        aria-hidden="true"></span>

		  <span ng-if="hasError() || hasSuccess()"
		        id="{{form.key.slice(-1)[0] + 'Status'}}"
		        class="sr-only">{{ hasSuccess() ? '(success)' : '(error)' }}</span>

		  <div class="help-block" sf-message="form.description"></div>
		</div>
		`);
}])

.config(['schemaFormDecoratorsProvider', 'sfBuilderProvider', function(schemaFormDecoratorsProvider, sfBuilderProvider){
	schemaFormDecoratorsProvider.defineAddOn(
		'bootstrapDecorator',
		'upload',
		'modules/gandhi-decorator-upload/index.html',
		sfBuilderProvider.stdBuilders
	);
}])

.directive('gandhiDecoratorUpload', function($upload, $window, schemaForm, sfValidator){
	return {
		template: ''
			+'<div ng-hide="ngModel.$modelValue" class="form-control">'
			+'	<input ng-disabled="form.readonly" ng-hide="inProgress > 0" type="file" ng-file-select="upload($files)">'
			+'	<div ng-show="inProgress" class="progress">'
			+'	  <div class="progress-bar progress-bar-striped active" role="progressbar" style="width: 100%"></div>'
			+'	</div>'
			+'</div>'
			+'<div ng-show="ngModel.$modelValue">'
			+'  <div class="btn btn-default" ng-click="download()">View File</div>'
			+'  <div ng-if="!form.readonly" class="btn btn-danger" ng-click="remove()"><i class="glyphicon glyphicon-trash"></i> Remove File</div>'
			+'</div>',
		restrict: 'A',
		scope: false,
		require: 'ngModel',
		link: function(scope, element, attrs, ngModel) {
			scope.inProgress = false;
			console.log(ngModel)

			scope.upload = function($files) {
				scope.inProgress = true;
				$upload.upload({
					url: 'api/files',
					method: 'POST',
					data: {},
					file: $files,
				}).success(function(data, status, headers, config) {
					scope.inProgress = false;
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
				ngModel.$setViewValue(undefined);
				ngModel.$commitViewValue();
			}

			scope.download = function(){
				var d = window.document.getElementById('downloads');
				if(d)
					d.src = 'api/files/' + scope.data + '?download=true';
				else
					$window.open('api/files/' + ngModel.$modelValue + '?download=true', '_blank');
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
