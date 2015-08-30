'use strict';

angular.module('gandhi-component-schedule', ['gandhi-component', 'schemaForm'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.register({
		id: 'schedule',
		title: 'Schedule',
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
			default: 'gandhi-component-schedule',
			contentAdmin: 'gandhi-component-schedule',
			stageAdmin: 'gandhi-component-schedule-stage-admin'
		}
	});
})

.directive('gandhiComponentSchedule', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-schedule/app/default.html',
		controller: ['$scope', '$element', '$attrs', '$window', 'Stage', function($scope, $element, $attrs, $window, Stage) {
			$scope.$watch('context', function(context) {
				if(!context) return;
				
				// give the view access to the context
				angular.extend($scope, context);

				// set defaults
				$scope.resetSlots();

				if($scope.stage && $scope.stage.component.options.slots && $scope.content && $scope.content.data.slot_id)
					$scope.selected = $scope.stage.component.options.slots[$scope.content.data.slot_id];
				
			});




			// Reset slots
			$scope.slots = {};
			$scope.resetSlots = function() {
				var slots = $scope.stage.component.options.slots || {};

				$scope.slots = _(slots)
				.map(function(s){
					return {
						id: s.id,
						begin: new Date(s.begin),
						end: new Date(s.end),
						project_id: s.project_id
					};
				})
				.sortBy('begin')
				.value();

				$scope.selected = null;
			};

			// Build the schedule data structure
			$scope.$watch('slots', function(slots){
				$scope.schedule = _.groupBy(slots, function(o){
					return o.begin.getFullYear() + ('0' + (o.begin.getMonth() + 1)).slice(-2) + ('0' + o.begin.getDate()).slice(-2);
				});
			}, true);


			// Select slot
			$scope.selected = null;
			$scope.selectSlot = function(slot) {
				if(slot.project_id && slot.project_id != $scope.content.project_id)
					return;

				$scope.selected = slot == $scope.selected ? null : slot;
				$scope.content.data.slot_id = $scope.selected ? $scope.selected.id : null;
			};


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
				});
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
				});
			};
		}]
	};
})

.directive('gandhiComponentScheduleStageAdmin', function(uuid) {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-schedule/app/stageAdmin.html',
		controller: ['$scope', '$element', '$attrs', 'Stage', function($scope, $element, $attrs, Stage) {
			$scope.$watch('context', function(context) {
				if(!context) return;
				
				// give the view access to the context
				angular.extend($scope, context);

				// set defaults
				$scope.resetSlots();
				
			});




			// Reset slots
			$scope.slots = {};
			$scope.resetSlots = function() {
				var slots = $scope.stage.component.options.slots || {};

				$scope.slots = _(slots)
				.map(function(s){
					return {
						id: s.id,
						begin: new Date(s.begin),
						end: new Date(s.end),
						project_id: s.project_id
					};
				})
				.sortBy('begin')
				.value();

				$scope.selected = null;
			};

			// Build the schedule data structure
			$scope.$watch('slots', function(slots){
				$scope.schedule = _.groupBy(slots, function(o){
					return o.begin.getFullYear() + ('0' + (o.begin.getMonth() + 1)).slice(-2) + ('0' + o.begin.getDate()).slice(-2);
				});
			}, true);


			// Select slot
			$scope.selected = null;
			$scope.selectSlot = function(slot) {
				$scope.selected = slot == $scope.selected ? null : slot;
			};

			// Add slot
			$scope.addSlot = function(begin){
				var begin = begin || new Date();
				var slot = {
					id: uuid(),
					begin: begin,
					end: new Date(begin.getTime() + 25*60*1000),
					project_id: null
				};
				$scope.slots.push(slot);
				$scope.slots = _.sortBy($scope.slots, 'begin');
				$scope.selectSlot(slot);
			};

			$scope.nextSlot = function(e, previous){
				e.preventDefault();
				e.stopPropagation();
				$scope.addSlot(new Date(previous.end.getTime() + 5*60*1000));
			};

			// Add slot
			$scope.removeSlot = function(slot){
				$scope.slots.some(function(s, i){
					if(s !== slot) return;
					$scope.slots.splice(i, 1);
					return true;
				});

				if(slot == $scope.selected)
					$scope.selected = null;
			};

			// Save slots
			$scope.updateSlots = function(){
				new Stage({component:{options:{slots: _.indexBy($scope.slots, 'id') }}}).$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.stage.id
				});
			};









			// Validate form data against the schema
			$scope.validate = function(){
				$scope.$broadcast('schemaFormValidate');
			};

			// Instructions
			$scope.stageInstructionsEdit = null;
			$scope.toggleStageInstructionsEdit = function(){
				$scope.stageInstructionsEdit = $scope.stageInstructionsEdit ? null : new Stage({component:{options:{instructions: $scope.stage.component.options.instructions}}});
			};
			$scope.updateStageInstructions = function(){
				$scope.stageInstructionsEdit.$update({
					admin: true,
					cycle: $scope.cycle.id,
					id: $scope.stage.id
				}).then(function(){
					$scope.stageInstructionsEdit = null;
				});
			};
		}]
	};
});
