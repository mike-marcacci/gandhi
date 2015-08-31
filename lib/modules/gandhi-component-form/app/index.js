'use strict';

angular.module('gandhi-component-form', ['gandhi-component', 'schemaForm'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.register({
		id: 'form',
		title: 'Form',
		permissions: {
			read: {
				id: 'read',
				title: 'Read'
			},
			write: {
				id: 'write',
				title: 'Write'
			}
		},
		directives: {
			default: 'gandhi-component-form',
			contentAdmin: 'gandhi-component-form',
			stageAdmin: 'gandhi-component-form-stage-admin'
		}
	});
})

.directive('gandhiComponentForm', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-form/app/default.html',
		controller: ['$scope', '$element', '$attrs', '$window', 'Stage', function($scope, $element, $attrs, $window, Stage) {
			$scope.$watch('context', function(context) {
				if(!context) return;

				// give the view access to the context
				angular.extend($scope, context);

				// set schema-form options
				$scope.sfOptions = { formDefaults: {
					supressPropertyTitles: true,
					readonly: !(context.content && context.content.authorizations && context.content.authorizations['write'])
				}};
			});

			// save the form in the background
			$scope.$on('save-form', function(){
				$scope.content.$update({
					admin: $scope.mode === 'contentAdmin',
					project: $scope.project.id,
					id: $scope.content.id
				})
			})

			// save a draft
			$scope.draft = function(){
				$scope.content.$update({
					admin: $scope.mode === 'contentAdmin',
					project: $scope.project.id,
					id: $scope.content.id
				}).then(function(content){
					$window.alert('Changes successfully saved.');
				})
			};

			// save the complete form
			$scope.complete = function(form){

				// validate form
				$scope.$broadcast('schemaFormValidate');
				if(!form.$valid) return alert('There are errors in the form. Please correct them and resubmit.');

				// make the user confirm
				if(!$window.confirm('Are you sure you want to submit this form?')) return;

				// mark as complete
				$scope.content.status_id = 'complete';
				$scope.content.$update({
					admin: $scope.mode === 'contentAdmin',
					project: $scope.project.id,
					id: $scope.content.id
				}).then(function(content){
					$window.alert('Changes successfully saved.');
				})
			}
		}]
	};
})

.directive('gandhiComponentFormStageAdmin', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-form/app/stageAdmin.html',
		controller: ['$scope', '$element', '$attrs', 'Stage', function($scope, $element, $attrs, Stage) {
			$scope.$watch('context', function(context) {
				if(!context) return;
				
				// give the view access to the context
				angular.extend($scope, context);

				// copy of the stage for schema-form
				$scope.copy = angular.copy(context.stage)

				// set schema-form options
				$scope.sfOptions = { formDefaults: {
					supressPropertyTitles: true,
				}};
			});

			// Validate form data against the schema
			$scope.validate = function(){
				$scope.$broadcast('schemaFormValidate')
			}

			// Instructions
			$scope.stageInstructionsEdit = null;
			$scope.toggleStageInstructionsEdit = function(){
				$scope.stageInstructionsEdit = $scope.stageInstructionsEdit ? null : new Stage({component:{options:{
					instructions: $scope.stage.component.options.instructions,
					instructionsCols: $scope.stage.component.options.instructionsCols,
					draftButton: $scope.stage.component.options.draftButton,
					draftButtonText: $scope.stage.component.options.draftButtonText,
					submitButtonText: $scope.stage.component.options.submitButtonText,
				}}});
			};
			$scope.updateStageInstructions = function(){
				$scope.stageInstructionsEdit.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.stage.id
				}).then(function(){
					$scope.stageInstructionsEdit = null;
				});
			}

			// Schema
			$scope.stageSchemaEdit = null;
			$scope.toggleStageSchemaEdit = function(){
				$scope.stageSchemaEdit = $scope.stageSchemaEdit ? null : new Stage({component:{options:{schema: $scope.stage.component.options.schema}}});
			};
			$scope.updateStageSchema = function(){
				$scope.stageSchemaEdit.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.stage.id
				}).then(function(){
					$scope.stageSchemaEdit = null;
				});
			}

			// Form
			$scope.stageFormEdit = null;
			$scope.toggleStageFormEdit = function(){
				$scope.stageFormEdit = $scope.stageFormEdit ? null : new Stage({component:{options:{form: $scope.stage.component.options.form || ['*']}}});
			};
			$scope.updateStageForm = function(){
				$scope.stageFormEdit.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.stage.id
				}).then(function(){
					$scope.stageFormEdit = null;
				});
			}
			
		}]
	};
});

