angular.module('gandhi')

.controller('Components.BqiSeedSupplement', function($scope, $state, Restangular, $upload) {

	$scope.supplement = {
		biosketches: [
			{
				name: $scope.project.flow.stages.application.data.pi.name
			}
		],
		team_publications: [{}, {}, {}, {}, {}],
		area_publications: [{}, {}, {}, {}, {}],
		budget: [{}],
		budget_narrative: [{}]
	};

	// add CI biosketches
	$scope.project.flow.stages.application.data.ci.forEach(function(ci){
		$scope.supplement.biosketches.push({
			name: ci.name
		})
	});

	$scope.removeFile = function(field, index){
		delete $scope.supplement[field][index].path;
	}

	$scope.onFileSelect = function($files, field, index) {

		for (var i = 0; i < $files.length; i++) {
			var file = $files[i];
			$scope.upload = $upload.upload({
				url: '../api/users/'+$scope.currentUser.id+'/files', //upload.php script, node.js route, or servlet url
				data: {},
				file: file,
			})
			.progress(function(evt) {
				console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
			})
			.success(function(data, status, headers, config) {
				// file is uploaded successfully
				console.log(data);
				$scope.supplement[field][index].path = data.file.path;
				$scope.supplement[field][index].filename = data.file.filename;
			})
			.error(function(err){
				alert('Sorry, but there was an error uploading your file.');
			})
		}

	};


	$scope.submit = function() {

		///////////////////
		// Validation
		///////////////////

		function missingFile(file){
			return !file.path || !file.filename;
		};


		if($scope.supplement.biosketches.some(missingFile) || $scope.supplement.team_publications.some(missingFile) || $scope.supplement.budget.some(missingFile) || $scope.supplement.budget_narrative.some(missingFile))
			return alert('Some files are missing. Please upload each file before submitting');



		///////////////////
		// Saving
		///////////////////

		// create the base
		var val = {flow: {stages: {}}};

		// add the stage data
		val.flow.stages[$scope.stage] = {
			data: $scope.supplement
		}

		// set the active stage to the next stage
		val.flow.active = $scope.program.flow.default[$scope.program.flow.default.indexOf($scope.stage) + 1];

		// save
		$scope.project.patch(val).then(function(res){

			// update the local project record
			angular.extend($scope.project, res);

			// redirect to the next stage
			$state.go('portal.projects.stage', {project: res.id, stage: res.flow.active})
		}, function(err){
			alert('Sorry, but there was an error submitting this application. Pleast contact us.');
		})

	};
	
});