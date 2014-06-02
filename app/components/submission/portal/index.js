angular.module('gandhi')

.controller('Components.Submission', function($scope, $state, Restangular, $window) {
	$scope.submit = function() {

		// TODO: remove!!!
		$scope.lock = true;

		if(!$window.confirm('Are you sure you want to submit your project right now?'))
			return;

		var project = {flow: {stages: {}}};

		// this stage has been submitted
		project.flow.stages[$scope.stage] = {
			status: 'submitted',
			data: {}
		};

		// activate the next stage
		project.flow.active = $scope.cycle.flow.default[$scope.cycle.flow.default.indexOf($scope.stage) + 1];

		$scope.project.patch(project).then(function(res){

			// update the local project
			angular.extend($scope.project, res);

			// redirect to the next stage
			$state.go('portal.projects.stage', {project: res.id, stage: res.flow.active})
		}, function(err){
			alert('Sorry, but there was an error submitting this application. Pleast contact us.');
		});
	};
});