
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

  // migrate permissions
  _.each(cycle.flow, function(flow){
    var p = flow.component.options.permissions; if(!p) return;
      delete flow.component.options.permissions;
      flow.component.permissions = {};
    _.each(p, function(arr, name){
      var o = {}; _.each(arr, function(n){o[n] = true;});
      flow.component.permissions[name] = o;
    })
  });

// TODO: update the cycles

}