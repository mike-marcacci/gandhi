angular.module('portal')

.controller('Components.BqiSeedSupplement', function($scope, $state, Restangular, $upload) {

	$scope.supplement = {
		// team_publications: [{}, {}, {}, {}, {}],
		// area_publications: [{}, {}, {}, {}, {}],
		team_publications: [{}],
		area_publications: [{}],
		budget: [{}],
		budget_narrative: ""
	};

	$scope.removeFile = function(field, index){
		delete $scope.supplement[field][index].path;
	}

	$scope.onFileSelect = function($files, field, index) {

		for (var i = 0; i < $files.length; i++) {
			var file = $files[i];
			$scope.upload = $upload.upload({
				url: 'http://localhost:3000/api/users/'+$scope.user.id+'/files', //upload.php script, node.js route, or servlet url
				data: {},
				file: file,
			})
			.progress(function(evt) {
				console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
			})
			.success(function(data, status, headers, config) {
				// file is uploaded successfully
				console.log(data);
				$scope.supplement[field][index] = data.file;
			})
			// .error(function(err){
			// 	alert('Sorry, but there was an error uploading your file.');
			// })
		}

	};


	$scope.submit = function() {

		///////////////////
		// Validation
		///////////////////

		function missingFile(file){
			return !file.path || !file.filename;
		};


		if($scope.supplement.team_publications.some(missingFile) || $scope.supplement.area_publications.some(missingFile) || $scope.supplement.budget.some(missingFile))
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
			$scope.project = res;

			// redirect to the next stage
			$state.go('portal.projects.stage', {project: res.id, stage: res.flow.active})
		}, function(err){
			alert('Sorry, but there was an error submitting this application. Pleast contact us.');
		})

		// $http.post('http://bigquestions.uchicago.edu:3000/api/project/'+getParameterByName('id'), val)
		// 	.success(function(data, status, headers, config) {
		// 		// this callback will be called asynchronously
		// 		// when the response is available
		// 		window.location = '/portal/done?id='+getParameterByName('id')
		// 	})
		// 	.error(function(data, status, headers, config) {
		// 		// called asynchronously if an error occurs
		// 		// or server returns response with an error status.
		// 		alert('There was an error submitting the form. Please contact us.');
		// 	});

	};
	
});