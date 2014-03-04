if (Meteor.isClient) {
  Template.flow.rendered = function(){

    var self = this;

    if (self.drawer)
      return;

    var options = {
      mode: 'private',
      nodeWidth: 140,
      nodeHeight: 36,
      nodeMarginX: 20,
      nodeMarginY: 10,
      nodeRadius: 5,
      circleRaduis: 6
    }

    function processData(flow){

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

      return {
        nodes: nodes,
        links: links
      }
    }











    var baseSvg = d3.select('#flow').append("svg")
    var linkGroup = baseSvg.append("g")
    var nodeGroup = baseSvg.append("g")


    self.drawer = Meteor.autorun(function() {

      flow = Session.get('flow');
      var data = processData(flow);
      var nodes = data.nodes;
      var links = data.links;


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
        })[0].y + (options.nodeHeight + options.nodeMarginY * 2);
      }


      baseSvg.attr("width", getWidth()).attr("height", getHeight());
      linkGroup.attr("transform", function(d){ return "translate(0, "+(getHeight()-.5*options.nodeHeight-options.nodeMarginY)+")"});
      nodeGroup.attr("transform", function(d){ return "translate(0, "+(getHeight()-.5*options.nodeHeight-options.nodeMarginY)+")"});


      var diagonal = d3.svg.diagonal().projection(function(d) { return [d.y , d.x]; });

      var link = linkGroup.selectAll(".link")
        .data(links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", diagonal);

      var node = nodeGroup.selectAll("g.node").data(nodes);

      var nodeEnter = node.enter().append("g")

      node.attr("class", function(d){
          return 'node' + (d.visible ? ' public' : ' private') + (d.active ? ' active' : '');
        })
        .attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        })

      nodeEnter.on('click', function(d, i){
        var flow = Session.get('flow');
        _.each(flow, function(v, k, l){
          v.active = false;
        });
        flow[d.id].active = true;
        Session.set('flow', flow);

        $('#node h1').text(d.title)
      })

      nodeEnter.append("rect")
        .attr("width", options.nodeWidth)
        .attr("height", options.nodeHeight)
        .attr("rx", options.nodeRadius)
        .attr("ry", options.nodeRadius)
        .attr("x", options.nodeWidth/-2)
        .attr("y", options.nodeHeight/-2)

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
      node.select("foreignObject.text")
        .attr("width", options.nodeWidth)
        .attr("height", options.nodeHeight)
        .attr("rx", options.nodeRadius)
        .attr("ry", options.nodeRadius)
        .attr("x", options.nodeWidth/-2)
        .attr("y", options.nodeHeight/-2)

      nodeEnter.append("circle")
        .attr("class", "target")
      node.select("circle.target")
        .attr("cx", options.nodeWidth/-2)
        .attr("cy", 0)
        .attr("r", options.circleRaduis)

      nodeEnter.append("circle")
        .attr("class", "source")
      node.select("circle.source")
        .attr("cx", options.nodeWidth/2)
        .attr("cy", 0)
        .attr("r", options.circleRaduis)
        .call(nodeConnector);


    });

  }
}