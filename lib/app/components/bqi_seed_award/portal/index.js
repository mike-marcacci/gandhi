angular.module('gandhi')

.controller('Components.BqiSeedDecision', function($scope, $state, Restangular) {

	$scope.decision = $scope.project.flow.stages['internal_decision'] && $scope.project.flow.stages['internal_decision'].data.status ? $scope.project.flow.stages['internal_decision'].data : null;
	$scope.data = $scope.project.flow.stages[$scope.stage] && $scope.project.flow.stages[$scope.stage].data ? angular.copy($scope.project.flow.stages[$scope.stage].data) : {
		date: new Date().toDateString()
	};

	$scope.disabled = ($scope.project.flow.stages[$scope.stage] && $scope.project.flow.stages[$scope.stage].status == 'submitted');

	$scope.submit = function() {

		// create the base project
		var project = {flow: {stages: {}}};

		// add stage data
		project.flow.stages[$scope.stage] = {
			status: 'submitted',
			data: $scope.data
		}

		// activate the next stage
		project.flow.active = $scope.cycle.flow.default[$scope.cycle.flow.default.indexOf($scope.stage) + 1];

		$scope.project.patch(project).then(function(res){

			// update the local projects record
			angular.extend($scope.project, res);

			// redirect to the next stage
			$state.go('portal.projects.stage', {project: res.id, stage: res.flow.active})
		}, function(err){
			alert('Sorry, but there was an error saving your changes. Pleast contact us.');
		})

	};

});
