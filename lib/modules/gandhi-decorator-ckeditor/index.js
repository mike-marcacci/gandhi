angular.module('gandhi-decorator-ckeditor', ['schemaForm'])

// This is a modified version of this:
// https://github.com/json-schema-form/angular-schema-form-bootstrap/blob/0.2.0/src/textarea.html
.run(['$templateCache', function(templateCache) {
	templateCache.put(
		'modules/gandhi-decorator-ckeditor/index.html',
		`
		<div class="form-group has-feedback {{form.htmlClass}} schema-form-ckeditor" ng-class="{'has-error': form.disableErrorState !== true && hasError(), 'has-success': form.disableSuccessState !== true &&  hasSuccess()}">
		  <label class="control-label {{form.labelHtmlClass}}" ng-class="{'sr-only': !showTitle()}" for="{{form.key.slice(-1)[0]}}">{{form.title}}</label>
		  <span class="help-block" sf-message="form.description"></span>

		  <textarea ng-if="!form.fieldAddonLeft && !form.fieldAddonRight"
		            ckeditor="form.readonly ? {readOnly: true, toolbar: []} : {}"
		            class="form-control {{form.fieldHtmlClass}}"
		            id="{{form.key.slice(-1)[0]}}"
		            sf-changed="form"
		            placeholder="{{form.placeholder}}"
		            ng-disabled="form.readonly"
		            sf-field-model
		            schema-validate="form"
		            name="{{form.key.slice(-1)[0]}}"></textarea>

		  <div ng-if="form.fieldAddonLeft || form.fieldAddonRight"
		       ng-class="{'input-group': (form.fieldAddonLeft || form.fieldAddonRight)}">
		    <span ng-if="form.fieldAddonLeft"
		          class="input-group-addon"
		          ng-bind-html="form.fieldAddonLeft"></span>
		    <textarea class="form-control {{form.fieldHtmlClass}}"
		              ckeditor="form.readonly ? {readOnly: true, toolbar: []} : {}"
		              id="{{form.key.slice(-1)[0]}}"
		              sf-changed="form"
		              placeholder="{{form.placeholder}}"
		              ng-disabled="form.readonly"
		              sf-field-model
		              schema-validate="form"
		              name="{{form.key.slice(-1)[0]}}"></textarea>
		    <span ng-if="form.fieldAddonRight"
		          class="input-group-addon"
		          ng-bind-html="form.fieldAddonRight"></span>
		  </div>
		  <span class="help-block">{{ (hasError() && errorMessage(schemaError())) || '' }}</span>
		</div>
		`);
}])

.config(['schemaFormDecoratorsProvider', 'sfBuilderProvider', function(schemaFormDecoratorsProvider, sfBuilderProvider){
	schemaFormDecoratorsProvider.defineAddOn(
		'bootstrapDecorator',
		'ckeditor',
		'modules/gandhi-decorator-ckeditor/index.html',
		sfBuilderProvider.stdBuilders
	);
}]);