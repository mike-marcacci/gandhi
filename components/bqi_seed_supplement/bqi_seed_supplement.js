angular.module('portal')

.controller('Components.BqiSeedSupplement', function($scope, $state, Restangular, $upload) {

	$scope.supplement = {
		team: [{}, {}, {}, {}, {}],
		area: [{}, {}, {}, {}, {}],
		budget: [{}],
		budget_narrative: ""
	};

	$scope.removeFile = function(field, index){
		delete $scope.supplement[field][index].path;
	}

	$scope.onFileSelect = function($files, field, index) {

	  //$files: an array of files selected, each file has name, size, and type.
	  for (var i = 0; i < $files.length; i++) {
	    var file = $files[i];
	    $scope.upload = $upload.upload({
	      url: 'http://localhost:3000/api/users/'+$scope.user.id+'/files', //upload.php script, node.js route, or servlet url
	      // method: POST or PUT,
	      // headers: {'header-key': 'header-value'},
	      // withCredentials: true,
	      data: {},
	      file: file, // or list of files: $files for html5 only
	      /* set the file formData name ('Content-Desposition'). Default is 'file' */
	      //fileFormDataName: myFile, //or a list of names for multiple files (html5).
	      /* customize how data is added to formData. See #40#issuecomment-28612000 for sample code */
	      //formDataAppender: function(formData, key, val){}
	    }).progress(function(evt) {
	      console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
	    }).success(function(data, status, headers, config) {
	      // file is uploaded successfully
	      console.log(data);
	      $scope.supplement[field][index] = {path: data.file.path};
	    });
	    //.error(...)
	    //.then(success, error, progress); 
	    //.xhr(function(xhr){xhr.upload.addEventListener(...)})// access and attach any event listener to XMLHttpRequest.
	  }
	  /* alternative way of uploading, send the file binary with the file's content-type.
	     Could be used to upload files to CouchDB, imgur, etc... html5 FileReader is needed. 
	     It could also be used to monitor the progress of a normal http post/put request with large data*/
	  // $scope.upload = $upload.http({...})  see 88#issuecomment-31366487 for sample code.
	};


	$scope.submit = function() {
		var val = {supplement: $scope.supplement};

		console.log(val)
		alert('ok');
		return;

		$http.post('http://bigquestions.uchicago.edu:3000/api/project/'+getParameterByName('id'), val)
		  .success(function(data, status, headers, config) {
		    // this callback will be called asynchronously
		    // when the response is available
		    window.location = '/portal/done?id='+getParameterByName('id')
		  })
		  .error(function(data, status, headers, config) {
		    // called asynchronously if an error occurs
		    // or server returns response with an error status.
		    alert('There was an error submitting the form. Please contact us.');
		  });

	};
	
});