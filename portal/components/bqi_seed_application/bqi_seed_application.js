angular.module('portal')

.controller('Components.BqiSeedApplication', function($scope, $state, Restangular) {
	$scope.application = {
		title: "",
		pi: {},
		ci: [
			{}
		],
		collaboration: {
			'new': false,
			activities: {
				"Chalk Talk": false,
				"Monthly Reception": false,
				"Big Questions Dinner": false
			},
			other: {
				active: false,
				name: "Other"
			}
		},
		focuses: {
			Information: false,
			Complexity: false,
			Cognition: false
		},
		financial_contact: {},
		level: "Seed",
		amount: "",
		abstract: "",
		short_answer_1: "",
		short_answer_2: "",
		outputs_and_outcomes: ""
	};

	$scope.addCi = function(){
		$scope.application.ci.push({
			university: "University of Chicago"
		});
	};

	$scope.removeCi = function(index){
		$scope.application.ci.splice(index, 1)
	};

	$scope.submit = function() {

		// create the base project
		var val = {
			title: $scope.application.title,
			program_id: $scope.program.id,
			users: {},
			flow: {
				stages: {}
			}
		};

		// add stage data
		val.flow.stages[$scope.stage] = {
			data: $scope.application
		}

		// add user
		val.users[$scope.user.id] = {
			id: $scope.user.id,
			roles: ['owner']
		};

		// set the active stage to the next stage
		val.flow.active = $scope.program.flow.default[1];

		// save
		$scope.projects.post(val).then(function(res){

			// update the local projects record
			$scope.projects.push(res);

			// redirect to the next stage
			$state.go('portal.projects.stage', {project: res.id, stage: res.flow.active})
		}, function(err){
			alert('Sorry, but there was an error submitting this application. Pleast contact us.');
		})

	};
});