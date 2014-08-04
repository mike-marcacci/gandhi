angular.module('flow', []).controller('controller', function($scope){

	var flow = {
		"2e360108d95f3cda2e7467d3": {
			class: 'active',
			title: "Application",
			visible: true,
			next: [
				"9dcd650c0544dd3dc82fd87a"
			]
		},
		"9dcd650c0544dd3dc82fd87a": {
			title: "Contact Reviewers",
			visible: false,
			next: [
				"e882df32df91f89f9a8324dc",
			]
		},
		"e882df32df91f89f9a8324dc": {
			title: "Approval",
			visible: true,
			next: [
				"01c4ce41a83eab1aa8e37508",
				"2cb9719ab7b2ccecf228e90b"
			]
		},
		"01c4ce41a83eab1aa8e37508": {
			title: "External Review",
			visible: true,
			next: [
				"7a8b9b622827dced9060dd67"
			]
		},
		"2cb9719ab7b2ccecf228e90b": {
			title: "Rejected",
			visible: true,
			next: []
		},
		"7a8b9b622827dced9060dd67": {
			title: "Board Review",
			visible: true,
			next: [
				"ebcf121a5107f9e0be547d5d",
				"ddf1573d5943978fc47c2e86",
				"73d6a11b3c13e868bb9fb284"
			]
		},
		"73d6a11b3c13e868bb9fb284": {
			title: "Rejected",
			visible: true,
			next: []
		},
		"ebcf121a5107f9e0be547d5d": {
			title: "Funds Awarded",
			visible: true,
			next: [
				"aac2d5537a8e52a0d811cab2"
			]
		},
		"ddf1573d5943978fc47c2e86": {
			title: "Review & Resubmit",
			visible: true,
			next: [
				"9366681c7e013ab4c205ba95"
			]
		},
		"9366681c7e013ab4c205ba95": {
			title: "Set Board Meeting",
			visible: false,
			next: [
				"c3920332b5814bc317656fd4"
			]
		},
		"c3920332b5814bc317656fd4": {
			title: "Board Re-Review",
			visible: true,
			next: [
				"ebcf121a5107f9e0be547d5d",
				"a6118a4991705414ce20ec0e"
			]
		},
		"a6118a4991705414ce20ec0e": {
			title: "Rejected",
			visible: true,
			next: []
		},
		"aac2d5537a8e52a0d811cab2": {
			title: "Progress Reports",
			visible: true,
			next: [
				"92db6fbaa744c0270cf01b1f"
			]
		},
		"92db6fbaa744c0270cf01b1f": {
			title: "Final Report",
			visible: true,
			next: []
		}
	};

//----------------------------------------

	var index = {};

	$scope.options = {
		hide: true,
		node: {
			width: 180,
			height: 30,
			radius: 6,
			fill: '#428bca',
			color: '#fff',
			margin: {
				x: 20,
				y: 10
			}
		},
		link: {
			stroke: 'rgb(196, 196, 196)',
			strokeWidth: 2
		}
	}

	$scope.nodes = [];
	$scope.links = [];

	$scope.width = 0;
	$scope.height = 0;

	// find the distances of all upstream path
	function upstream(node){
		if(node.upstream)
			return node.upstream;

		// if this is a head node
		if(node.previous.length == 0)
			return node.upstream = [0];

		node.upstream = [];
		node.previous.forEach(function(previous){
			upstream(previous).forEach(function(distance){
				node.upstream.push(distance+1);
			})
		});
		return node.upstream;
	};

	// find the distances of all downstream path
	function downstream(node){
		if(node.downstream)
			return node.downstream;

		// if this is a tail node
		if(node.next.length == 0)
			return node.downstream = [0];

		node.downstream = [];
		node.next.forEach(function(next){
			downstream(next).forEach(function(distance){
				if(node.downstream.indexOf(distance) == -1)
					node.downstream.push(distance+1);
			})
		});
		return node.downstream;
	};

	function calculateScore(node){
		node.score = node.upstream.reduce(function(a,b){return a+b;})+node.downstream.reduce(function(a,b){return a+b;});
		node.scoreUp = node.upstream.reduce(function(a,b){return a+b;});
		node.scoreDown = node.downstream.reduce(function(a,b){return a+b;});
	};

	function calculateX(node){
		node.x = (Math.max.apply(Math, node.upstream) + .5) * ($scope.options.node.width + $scope.options.node.margin.x * 2);

		// calculate canvas width
		$scope.width = Math.max($scope.width, node.x);
	}

	function calculateY(node, level, n){
		if(node.level != null)
			return;

		node.level = level;
		node.y = -level * ($scope.options.node.height + $scope.options.node.margin.y * 2);

		node.next.sort(function(a,b){
			// put tail nodes on top
			if(a.scoreDown == 0)
				return 1;
			if(b.scoreDown == 0)
				return -1;

			// upstream sort
			return a.scoreUp < b.scoreUp ? 1 : -1;
		}).forEach(function(next, index){
			calculateY(next, level+index, node)
		});

		node.previous.sort(function(a,b){
			// put head nodes on top
			if(a.scoreUp == 0)
				return 1;
			if(b.scoreUp == 0)
				return -1;

			// downstream sort
			return a.scoreDown < b.scoreDown ? 1 : -1;
		}).forEach(function(previous, index){
			calculateY(previous, level+index, node)
		});

		// calculate canvas height
		$scope.height = Math.max($scope.height, -node.y);
	};


	// map nodes to index
	for(key in flow){
		index[key] = {
			id: key,
			title: flow[key].title || '',
			class: flow[key].class || '',
			visible: !!flow[key].visible,
			next: flow[key].next || [],
			previous: []
		};
	};

	// reverse-relate nodes
	for(key in index){
		var node = index[key];
		node.next.forEach(function(id, i, list){
			// build the relationships
			var next = list[i] = index[id];
			if(next.previous)
				next.previous.push(node);
			else
				next.previous = [node]
		});

		// add node to nodes array
		$scope.nodes.push(node);
	};

	// remove hidden nodes
	if($scope.options.hide){
		for(key in index){
			var node = index[key];

			if(!node.visible){
				node.next.forEach(function(next){
					// remove self from next nodes
					next.previous.splice(next.previous.indexOf(node), 1);

					// add next nodes to previous nodes
					node.previous.forEach(function(previous){
						if(previous.next.indexOf(next) == -1){
							previous.next.push(next)
						}
					})
				});

				node.previous.forEach(function(previous){
					// remove self from previous nodes
					previous.next.splice(previous.next.indexOf(node), 1);

					// add previous nodes to next nodes
					node.next.forEach(function(next){
						if(next.previous.indexOf(previous) == -1)
							next.previous.push(previous)
					})
				});

				// remove self from the array
				$scope.nodes.splice($scope.nodes.indexOf(node), 1);

			}
		};
	}

	// calculate distances
	for(i in $scope.nodes){
		var node = $scope.nodes[i];
		upstream(node);
		downstream(node);
		calculateX(node); // calculate x
		calculateScore(node); // calculate score from total upstream and downstream
	};

	// sort by score
	$scope.nodes.sort(function(a,b){
		return a.score < b.score ? 1 : -1;
	});

	// assign y values, beginning with the lowest score
	calculateY($scope.nodes[0], 0);

	// build links
	for(i in $scope.nodes){
		var node = $scope.nodes[i];
		node.next.forEach(function(next){
			var l = {
				source: {
					x: node.x + $scope.options.node.width,
					y: node.y + $scope.options.node.height / 2
				},
				target: {
					x: next.x,
					y: next.y + $scope.options.node.height / 2
				}
			}

			var offset = Math.min(Math.abs(l.target.y - l.source.y), $scope.options.node.margin.x) * ((l.target.y - l.source.y < 0) ? 1 : -1);

			// the x middle
			var c = (l.source.x + l.target.x) / 2;

			// bezier points and handles
			l.q1 = [ [c, l.source.y], [c, l.source.y - offset] ];
			l.q2 = [ [c, l.target.y + 2 * offset], [c, l.target.y + offset] ];

			$scope.links.push(l);
		})
	}

	// pad the canvas
	$scope.width += $scope.options.node.width;
	$scope.height += $scope.options.node.height;

});
