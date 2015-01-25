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
		controller: ['$scope', '$element', '$attrs', '$rootScope', 'Stage', function($scope, $element, $attrs, $rootScope, Stage) {

		}]
	};
})

.directive('gandhiComponentFormStageAdmin', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-form/app/stageAdmin.html',
		controller: ['$scope', '$element', '$attrs', '$rootScope', 'Stage', function($scope, $element, $attrs, $rootScope, Stage) {
			$scope.$watch('context', function(context) {
				// give the view access to the context
				angular.extend($scope, context);
			});

			// Instructions
			$scope.stageInstructionsEdit = null;
			$scope.toggleStageInstructionsEdit = function(){
				$scope.stageInstructionsEdit = $scope.stageInstructionsEdit ? null : new Stage({component:{options:{instructions: $scope.stage.component.options.instructions}}});
			};
			$scope.updateStageInstructions = function(){
				$scope.stageInstructionsEdit.$update({cycle: $scope.cycle.id, id: $scope.stage.id}).then(function(){
					$scope.stageInstructionsEdit = null;
				});
			}

			// Schema
			$scope.stageSchemaEdit = null;
			$scope.toggleStageSchemaEdit = function(){
				$scope.stageSchemaEdit = $scope.stageSchemaEdit ? null : new Stage({component:{options:{schema: $scope.stage.component.options.schema}}});
			};
			$scope.updateStageSchema = function(){
				$scope.stageSchemaEdit.$update({cycle: $scope.cycle.id, id: $scope.stage.id}).then(function(){
					$scope.stageSchemaEdit = null;
				});
			}

			// Form
			$scope.stageFormEdit = null;
			$scope.toggleStageFormEdit = function(){
				$scope.stageFormEdit = $scope.stageFormEdit ? null : new Stage({component:{options:{form: $scope.stage.component.options.form || ['*']}}});
			};
			$scope.updateStageForm = function(){
				$scope.stageFormEdit.$update({cycle: $scope.cycle.id, id: $scope.stage.id}).then(function(){
					$scope.stageFormEdit = null;
				});
			}

			// Presentation
			$scope.stagePresentationEdit = null;
			$scope.toggleStagePresentationEdit = function(){
				$scope.stagePresentationEdit = $scope.stagePresentationEdit ? null : new Stage({component:{options:{presentation: $scope.stage.component.options.presentation || ['*']}}});
			};
			$scope.updateStagePresentation = function(){
				$scope.stagePresentationEdit.$update({cycle: $scope.cycle.id, id: $scope.stage.id}).then(function(){
					$scope.stagePresentationEdit = null;
				});
			}

			// Summary
			$scope.stageSummaryEdit = null;
			$scope.toggleStageSummaryEdit = function(){
				$scope.stageSummaryEdit = $scope.stageSummaryEdit ? null : new Stage({component:{options:{summary: $scope.stage.component.options.summary || ['*']}}});
			};
			$scope.updateStageSummary = function(){
				$scope.stageSummaryEdit.$update({cycle: $scope.cycle.id, id: $scope.stage.id}).then(function(){
					$scope.stageSummaryEdit = null;
				});
			}
			
		}]
	};
});

