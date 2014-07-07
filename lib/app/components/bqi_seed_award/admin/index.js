angular.module('gandhi')

.controller('Components.Admin.BqiSeedAward', function($scope, $state, Restangular) {
	$scope.data = $scope.stage && $scope.stage.project && $scope.stage.project.data ? angular.copy($scope.stage.project.data) : {
		date: new Date().toDateString()
	};

	$scope.submit = function() {

		// create the base project
		var project = {flow: {stages: {}}};

		// add stage data
		project.flow.stages[$scope.stage.cycle.id] = {
			status: 'submitted',
			data: $scope.data
		}

		// activate the next stage
		// project.flow.active = $scope.cycle.flow.default[$scope.cycle.flow.default.indexOf($scope.stage) + 1];

		$scope.project.patch(project).then(function(res){

			// update the local projects record
			angular.extend($scope.project, res);

			alert('Successfully saved.')

			// redirect to the next stage
			// $state.go('portal.projects.stage', {project: res.id, stage: res.flow.active})
		}, function(err){
			alert('Sorry, but there was an error saving your changes. Pleast contact us.');
		})

	};
});
