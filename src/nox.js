var Nox = {};

Nox.createBinding = function(expr, el, context, vars, bindingImpl, bindingContextAttributes, bindingSet){
  var bindingId = (_.uniqueId() + 1) + "",
      bindingContext = {
        expr: expr,
        context: context,
        vars: vars,
        el: el,
        bindingSet: bindingSet
      },
      mutate = _.bind(Nox.mutate, bindingContext);

  _.extend(bindingContext, bindingContextAttributes||{});

  if(bindingImpl.init !== Nox.defaultInit)
    bindingImpl.init.call(bindingContext, el, mutate);

  var f = (bindingImpl.update === Nox.defaultUpdate) ? Nox.defaultUpdate : (function(){
    var value = bindingImpl.value(expr, context, vars);

    if(!_.isEqual(value, bindingContext.state)){
      bindingContext.state = bindingImpl.state(value);
      bindingImpl.update.call(bindingContext, el, value);
    }
  });

  var release = _.bind(bindingImpl.release, bindingContext),
      binding = {id: bindingId, updateFun: f, skipChildren: bindingContext.skipChildren, releaseFun: release};

  bindingSet.addBinding(binding);

  return binding;
};

Nox.defaulValue       = function(expr, context, vars){ return Nox.read(expr, context, vars); };
Nox.defaultState      = function(value){ return value; };
Nox.defaultInit       = function(){ /* noop */ };
Nox.defaultUpdate     = function(){ /* noop */ };
Nox.defaultRelease    = function(){ /* noop */ };

Nox.bindingImplFor = function(bindingName){
  return {
    init: Nox.Bindings[bindingName+"Init"] || Nox.defaultInit,
    update: Nox.Bindings[bindingName+"Update"] || Nox.defaultUpdate,
    value: Nox.Bindings[bindingName+"Value"] || Nox.defaulValue,
    state: Nox.Bindings[bindingName+"State"] || Nox.defaultState,
    release: Nox.Bindings[bindingName+"Release"] || Nox.defaultRelease
  };
};

Nox.mutate = function(newValue){
  if(newValue === undefined){
    // event handler will pass "undefined" as newValue
    // we do not want to check any state changes
    // simply fire updateBindings
    this.bindingSet.rootBindingSet().updateFun();
  }else{
    if(!_.isEqual(newValue, this.state)){
      this.state = newValue;
      Nox.write(this.expr, this.context, this.vars, newValue);
      this.bindingSet.rootBindingSet().updateFun();
    }
  }
};

Nox.decodeBracketExpression = function(expr){
  return '"'+expr.replace(/\n/g, "\\n").replace(/\{\{(.*?)\}\}/g, "\"+($1)+\"")+'"';
};

Nox.initAttributeBindings = function(el, context, vars, bindingSet){
  var attributes = Nox.parseAttributeNames(el);

  for(var i=0; i < attributes.length; i++){
    var attribute = attributes[i],
        expr = $(el).attr(attribute);

    if(expr === undefined)
      continue;

    if(attribute.indexOf("data-") == -1 && expr.indexOf("{{") > -1){
      expr = Nox.decodeBracketExpression(expr);

      var bindingImpl = Nox.bindingImplFor("nodeAttribute"),
          binding = Nox.createBinding(expr, el, context, vars, bindingImpl, {attribute: attribute}, bindingSet);
    }
  }
}

Nox.initTextBindings = function(el, context, vars, bindingSet){
  _(el.childNodes).chain()
                  // only nodes of type TEXT
                  .where({nodeType: 3})
                  .map(function(childNode){
                    return [childNode, $(childNode).text()];
                  }).select(function(arr){
                    // skip nodes which does not contain an expression
                    return arr[1].indexOf("{{") > -1;
                  }).map(function(arr){
                    // make text expression a valid javascript statement
                    return [arr[0], Nox.decodeBracketExpression(arr[1])];
                  }).each(function(arr){
                    // create binding for text expression
                    Nox.createBinding(arr[1], arr[0], context, vars, Nox.bindingImplFor("nodeValue"), {}, bindingSet)
                  }).value();
};

Nox.bindingNames = function(){
  return _(Nox.Bindings).chain()
                        .keys()
                        .map(function(e){ 
                          return e.replace(/(Init|Update)$/, "");
                        })
                        .uniq()
                        .value();
};

Nox.factoryExpr = function(el, bindingName){
  var attributes = Nox.parseAttributeNames(el),
      pattern = new RegExp("^data-"+bindingName+"-(.*?)$");

  for(var i=0; i < attributes.length; i++){

    if(attributes[i].match(pattern) && RegExp.$1){
      var factoryFun = Nox.Bindings[bindingName+"Factory"],
          factoryExpr = $(el).attr("data-"+bindingName+"-"+RegExp.$1);

      return factoryFun(factoryExpr, RegExp.$1);
    }
  }

  return null;
}

Nox.initDataBindings = function(el, context, vars, bindingSet){
  var skipChildren = false,
      bindingNames = Nox.bindingNames();

  for(var i=0; i < bindingNames.length; i++){
    var bindingName = bindingNames[i],
        expr = $(el).attr("data-"+bindingName);

    if(!expr && bindingName.match(/Factory$/)){
      bindingName = bindingName.replace(/Factory$/, "")
      expr = Nox.factoryExpr(el, bindingName);
    }

    if(!expr)
      continue;

    var bindingImpl = Nox.bindingImplFor(bindingName),
        binding = Nox.createBinding(expr, el, context, vars, bindingImpl, {}, bindingSet);
        skipChildren = binding.skipChildren || skipChildren;
  }

  return skipChildren;
}

Nox.initBindings = function(el, context, vars, parentBindingSet){
  var parentBindingSet = parentBindingSet || Nox.rootBindingSet,
      bindingSet = parentBindingSet.nested(el),
      skipChildren = Nox.initDataBindings(el, context, vars, bindingSet);

  Nox.initAttributeBindings(el, context, vars, bindingSet);

  if(skipChildren)
    return bindingSet;

  Nox.initTextBindings(el, context, vars, bindingSet);

  if(!bindingSet.hasBindings()){
    parentBindingSet.removeBindingSet(bindingSet);
    bindingSet = parentBindingSet;
  }

  $(el).children().each(function(){
    Nox.initBindings(this, context, vars, bindingSet);
  });

  return bindingSet;
};

Nox.initAndUpdateBindings = function(context, vars, el){
  return Nox.initBindings(el || document.body, context, vars || {}).rootBindingSet().updateFun();
};