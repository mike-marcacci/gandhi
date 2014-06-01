angular.module('gandhi')

.controller('Components.BqiSeedReview', function($scope, $state, Restangular) {
	$scope.tab = null;

	// set the priviliges & default tab
	$scope.read = $scope.write = false;
	if($scope.role == 'advisory-reviewer'){
		$scope.read = $scope.write = true;
		$scope.tab = 'write';
	} else if($scope.role == 'advisory-council'){
		$scope.read = true;
		$scope.tab = 'read';
	}

	$scope.setTab = function(tab){
		console.log(tab)
		$scope.tab = tab;
	}



/// start yuck
	$scope.recommendations = [
		'I do not think the project should be funded',
		'The project could be funded with significant adjustments to content - Revise and Resubmit',
		'The project could be funded in the current state with budget adjustments',
		'I strongly support funding this project as is'
	]

	if($scope.project.flow.stages[$scope.stage] && $scope.project.flow.stages[$scope.stage].data){
		$scope.reviews = [];
		_.each($scope.project.flow.stages[$scope.stage].data, function(review, user_id){
			$scope.reviews.push({
				review: review,
				// user: _.find(users, {id: user_id})
			})
		})

		$scope.avgRating = $scope.reviews.map(function(r){return r.review.data.rating;}).reduce(function(sum,num){return sum+num;}) / $scope.reviews.length;
		$scope.avgRecommendation = $scope.recommendations[Math.round($scope.reviews.map(function(r){return r.review.data.recommendation;}).reduce(function(sum,num){return sum+num;}) / $scope.reviews.length)];
	}



/// end yuck


	var stageCycle = $scope.cycle.flow.stages[$scope.stage] || {};
	var stageProject = $scope.project.flow.stages[$scope.stage] || {};

	$scope.message = stageCycle.component.options[$scope.role] || '';

	$scope.rating = null;
	$scope.data = stageProject && stageProject.data && stageProject.data[$scope.currentUser.id] ? stageProject.data[$scope.currentUser.id].data : {
		abstract: {
			rating: 1,
			explaination: ''
		},
		short_answer_1: {
			rating: 1,
			explaination: ''
		},
		short_answer_2: {
			rating: 1,
			explaination: ''
		},
		outputs_and_outcomes: {
			rating: 1,
			explaination: ''
		},
		recommendation: 0
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