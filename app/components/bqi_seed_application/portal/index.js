angular.module('gandhi')

.controller('Components.BqiSeedApplication', function($scope, $state, Restangular) {

	function limit(limit){
		return {
			wordcount: {
				showWordCount: true,
				showCharCount: true,
				wordLimit: limit
			}
		}
	};

	$scope.limit_300 = limit(300);
	$scope.limit_200 = limit(200);
	$scope.limit_150 = limit(150);

	console.log($scope.project.flow.stages[$scope.stage])

	$scope.data = $scope.project.flow.stages[$scope.stage] && $scope.project.flow.stages[$scope.stage].data ? angular.copy($scope.project.flow.stages[$scope.stage].data) : {
		title: "",
		pi: {},
		ci: [
			{}
		],
		collaboration: {
			'new': false,
			activities: [
				{name: "Chalk Talk", value: false},
				{name: "Monthly Reception", value: false},
				{name: "Big Questions Dinner", value: false}
			],
			other: {
				active: false,
				name: "Other"
			}
		},
		focuses: [
			{name:'Information', value: false},
			{name:'Complexity', value: false},
			{name:'Cognition', value: false}
		],
		financial_contact: {},
		level: "Seed",
		amount: "",
		abstract: "",
		short_answer_1: "",
		short_answer_2: "",
		outputs_and_outcomes: ""
	};

	$scope.addCi = function(){
		$scope.data.ci.push({
			university: "University of Chicago"
		});
	};

	$scope.removeCi = function(index){
		$scope.data.ci.splice(index, 1)
	};

	$scope.submit = function() {

		// create the base project
		var project = {flow: {stages: {}}};

		// add stage data
		project.flow.stages[$scope.stage] = {
			status: 'submitted',
			data: $scope.data
		}

		// activate the next stage
		project.flow.active = $scope.program.flow.default[$scope.program.flow.default.indexOf($scope.stage) + 1];

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