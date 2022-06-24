angular.module('gandhi-decorator-elastic-textarea', ['schemaForm'])

// This is a modified version of this:
// https://github.com/json-schema-form/angular-schema-form-bootstrap/blob/0.2.0/src/textarea.html
.run(['$templateCache', function(templateCache) {
	templateCache.put(
		'modules/gandhi-decorator-elastic-textarea/index.html',
		`
		<div class="form-group has-feedback {{form.htmlClass}} schema-form-elastic-textarea" ng-class="{'has-error': form.disableErrorState !== true && hasError(), 'has-success': form.disableSuccessState !== true &&  hasSuccess()}">
		  <label class="control-label {{form.labelHtmlClass}}" ng-class="{'sr-only': !showTitle()}" for="{{form.key.slice(-1)[0]}}">{{form.title}}</label>

		  <textarea ng-if="!form.fieldAddonLeft && !form.fieldAddonRight"
		            msd-elastic
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
		              msd-elastic
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

		  <span class="help-block" sf-message="form.description"></span>
		</div>
		`);
}])

.config(['schemaFormDecoratorsProvider', 'sfBuilderProvider', function(schemaFormDecoratorsProvider, sfBuilderProvider){
	schemaFormDecoratorsProvider.defineAddOn(
		'bootstrapDecorator',
		'elastic-textarea',
		'modules/gandhi-decorator-elastic-textarea/index.html',
		sfBuilderProvider.stdBuilders
	);
}]);