angular.module('gandhi')

.controller('Components.BqiSeedReview', function($scope, $state, Restangular) {
	var stageProgram = $scope.program.flow.stages[$scope.stage] || {};
	var stageProject = $scope.project.flow.stages[$scope.stage] || {};

	$scope.message = stageProgram.component.options[$scope.role] || '';

	$scope.data = {

	};

	$scope.sandbox = {
		toolbar: [],
		removePlugins: 'elementspath,wordcount',
		readOnly: true
	}


	$scope.submit = function() {
		// var val = {
		// 	title: $scope.application.title,
		// 	program_id: $scope.program.id,
		// 	users: [{
		// 		id: $scope.currentUser.id,
		// 		roles: ['applicant']
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