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
      title: "Rejected (after Board 1)",
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
      title: "Rejected (after Board 2)",
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

    // relate nodes
    for(key in flow){
      var node = flow[key];

      if(!node.previous)
        node.previous = [];

      node.next.forEach(function(id, i, list){
        var next = list[i] = flow[id];
        if(next.previous)
          next.previous.push(node);
        else
          next.previous = [node]
      })
    };

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

    // find the distances of all upstream divergences
    function divergences(node){
      if(node.divergences)
        return node.divergences;

      // if this is a head node
      if(node.previous.length == 0)
        return node.divergences = [];

      node.divergences = [];
      node.previous.forEach(function(previous){
        divergences(previous).forEach(function(distance){
          if(node.divergences.indexOf(distance) == -1)
            node.divergences.push(distance+1);
        })
      });

      // if the flow diverges here
      if(node.next.length > 1)
        node.divergences.push(0)

      return node.divergences;
    };

    // find the distances of all downstream convergences
    function convergences(node){
      if(node.convergences)
        return node.convergences;

      // if this is a tail node
      if(node.next.length == 0)
        return node.convergences = [];

      node.convergences = [];
      node.next.forEach(function(next){
        convergences(next).forEach(function(distance){
          if(node.convergences.indexOf(distance) == -1)
            node.convergences.push(distance+1);
        })
      });

      // if the flow converges here
      if(node.previous.length > 1)
        node.convergences.push(0)

      return node.convergences;
    };

    function calculateX(node){
      node.x = Math.max.apply(Math, node.upstream);
    }


    function calculateScore(node){
      node.score = node.upstream.reduce(function(a,b){return a+b;})+node.downstream.reduce(function(a,b){return a+b;});
    };


    function calculateY(node, level){
      if(node.y != null)
        return;

      node.y = level;

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

    var flowArray = [];

    // calculate distances
    for(key in flow){
      var node = flow[key];
      upstream(node);
      downstream(node);
      // divergences(node);
      // convergences(node);

      // calculate x
      calculateX(node);

      // calculate score from total upstream and downstream
      calculateScore(node);

      // we need flow as an array for d3
      flowArray.push(node)
    };

    flowArray = flowArray.sort(function(a,b){
      return a.score < b.score ? 1 : -1;
    });


    calculateY(flowArray[0], 0);


    var baseSvg = d3.select('.flow').append("svg")
    .attr("width", 2000)
    .attr("height", 300)

    var svgGroup = baseSvg.append("g")
      .attr("transform", function(d){ return "translate(100, 200)"})

    var node = svgGroup.selectAll("g.node").data(flowArray);

    var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) {
        return "translate(" + (d.x * 200) + "," + (-d.y * 40) + ")";
      })

    nodeEnter.append("rect")
      .attr("width", 140)
      .attr("stroke", "#fff")
      .attr("stroke-width", "2")
      .attr("height", 24)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("x", -70)
      .attr("y",-12)
      .style("fill", "#81ade2");

    nodeEnter.append("circle")
      .attr("width", 140)
      .attr("stroke", "#fff")
      .attr("stroke-width", "2")
      .attr("cx", 70)
      .attr("cy", 0)
      .attr("r", 6)
      .style("fill", "#81ade2");

    nodeEnter.append("circle")
      .attr("width", 140)
      .attr("stroke", "#fff")
      .attr("stroke-width", "2")
      .attr("cx", -70)
      .attr("cy", 0)
      .attr("r", 6)
      .style("fill", "#81ade2");

    nodeEnter.append("text")
      .attr("dy", 5)
      .attr('text-anchor', 'middle')
      .text(function(d) {
        return d.title;
      })
      .style("fill-opacity", 1);

    nodeEnter.append("path")
      .attr("d", "M70 0 C 70 0, 95 0, 100 -20 S 110 -40, 130 -40")
      .attr("stroke", "#2A557C")
      .attr("stroke-width", "2")
      .attr("fill", "transparent")




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
