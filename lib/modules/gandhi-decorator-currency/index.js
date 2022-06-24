angular.module('gandhi-decorator-currency', ['schemaForm'])

// This is a modified version of this:
// https://github.com/json-schema-form/angular-schema-form-bootstrap/blob/0.2.0/src/default.html
.run(['$templateCache', function(templateCache) {
	templateCache.put(
		'modules/gandhi-decorator-currency/index.html',
		`
		<div class="form-group schema-form-currency {{form.htmlClass}}"
		     ng-class="{'has-error': form.disableErrorState !== true && hasError(), 'has-success': form.disableSuccessState !== true && hasSuccess(), 'has-feedback': form.feedback !== false }">
		  <label class="control-label {{form.labelHtmlClass}}" ng-class="{'sr-only': !showTitle()}" for="{{form.key.slice(-1)[0]}}">{{form.title}}</label>

		  <input ng-if="!form.fieldAddonLeft && !form.fieldAddonRight"
		         currency
		         ng-show="form.key"
		         type="text"
		         step="any"
		         sf-changed="form"
		         placeholder="{{form.placeholder}}"
		         class="form-control {{form.fieldHtmlClass}}"
		         id="{{form.key.slice(-1)[0]}}"
		         sf-field-model
		         ng-disabled="form.readonly"
		         schema-validate="form"
		         name="{{form.key.slice(-1)[0]}}"
		         aria-describedby="{{form.key.slice(-1)[0] + 'Status'}}">

		  <div ng-if="form.fieldAddonLeft || form.fieldAddonRight"
		       ng-class="{'input-group': (form.fieldAddonLeft || form.fieldAddonRight)}">
		    <span ng-if="form.fieldAddonLeft"
		          class="input-group-addon"
		          ng-bind-html="form.fieldAddonLeft"></span>
		    <input ng-show="form.key"
		           currency
		           type="text"
		           step="any"
		           sf-changed="form"
		           placeholder="{{form.placeholder}}"
		           class="form-control {{form.fieldHtmlClass}}"
		           id="{{form.key.slice(-1)[0]}}"
		           sf-field-model
		           ng-disabled="form.readonly"
		           schema-validate="form"
		           name="{{form.key.slice(-1)[0]}}"
		           aria-describedby="{{form.key.slice(-1)[0] + 'Status'}}">

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
		'currency',
		'modules/gandhi-decorator-currency/index.html',
		sfBuilderProvider.stdBuilders
	);
}]);
