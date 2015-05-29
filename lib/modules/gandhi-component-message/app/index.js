'use strict';

angular.module('gandhi-component-message', ['gandhi-component', 'schemaForm'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.register({
		id: 'message',
		title: 'Message',
		permissions: {
			read: {
				id: 'read',
				title: 'Read'
			}
		},
		directives: {
			default: 'gandhi-component-message',
			contentAdmin: 'gandhi-component-message',
			stageAdmin: 'gandhi-component-message-stage-admin'
		}
	});
})

.directive('gandhiComponentMessage', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-message/app/default.html',
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


			// save a draft
			$scope.draft = function(){

				// mark as draft
				$scope.content.status_id = 'draft';
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

.directive('gandhiComponentMessageStageAdmin', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-message/app/stageAdmin.html',
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

			// Message
			$scope.stageMessageEdit = null;
			$scope.toggleStageMessageEdit = function(){
				$scope.stageMessageEdit = $scope.stageMessageEdit ? null : new Stage({component:{options:{message: $scope.stage.component.options.message}}});
			};
			$scope.updateStageMessage = function(){
				$scope.stageMessageEdit.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.stage.id
				}).then(function(){
					$scope.stageMessageEdit = null;
				});
			}
			
		}]
	};
});

