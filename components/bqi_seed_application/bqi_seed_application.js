angular.module('portal')

.controller('Components.BqiSeedApplication', function($scope, Restangular) {
	$scope.application = {
		title: "",
		pi: {
			university: "University of Chicago"
		},
		ci: [
			{
				university: "University of Chicago"
			}
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
	}

	$scope.removeCi = function(index){
		$scope.application.ci.splice(index, 1)
	}

	$scope.submit = function() {
		var val = {
			title: $scope.application.title,
			program_id: $scope.program.id,
			users: [{
				id: $scope.user.id,
				roles: ['owner']
			}],
			flow: {
				stages: {}
			}
		};

		val.flow.stages[$scope.stage] = {
			data: $scope.application
		}

		Restangular.one('users', $scope.userId).all('projects').post(val)
			.then(function(res){
				console.log(res);
			})

		// $http.post('/api/projects', val)
	};
});