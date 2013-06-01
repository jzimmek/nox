var Nox = {};

Nox.parseAttributeNames = function(el){
  var html = $("<div/>").append($(el).clone().empty()).html(),
      res = html.match(/\s+([-a-z0-9]+)\s*=/ig);

  if(res){
    for(var i=0; i < res.length; i++){
      res[i] = res[i].replace(/\s|=/g, "");
    }
  }

  return res || [];
};

Nox.read = function(expr, context, vars){
  var fun = Nox.read.cache[expr];

  if(!fun)
    Nox.read.cache[expr] = (fun = new Function(_.keys(vars), "return " + expr));

  return fun.apply(context, _.values(vars));
};
Nox.read.cache = {};

Nox.write = function(expr, context, vars, value){
  expr = "(" + expr + ") = (value);";
  return new Function(_.keys(vars).concat(["value"]), "return " + expr).apply(context, _.values(vars).concat([value]));
};

Nox.Node = function(parent){
  this.parent = parent;

  this.bindings = [];

  this.children = [];
  this.states = [];
  this.includesContainerBinding = false;
};

Nox.Node.prototype.addBinding = function(binding){
  this.includesContainerBinding = this.includesContainerBinding || binding.container;
  this.bindings.push(binding);
};

Nox.Node.prototype.destroyState = function(state){
  state.set(null);
  this.states = _.without(this.states, state);
};

Nox.Node.prototype.createState = function(){
  var value = undefined;

  var state = {
    set: function(newValue){
      value = newValue;
    },
    get: function(){
      return value;
    }
  };

  this.states.push(state);

  return state;
};

Nox.Node.prototype.root = function(){
  return this.parent ? this.parent.root() : this;
};

Nox.Node.createMutator = function(binding){
  return function(expr, context, vars, newValue){
    if(binding.state.get() !== newValue){
      binding.state.set(newValue);
      Nox.write(expr, context, vars, newValue);
      binding.noxNode.root().update();
    }
  };
};

Nox.Node.prototype.init = function(){
  var root = this.root();

  _.each(this.bindings, function(binding){

    if(!binding.init)
      return;

    binding.init(Nox.Node.createMutator(binding));
  });

  return this.initChildren();
};

Nox.Node.prototype.initChildren = function(){
  _.invoke(this.children, "init");
  return this;
};

Nox.Node.prototype.update = function(){
  _.each(this.bindings, function(binding){

    if(!binding.update)
      return;

    var exprValue = binding.evalExprValue(),
        exprState = binding.evalState(exprValue),
        state = binding.state;

    if(!_.isEqual(state.get(), exprState)){
      state.set(exprState);
      binding.update(exprValue);
    }

  });

  return this.updateChildren();
};

Nox.Node.prototype.release = function(){
  this.releaseBindings();
  this.releaseChildren();

  return this;
};

Nox.Node.prototype.releaseBindings = function(){
  _.invoke(this.bindings, "release");
  this.bindings = [];

  return this;
};

Nox.Node.prototype.releaseChildren = function(){
  _.invoke(this.children, "release");
  this.children = [];

  return this;
};

Nox.Node.prototype.updateChildren = function(){
  _.invoke(this.children, "update");
  return this;
};

Nox.Node.prototype.createChildNode = function(el){
  var child = new Nox.Node(this);
  this.children.push(child);

  return child;
};

Nox.bindingDefaults = function(binding, noxNode, bindingExpr, context, vars){
  binding.state = noxNode.createState();
  binding.noxNode = noxNode;

  if(binding.container === undefined)       binding.container = false;
  if(binding.evalState === undefined)       binding.evalState = (function(exprValue){ return exprValue; });
  if(binding.evalExprValue === undefined)   binding.evalExprValue = (function(){ return Nox.read(bindingExpr, context, vars); });
  if(binding.release === undefined)         binding.release = (function(){});

  return binding;
};

Nox.findDataBindings = function(attributeNames){
  return _(attributeNames).chain()
                          .select(function(e){ return e.indexOf("data-") == 0; })
                          .map(function(e){ return e.substring(5); })
                          .value();
};

Nox.findAttributeBindings = function(attributeNames, el){
  return _(attributeNames).chain()
                          .select(function(e){ return e.indexOf("data-") == -1 && $(el).attr(e).indexOf("{{") > -1; })
                          .value();
};

Nox.findTextBindings = function(el){
  return _.select(el.childNodes, function(e){ return e.nodeType == 3 && $(e).text().indexOf("{{") > -1; });
};

Nox.addDataBinding = function(dataBinding, el, noxNode, context, vars){
  var bindingExpr = $(el).attr("data-"+dataBinding),
      binding = Nox.Bindings[dataBinding](el, noxNode, context, vars, bindingExpr);

  noxNode.addBinding(Nox.bindingDefaults(binding, noxNode, bindingExpr, context, vars));
};

Nox.addTextBinding = function(textBinding, noxNode, context, vars){
  var childNoxNode = noxNode.createChildNode(),
      textBindingExpr = '"'+$(textBinding).text().replace(/\n/g, "\\n").replace(/\{\{(.*?)\}\}/g, "\"+($1)+\"")+'"',
      binding = {
        update: function(exprValue){
          textBinding.nodeValue = exprValue;
        }
      };

  childNoxNode.addBinding(Nox.bindingDefaults(binding, childNoxNode, textBindingExpr, context, vars));
};

Nox.addAttributeBinding = function(attributeBinding, el, noxNode, context, vars){
  var childNoxNode = noxNode.createChildNode(),
      attributeBindingExpr = '"'+$(el).attr(attributeBinding).replace(/\n/g, "\\n").replace(/\{\{(.*?)\}\}/g, "\"+($1)+\"")+'"',
      binding = {
        update: function(exprValue){
          $(el).attr(attributeBinding, exprValue);
        }
      };

  childNoxNode.addBinding(Nox.bindingDefaults(binding, childNoxNode, attributeBindingExpr, context, vars));
};

Nox.bind = function(context, vars, el, parentNoxNode){
  var attributeNames    = Nox.parseAttributeNames(el),
      dataBindings      =  Nox.findDataBindings(attributeNames, el),          
      attributeBindings =  Nox.findAttributeBindings(attributeNames, el),
      textBindings      =  Nox.findTextBindings(el),
      noxNode           = null;

  if(dataBindings.length > 0 || attributeBindings.length > 0 || textBindings.length > 0){
    noxNode = parentNoxNode.createChildNode();

    _.each(dataBindings, function(dataBinding){
      Nox.addDataBinding(dataBinding, el, noxNode, context, vars);
    });

    _.each(textBindings, function(textBinding){
      Nox.addTextBinding(textBinding, noxNode, context, vars);
    });

    _.each(attributeBindings, function(attributeBinding){
      Nox.addAttributeBinding(attributeBinding, el, noxNode, context, vars);
    });

  };

  if(!noxNode || !noxNode.includesContainerBinding){
    $(el).children().each(function(){
      Nox.bind(context, vars, this, noxNode||parentNoxNode);
    });
  }

  return parentNoxNode;
};

Nox.Bindings = {};