'use strict';

angular.module('gandhi-component-schedule', ['gandhi-component', 'schemaForm'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.components['schedule'] = {
		title: "Form",
		directives: {
			default: 'gandhi-component-schedule',
			summary: 'gandhi-component-schedule-summary',
			admin: 'gandhi-component-schedule-admin'
		}
	};
})

.directive('gandhiComponentSchedule', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-schedule/app/default.html',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state) {
			$scope.$watch('context', function(context) {
				if(!context.cycle || !context.project)
					return;

				$scope.stage = context.cycle.flow[context.stage];
				$scope.options = context.cycle.flow[context.stage].component.options;

				// show the summary in summary mode
				$scope.form = $scope.options.form;
				$scope.saveable = context.mode === 'default';

				$scope.permissions = context.project.flow[context.stage].permissions;

				$scope.data = context.project.flow[context.stage].data;
				$scope.status = context.project.flow[context.stage].status;
				$scope.config = { formDefaults: { readonly: !$scope.permissions.write } };






				$scope.timezone = $scope.options.timezone;

				$scope.schedule = _($scope.options.slots)
					.map(function(data,id){
						return { begin: new Date(data.begin), end: new Date(data.end), id: id, available: !$scope.options.assignments[id] };
					})
					.sortBy('begin')
					.groupBy(function(o){ return o.begin.getFullYear() + ("0" + (o.begin.getMonth() + 1)).slice(-2) + ("0" + o.begin.getDate()).slice(-2); })
					.valueOf();

				$scope.reserve = function(slot){
					if(slot.available) $scope.data.reservation = slot.id;
				}







				

				$scope.save = function(){
					if(!$scope.permissions.write)
						return alert('Sorry, but you do not have write permissions.');

					var project = {flow:{}};
					project.flow[context.stage] = {
						id: context.stage,
						data: $scope.data,
						status: 'draft'
					}

					context.project.patch(project).then(function(res){

						// update the project
						$rootScope.$broadcast('projects');

						alert('Changes successfully saved! You may continue to make changes.');
					}, function(err){
						alert('Sorry, but there was an error saving your changes. Pleast contact us.');
					});
				}

				$scope.submit = function(form, model){
					if(!$scope.permissions.write)
						return alert('Sorry, but you do not have write permissions.');

					// validate
					$scope.$broadcast('schemaFormValidate');
					if (!form.$valid)
					  return alert('Sorry, but there are errors the form. Please correct them before submitting.');

					// confirm submission
					if($scope.options.confirm && !confirm($scope.options.confirm))
						return;

					var project = {flow:{}};
					project.flow[context.stage] = {
						id: context.stage,
						data: $scope.data,
						status: 'complete'
					}

					context.project.patch(project).then(function(res){

						// update the project lists
						$rootScope.$broadcast('projects');

						// update the project itself
						angular.extend(context.project, res);

						alert('Your application has successfully been submitted!');

						// redirect to the next stage
						if($scope.options.next)
							$state.go('portal.projects.show.flow', {project: res.data.id, stage: $scope.options.next});

					}, function(err){
						alert('Sorry, but there was an error submitting this application. Pleast contact us.');
					});
				}

			});
		}
	}
})

.directive('gandhiComponentScheduleSummary', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-schedule/app/summary.html',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state) {
			$scope.$watch('context', function(context) {

				if(!context.cycle || !context.project)
					return;

				$scope.stage = context.cycle.flow[context.stage];
				$scope.options = context.cycle.flow[context.stage].component.options;

				// show the summary in summary mode
				$scope.form = $scope.options.summary || $scope.options.form;
				$scope.saveable = context.mode === 'default';

				$scope.permissions = context.project.flow[context.stage].permissions;

				$scope.data = context.project.flow[context.stage].data;
				$scope.status = context.project.flow[context.stage].status;
				$scope.config = { formDefaults: { readonly: false } };


				$scope.timezone = $scope.options.timezone;

				$scope.schedule = _($scope.options.slots)
					.map(function(data,id){
						return { begin: new Date(data.begin), end: new Date(data.end), id: id, available: !$scope.options.assignments[id] };
					})
					.sortBy('begin')
					.groupBy(function(o){ return o.begin.getFullYear() + ("0" + (o.begin.getMonth() + 1)).slice(-2) + ("0" + o.begin.getDate()).slice(-2); })
					.valueOf();

				$scope.reserve = function(slot){
					if(slot.available) $scope.data.reservation = slot.id;
				}
			});
		}
	}
})

.directive('gandhiComponentScheduleAdmin', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-schedule/app/admin.html',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state) {


			$scope.$watch('context', function(context) {

				$scope.cycle = context.cycle;

				$scope.stage = context.cycle.flow[context.stage];
				$scope.options = context.cycle.flow[context.stage].component.options;
				$scope.data = angular.copy($scope.options);

				$scope.timezone = $scope.options.timezone;

				$scope.schedule = _($scope.options.slots)
					.map(function(data,id){
						return { begin: new Date(data.begin), end: new Date(data.end), id: id, available: !$scope.options.assignments[id] };
					})
					.sortBy('begin')
					.groupBy(function(o){ return o.begin.getFullYear() + ("0" + (o.begin.getMonth() + 1)).slice(-2) + ("0" + o.begin.getDate()).slice(-2); })
					.valueOf();

				$scope.select = function(slot){
					if(!$scope.options.assignments[slot.id])
						return;

					$scope.selected = slot;

					Restangular.all('projects').get($scope.options.assignments[slot.id]).then(function(res){
						$scope.project = res.data;
					});
				}
			});
			
		}
	}
});

