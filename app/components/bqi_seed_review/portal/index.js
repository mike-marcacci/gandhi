angular.module('gandhi')

.controller('Components.BqiSeedReview', function($scope, $state, Restangular) {
	var stageCycle = $scope.cycle.flow.stages[$scope.stage] || {};
	var stageProject = $scope.project.flow.stages[$scope.stage] || {};

	$scope.message = stageCycle.component.options[$scope.role] || '';

	$scope.rating = null;
	$scope.data = stageProject && stageProject.data[$scope.currentUser.id] ? stageProject.data[$scope.currentUser.id].data : {
		abstract: {
			rating: 0,
			explaination: ''
		},
		short_answer_1: {
			rating: 0,
			explaination: ''
		},
		short_answer_2: {
			rating: 0,
			explaination: ''
		},
		outputs_and_outcomes: {
			rating: 0,
			explaination: ''
		},
	};

	$scope.$watch('data',function(newValue, oldValue){
		$scope.rating =
			(newValue.abstract.rating
			+ newValue.short_answer_1.rating
			+ newValue.short_answer_2.rating
			+ newValue.outputs_and_outcomes.rating) / 4;
	}, true)

	$scope.ckSandbox = {
		toolbar: [],
		removePlugins: 'elementspath,wordcount',
		readOnly: true
	}


	$scope.submit = function() {

		///////////////////
		// Date Manipulation
		///////////////////

		$scope.data.rating = $scope.rating;



		///////////////////
		// Saving
		///////////////////

		// create the base
		var val = {flow: {stages: {}}};

		// add the stage
		val.flow.stages[$scope.stage] = {data: {}};

		// add this review
		val.flow.stages[$scope.stage].data[$scope.currentUser.id] = {
			status: 'submitted',
			data: $scope.data
		}
		// save
		$scope.project.patch(val).then(function(res){

			// update the local project record
			angular.extend($scope.project, res);

			alert('Your review has been saved.');
		}, function(err){
			alert('Sorry, but there was an error submitting your review. Pleast contact <a href="mailto:mike@ruelculture.com">Mike</a>.');
		})

	};
});