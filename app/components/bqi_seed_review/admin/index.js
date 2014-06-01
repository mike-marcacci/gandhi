angular.module('gandhi')

.controller('Components.Admin.BqiSeedReview', function($scope, $state, $location, Restangular) {

	if(!$scope.params.review)
		return;

	$scope.data = $scope.stage.project.data[$scope.params.review].data;
	$scope.$watch('data',function(newValue, oldValue){
		$scope.rating =
			(newValue.abstract.rating
			+ newValue.short_answer_1.rating
			+ newValue.short_answer_2.rating
			+ newValue.outputs_and_outcomes.rating) / 4;
	}, true)

	$scope.disabled = true;

	$scope.ckeditor = $scope.limit_300 = $scope.limit_200 = $scope.limit_150 = {
		toolbar: [],
		removePlugins: 'elementspath,wordcount',
		readOnly: true
	};

})

.controller('Components.Admin.BqiSeedReview.summary', function($scope, $state, Restangular) {
	$scope.reviews = [];
	$scope.rating = null;

	$scope.recommendations = [
		'I do not think the project should be funded',
		'The project could be funded with significant adjustments to content - Revise and Resubmit',
		'The project could be funded in the current state with budget adjustments',
		'I strongly support funding this project as is'
	]

	$scope.$watchCollection('[stage, users]', function(newValues, oldValues){
		if(!newValues[0] || !newValues[1])
			return;

		var stage = newValues[0];
		var users = newValues[1];

		if(!stage || !stage.project || !stage.project.data)
			return;

		$scope.reviews = [];
		_.each(stage.project.data, function(review, user_id){
			$scope.reviews.push({
				review: review,
				user: _.find(users, {id: user_id})
			})
		})

		if(!$scope.reviews.length)
			return;

		$scope.rating = $scope.reviews.map(function(r){return r.review.data.rating;}).reduce(function(sum,num){return sum+num;}) / $scope.reviews.length;
		$scope.recommendation = $scope.recommendations[Math.round($scope.reviews.map(function(r){return r.review.data.recommendation;}).reduce(function(sum,num){return sum+num;}) / $scope.reviews.length)];
	})

	$scope.setReview = function(review){
		$scope.params.review = review.user.id;
	}
})
