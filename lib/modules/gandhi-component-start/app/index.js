'use strict';

angular.module('gandhi-component-start', ['gandhi-component'])

.config(function(GandhiComponentProvider) {
	GandhiComponentProvider.components['start'] = {
		directive: 'gandhi-component-start'
	};
})

.directive('gandhiComponentStart', function() {
	return {
		scope: false,
		templateUrl: 'assets/bower/gandhi-component-start/app/index.html',
		controller: function($scope, $element, $attrs) {
			$scope.$watch('context', function(context) {
				var options = context.cycle.flow[context.stage].component.options;

				$scope.permissions = {
					read: context.role === null || options.permissions.read.indexOf(context.role) !== -1,
					write: context.role === null || options.permissions.write.indexOf(context.role) !== -1
				}

				$scope.data = Object.create(context.project || {});

				$scope.submit = function(){

					// if we're updating an existing project
					if(context.project){

						// just take the edits directly for now...
						var project = $scope.data;

						if(!project.flow[context.stage])
							project.flow[context.stage] = {};

						project.flow[context.stage].status = 'complete';

						context.project.patch(project).then(function(res){

							// update the local project
							angular.extend(context.project, res);

							// redirect to the next stage
							$state.go('portal.projects.show', {project: res.id, stage: options.next})
						}, function(err){
							alert('Sorry, but there was an error submitting this application. Pleast contact us.');
						});

					}

					// we're creating a new project
					else {
						// // create the base project
						// var project = {
						// 	title: $data.title,
						// 	cycle_id: $context.cycle.id,
						// 	users: {},
						// 	flow: {}
						// };

						// // add user
						// project.users[$scope.currentUser.id] = {
						// 	id: $scope.currentUser.id,
						// 	role: 'applicant'
						// };

						// // this stage has been submitted
						// project.flow.stages[$scope.stage] = {
						// 	status: 'submitted',
						// 	data: {}
						// };

						// // set the active stage to the next stage
						// project.flow.active = $scope.cycle.flow.default[1];

						// $scope.projects.post(project).then(function(res){

						// 	// update the local projects list
						// 	$scope.projects.push(res);

						// 	// redirect to the next stage
						// 	$state.go('portal.projects.stage', {project: res.id, stage: res.flow.active})
						// }, function(err){
						// 	alert('Sorry, but there was an error submitting this application. Pleast contact us.');
						// });
					}


				}

			})
		}
	}
});

