Nox.BindingSet = function(el, parentBindingSet){
  this.bindings = [];
  this.bindingSets = [];
  this.el = el;
  this.parentBindingSet = parentBindingSet || null;
};

Nox.BindingSet.prototype.rootBindingSet = function(){
  return (this.parentBindingSet == null) ? this : this.parentBindingSet.rootBindingSet();
};

Nox.BindingSet.prototype.nested = function(el){
  var bindingSet = new Nox.BindingSet(el, this);
  this.bindingSets.push(bindingSet);

  return bindingSet;
};

Nox.BindingSet.prototype.findByEl = function(el){
  if(this.el === el)
    return this;

  for(var i=0; i < this.bindingSets.length; i++){
    var res = this.bindingSets[i].findByEl(el);
    if(res)
      return res;
  }

  return null;
};

Nox.BindingSet.prototype.hasBindings = function(){
  return this.numBindings() > 0;
};

Nox.BindingSet.prototype.hasBindingsDeep = function(){
  return this.numBindingsDeep() > 0;
};

Nox.BindingSet.prototype.numBindings = function(){
  return this.bindings.length;
};

Nox.BindingSet.prototype.numBindingsDeep = function(){
  var num = this.bindings.length;

  for(var i=0; i < this.bindingSets.length; i++){
    num += this.bindingSets[i].numBindingsDeep();
  }

  return num;
};

Nox.BindingSet.prototype.numBindingSets = function(){
  return this.bindingSets.length;
};

Nox.BindingSet.prototype.addBinding = function(binding){
  this.bindings.push(binding);
};

Nox.BindingSet.prototype.removeBinding = function(binding){
  this.bindings = _.without(this.bindings, binding);
};

Nox.BindingSet.prototype.removeBindingSet = function(bindingSet){
  this.bindingSets = _.without(this.bindingSets, bindingSet);
};

Nox.BindingSet.prototype.updateFun = function(){
  _.invoke(this.bindings, "updateFun");
  _.invoke(this.bindingSets, "updateFun");
  return this;
};

Nox.BindingSet.prototype.releaseFun = function(){  
  this.parentBindingSet.removeBindingSet(this);

  if(this.bindings == null || this.bindingSets == null)
    throw "has already been released";

  _.invoke(this.bindings, "releaseFun");
  _.invoke(this.bindingSets, "releaseFun");

  $(this.el).remove();

  this.el = null;
  this.parentBindingSet = null;
  this.bindings = null;
  this.bindingSets = null;
};

Nox.rootBindingSet = new Nox.BindingSet(null, null);
