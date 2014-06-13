angular.module('gandhi')

.controller('Components.Admin.BqiSeedDecision', function($scope, $state, Restangular) {

	$scope.statuses = [
		{slug: 'approved', title: 'Approved'},
		{slug: 'rejected', title: 'Rejected'},
	];

	$scope.rejections = [
		'Does not align with focus areas',
		'Fundable without BQI support',
		'Does not lead to substantial research'
	];

	$scope.other = '';

	$scope.setRejection = function(v){
		$scope.data.rejection = v;
	}

	$scope.$watch('stage', function(stage){
		$scope.data = stage && stage.project && stage.project.data ? angular.copy(stage.project.data) : {};
	}, true);

	$scope.submit = function() {

		// create the base project
		var project = {flow: {stages: {}}};

		// set the project status
		if($scope.data.status == 'rejected')
			project.status = 'rejected';

		// add stage data
		project.flow.stages[$scope.stage.cycle.id] = {
			status: 'submitted',
			data: $scope.data
		}

		// activate the next stage
		// project.flow.active = $scope.cycle.flow.default[$scope.cycle.flow.default.indexOf($scope.stage) + 1];

		$scope.project.patch(project).then(function(res){

			// update the local projects record
			$scope.stage.project.data = $scope.data;
			// angular.extend($scope.project, res);

			alert('Successfully saved.')

			// redirect to the next stage
			// $state.go('portal.projects.stage', {project: res.id, stage: res.flow.active})
		}, function(err){
			alert('Sorry, but there was an error saving your changes. Pleast contact us.');
		})

	};

})

.controller('Components.Admin.BqiSeedDecision.Summary', function($scope, $state, Restangular) {


});
