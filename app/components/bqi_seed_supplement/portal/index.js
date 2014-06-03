angular.module('gandhi')

.controller('Components.BqiSeedSupplement', function($scope, $state, Restangular, $upload) {

	$scope.disabled = ($scope.role != 'applicant');

	$scope.data = $scope.project.flow.stages[$scope.stage] && $scope.project.flow.stages[$scope.stage].data ? angular.copy($scope.project.flow.stages[$scope.stage].data) : {
		biosketches: [],
		team_publications: [{}, {}, {}, {}, {}],
		area_publications: [{}, {}, {}, {}, {}],
		budget: [{}],
		budget_narrative: [{}]
	};

	// add CI biosketches that don't already exist
	if($scope.project.flow.stages.application) {
		$scope.project.flow.stages.application.data.ci.forEach(function(ci){
			if($scope.data.biosketches.every(function(sketch){
				if(sketch.name == ci.name)
					return false;
				return true;
			}))
				$scope.data.biosketches.push({
					name: ci.name
				})
		});

		// add PI biosketch if it doesn't already exist
		if($scope.data.biosketches.every(function(sketch){
			if(sketch.name == $scope.project.flow.stages.application.data.pi.name)
				return false;
			return true;
		}))
			$scope.data.biosketches.unshift({
				name: $scope.project.flow.stages.application.data.pi.name
			})

		var slices = []
		// remove biosketches that don't appear in the CI data
		$scope.data.biosketches.forEach(function(sketch, i){
			if(sketch.name != $scope.project.flow.stages.application.data.pi.name && $scope.project.flow.stages.application.data.ci.every(function(ci){
				if(sketch.name == ci.name)
					return false;
				return true;
			}))
				slices.unshift(i);
		});

		slices.forEach(function(i){
			$scope.data.biosketches.splice(i, 1);
		})

	}

	$scope.removeFile = function(field, index){
		delete $scope.data[field][index].path;
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
				// console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
			})
			.success(function(data, status, headers, config) {
				// file is uploaded successfully
				// console.log(data);
				$scope.data[field][index].path = data.file.path;
				$scope.data[field][index].filename = data.file.filename;
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


		// if($scope.data.biosketches.some(missingFile) || $scope.data.team_publications.some(missingFile) || $scope.data.budget.some(missingFile) || $scope.data.budget_narrative.some(missingFile))
		// 	return alert('Some files are missing. Please upload each file before submitting');



		///////////////////
		// Saving
		///////////////////

		// create the base
		var val = {flow: {stages: {}}};

		// add the stage data
		val.flow.stages[$scope.stage] = {
			status: 'submitted',
			data: $scope.data
		}

		// set the active stage to the next stage
		val.flow.active = $scope.cycle.flow.default[$scope.cycle.flow.default.indexOf($scope.stage) + 1];

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