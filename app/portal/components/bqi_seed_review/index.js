angular.module('gandhi')

.controller('Components.BqiSeedReview', function($scope, $state, Restangular) {
	$scope.data = {

	};


	$scope.submit = function() {
		// var val = {
		// 	title: $scope.application.title,
		// 	program_id: $scope.program.id,
		// 	users: [{
		// 		id: $scope.currentUser.id,
		// 		roles: ['owner']
		// 	}],
		// 	flow: {
		// 		stages: {}
		// 	}
		// };

		// val.flow.stages[$scope.stage] = {
		// 	data: $scope.application
		// }

		// val.flow.active = $scope.program.flow.default[1];

		// $scope.projects.post(val).then(function(res){
		// 	$scope.projects.push(res);

		// 	$state.go('portal.projects.stage', {project: res.id, stage: res.flow.active})
		// }, function(err){
		// 	alert('err')
		// })

		// $http.post('/api/projects', val)
	};
});