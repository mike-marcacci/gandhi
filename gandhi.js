if (Meteor.isClient) {
  var flow = {
    "2e360108d95f3cda2e7467d3": {
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
  }


  Template.hello.rendered = function(){

    var options = {
      mode: 'private',
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
      node.x = (Math.max.apply(Math, node.upstream) + .5) * (options.nodeWidth + options.nodeMarginX * 2);
    }

    function calculateScore(node){
      node.score = node.upstream.reduce(function(a,b){return a+b;})+node.downstream.reduce(function(a,b){return a+b;});
      node.scoreUp = node.upstream.reduce(function(a,b){return a+b;});
      node.scoreDown = node.downstream.reduce(function(a,b){return a+b;});
    };

    function calculateY(node, level, n){
      if(node.level != null)
        return;

      node.level = level;
      node.y = -level * (options.nodeHeight + options.nodeMarginY * 2);

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
    };

    var nodes = [];
    var links = [];

    // relate nodes
    for(key in flow){
      var node = flow[key];

      node.id = key;

      if(!node.previous)
        node.previous = [];

      node.next.forEach(function(id, i, list){
        // build the relationships
        var next = list[i] = flow[id];
        if(next.previous)
          next.previous.push(node);
        else
          next.previous = [node]
      });

      // add node to nodes array
      nodes.push(node);
    };

    if(options.mode == 'public'){
      for(key in flow){
        var node = flow[key];

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
          nodes.splice(nodes.indexOf(node), 1);

        }
      };
    }

    // calculate distances
    for(i in nodes){
      var node = nodes[i];
      upstream(node);
      downstream(node);
      calculateX(node); // calculate x
      calculateScore(node); // calculate score from total upstream and downstream
    };

    // sort by score
    nodes.sort(function(a,b){
      return a.score < b.score ? 1 : -1;
    });

    // assign y values, beginning with the lowest score
    calculateY(nodes[0], 0);

    // build links
    for(i in nodes){
      var node = nodes[i];
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


    function getWidth(){
      return nodes.sort(function(a,b){
        return a.x < b.x ? 1 : -1;
      })[0].x + .5 *(options.nodeWidth + options.nodeMarginX * 2);
    }


    function getHeight(){
      return - nodes.sort(function(a,b){
        return a.y > b.y ? 1 : -1;
      })[0].y + (options.nodeHeight + options.nodeMarginY);
    }


    var baseSvg = d3.select('.flow').append("svg")
    .attr("width", getWidth())
    .attr("height", getHeight());

    var linkGroup = baseSvg.append("g")
      .attr("transform", function(d){ return "translate(0, "+(getHeight()-.5*options.nodeHeight)+")"});

    var nodeGroup = baseSvg.append("g")
      .attr("transform", function(d){ return "translate(0, "+(getHeight()-.5*options.nodeHeight)+")"});


    var diagonal = d3.svg.diagonal().projection(function(d) { return [d.y , d.x]; });

    var link = linkGroup.selectAll(".link")
      .data(links)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", diagonal);

    var node = nodeGroup.selectAll("g.node").data(nodes);

    var nodeEnter = node.enter().append("g")
      .attr("class", function(d){
        return 'node ' + (d.visible ? 'public' : 'private');
      })
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

    nodeEnter.append("foreignObject")
      .attr("class", "text")
      .attr("width", options.nodeWidth)
      .attr("height", options.nodeHeight)
      .attr("rx", options.nodeRadius)
      .attr("ry", options.nodeRadius)
      .attr("x", options.nodeWidth/-2)
      .attr("y", options.nodeHeight/-2)
      .append("xhtml:body")
        .html(function(d) {
          return '<div>'+d.title+'</div>';
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
