
module.exports = function(){

// TODO: get cycles

  // migrate flows
  _.each(cycle.flow, function(s){
    delete s.lock;
    var v = s.visible;
    s.visible = {};
    _.each(v, function(r, v){
      s.visible[r] = true;
    });
  });

  // migrate roles
  _.each(cycle.roles, function(s){
    var v = s.visible;
    s.visible = {};
    _.each(v, function(r, v){
      s.visible[r] = true;
    });

    var v = s.assignable;
    s.assignable = {};
    _.each(v, function(r, v){
      s.assignable[r] = true;
    });
  });

// TODO: update the cycles

}