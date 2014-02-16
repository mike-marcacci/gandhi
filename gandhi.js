if (Meteor.isClient) {
  var flow = {
    "2e360108d95f3cda2e7467d3": {
      title: "Application",
      next: [
        "e882df32df91f89f9a8324dc"
      ]
    },
    "e882df32df91f89f9a8324dc": {
      title: "Approval",
      next: [
        "01c4ce41a83eab1aa8e37508",
        "2cb9719ab7b2ccecf228e90b"
      ]
    },
    "01c4ce41a83eab1aa8e37508": {
      title: "External Review",
      next: [
        "7a8b9b622827dced9060dd67"
      ]
    },
    "2cb9719ab7b2ccecf228e90b": {
      title: "Rejected",
      next: []
    },
    "7a8b9b622827dced9060dd67": {
      title: "Board Review",
      next: [
        "ebcf121a5107f9e0be547d5d",
        "ddf1573d5943978fc47c2e86",
        "73d6a11b3c13e868bb9fb284"
      ]
    },
    "73d6a11b3c13e868bb9fb284": {
      title: "Rejected",
      next: []
    },
    "ebcf121a5107f9e0be547d5d": {
      title: "Funds Awarded",
      next: [
        "aac2d5537a8e52a0d811cab2"
      ]
    },
    "ddf1573d5943978fc47c2e86": {
      title: "Review & Resubmit",
      next: [
        "c3920332b5814bc317656fd4"
      ]
    },
    "c3920332b5814bc317656fd4": {
      title: "Board Re-Review",
      next: [
        "ebcf121a5107f9e0be547d5d",
        "a6118a4991705414ce20ec0e"
      ]
    },
    "a6118a4991705414ce20ec0e": {
      title: "Rejected",
      next: []
    },
    "aac2d5537a8e52a0d811cab2": {
      title: "Progress Reports",
      next: [
        "92db6fbaa744c0270cf01b1f"
      ]
    },
    "92db6fbaa744c0270cf01b1f": {
      title: "Final Report",
      next: []
    }
  }


  Template.hello.rendered = function(){

    var options = {
      nodeWidth: 140,
      nodeHeight: 36,
      nodeMarginX: 20,
      nodeMarginY: 10,
      nodeRadius: 5,
      circleRaduis: 6
    }

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
          if(node.upstream.indexOf(distance) == -1)
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

    function calculateX(node){
      node.x = Math.max.apply(Math, node.upstream) * (options.nodeWidth + options.nodeMarginX * 2);
    }

    function calculateScore(node){
      node.score = node.upstream.reduce(function(a,b){return a+b;})+node.downstream.reduce(function(a,b){return a+b;});
    };

    function calculateY(node, level){
      if(node.level != null)
        return;

      node.level = level;
      node.y = -level * (options.nodeHeight + options.nodeMarginY * 2);

      node.next.sort(function(a,b){
        return a.score < b.score ? 1 : -1;
      }).forEach(function(next, index){
        calculateY(next, level+index)
      });

      node.previous.sort(function(a,b){
        return a.score < b.score ? 1 : -1;
      }).forEach(function(previous, index){
        calculateY(previous, level+index)
      });
    };

    var nodes = [];
    var links = [];

    // relate nodes
    for(key in flow){
      var node = flow[key];

      if(!node.previous)
        node.previous = [];

      node.next.forEach(function(id, i, list){
        // build the relationships
        var next = list[i] = flow[id];
        if(next.previous)
          next.previous.push(node);
        else
          next.previous = [node]
      })
    };

    // calculate distances
    for(key in flow){
      var node = flow[key];
      upstream(node);
      downstream(node);

      // calculate x
      calculateX(node);

      // calculate score from total upstream and downstream
      calculateScore(node);

      // add node to nodes array
      nodes.push(node);
    };

    // sort by score
    nodes.sort(function(a,b){
      return a.score < b.score ? 1 : -1;
    });

    // assign y values, beginning with the lowest score
    calculateY(nodes[0], 0);

    // build links
    for(key in flow){
      var node = flow[key];
      node.next.forEach(function(next){
        links.push({
          // we need to swap "x" and "y" so d3's `diagonal` works horizontally
          source: {
            y: node.x + options.nodeWidth/2,
            x: node.y
          },
          target: {
            y: next.x - options.nodeWidth/2,
            x: next.y
          }
        });
      })
    }


    // ALL THE DRAWING HAPPENS HERE

    var nodeConnector = d3.behavior.drag()
      // .origin(Object)
      .on("dragstart", function(d){
        d3.select(this)
      }).on("drag", function(d){
        d3.select(this)
          .attr("cx", d3.event.x)
          .attr("cy", d3.event.y);
      });




    var baseSvg = d3.select('.flow').append("svg")
    .attr("width", 2000)
    .attr("height", 300);

    var linkGroup = baseSvg.append("g")
      .attr("transform", function(d){ return "translate(100, 200)"});

    var nodeGroup = baseSvg.append("g")
      .attr("transform", function(d){ return "translate(100, 200)"});


    var diagonal = d3.svg.diagonal().projection(function(d) { return [d.y , d.x]; });

    var link = linkGroup.selectAll(".link")
      .data(links)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", diagonal);

    var node = nodeGroup.selectAll("g.node").data(nodes);

    var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      })
      .on('click', function(d, i){
        console.log(d.title)
      })

    nodeEnter.append("rect")
      .attr("width", options.nodeWidth)
      .attr("height", options.nodeHeight)
      .attr("rx", options.nodeRadius)
      .attr("ry", options.nodeRadius)
      .attr("x", options.nodeWidth/-2)
      .attr("y", options.nodeHeight/-2)

    nodeEnter.append("circle")
      .attr("class", "target")
      .attr("cx", options.nodeWidth/-2)
      .attr("cy", 0)
      .attr("r", options.circleRaduis)

    nodeEnter.append("circle")
      .attr("class", "source")
      .attr("cx", options.nodeWidth/2)
      .attr("cy", 0)
      .attr("r", options.circleRaduis)
      .call(nodeConnector);

    nodeEnter.append("text")
      .attr("dy", 5)
      .attr('text-anchor', 'middle')
      .text(function(d) {
        return d.title;
      })



    // distances of paths upstream
    // distances of paths downstream
    // distances of paths to upstream divergences
    // distances of paths to downstream divergences


    // build actual relationships from ID's
    // calculate x for each node
      // longest path upstream = x

    // calculate y for each node
      // for each value x:
        // sort by distance to 

    var baseSvg = d3.select("#tree-container").append("svg")

  }


}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
