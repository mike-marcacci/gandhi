'use strict';

angular.module('gandhi-component-decision', ['gandhi-component', 'schemaForm'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.components['decision'] = {
		title: "Form",
		directives: {
			default: 'gandhi-component-decision',
			summary: 'gandhi-component-decision',
			presentation: 'gandhi-component-decision',
			admin: 'gandhi-component-decision-admin'
		}
	};
})

.directive('compile', function($compile) {
	// directive factory creates a link function
	return function(scope, element, attrs) {
		scope.$watch(
			function(scope) {
				 // watch the 'compile' expression for changes
				return scope.$eval(attrs.compile);
			},
			function(value) {
				// when the 'compile' expression changes
				// assign it into the current DOM
				element.html(value);

				// compile the new DOM and link it to the current
				// scope.
				// NOTE: we only compile .childNodes so that
				// we don't get into infinite loop compiling ourselves
				$compile(element.contents())(scope);
			}
		);
	};
})

.directive('gandhiComponentDecision', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-decision/app/default.html',
		controller: function($scope, $compile, $element, $attrs, $rootScope, Restangular, $state) {
			$scope.$watch('context', function(context) {

				if(!context.cycle || !context.project)
					return;

				$scope.notifications

				$scope.project = context.project;
				$scope.cycle = context.cycle;

				$scope.stage = context.cycle.flow[context.stage];
				$scope.options = context.cycle.flow[context.stage].component.options;

				$scope.form = $scope.options.form;

				$scope.permissions = context.mode == 'summary'
					? {'read:message': true, 'read:form': true, 'write': true}
					: context.project.flow[context.stage].permissions;

				$scope.data = context.project.flow[context.stage].data;
				$scope.status = context.project.flow[context.stage].status;
				$scope.config = { formDefaults: { readonly: !$scope.permissions.write } }; // TODO: get from permissions!!!




				context.project.getList('users').then(function(users){
					$scope.users = _.indexBy(users.data, 'id');
					var emailsByRole = _.mapValues(_.groupBy(context.project.users, 'role'), function(assignments, roles){
						return _.compact(_.map(assignments, function(assignment){
							return $scope.users[assignment.id] ? $scope.users[assignment.id].email : null;
						}));
					});

					$scope.emailsByResolution = {};
					_.each($scope.options.resolutions, function(resolution, id){
						$scope.emailsByResolution[id] = _.flatten(_.map(resolution.emailTo, function(role){
							return emailsByRole[role];
						}))
					});					
				})

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

						alert('Successfully saved!');

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


.directive('gandhiComponentDecisionAdmin', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-decision/app/admin.html',
		controller: function($scope, $element, $attrs, $rootScope, Restangular, $state) {

		}
	}
});

