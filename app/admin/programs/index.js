angular.module('gandhi')

.config(function($stateProvider, RestangularProvider) {

	$stateProvider
		.state('admin.programs', {
			url: "/programs",
			templateUrl: "admin/programs/index.html",
			controller: function($scope, Restangular){
				$scope.programs = Restangular.all('programs').getList().$object;
			}
		})

		.state('admin.programs.program', {
			url: "/:program",
			abstract: true,
			controller: function($scope, Restangular, $stateParams){
				$scope.$watchCollection('programs', function(newValue, oldValue){
					$scope.programs.some(function(program){
						if(program.id != $stateParams.program)
							return false;

						return $scope.program = program;
					});

					if($scope.program)
						$scope.projects = Restangular.all('projects').getList({program_id: $scope.program.id}).$object;
				});

			},
			template: '<div ui-view></div>'
		})

		.state('admin.programs.program.show', {
			url: "/show",
			controller: function($scope, Restangular, $stateParams){

			},
			template: 'Show'
		})

});