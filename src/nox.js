var Nox = {};

Nox.bindings = [];

Nox.createBinding = function(expr, el, context, vars, bindingImpl, bindingContextAttributes){
  var bindingId = (_.uniqueId() + 1) + "",
      bindingContext = {},
      mutate = _.bind(Nox.createMutate(expr, context, vars), bindingContext);

  _.extend(bindingContext, bindingContextAttributes||{});

  if(bindingImpl.init !== Nox.defaultInit)
    bindingImpl.init.call(bindingContext, expr, el, context, vars, mutate);

  var f = function(){
    if(bindingImpl.update !== Nox.defaultUpdate){
      var exprValue = bindingImpl.evalExpr(expr, context, vars);

      if(!_.isEqual(exprValue, bindingContext.state)){
        bindingContext.state = bindingImpl.valueState(exprValue);
        bindingImpl.update.call(bindingContext, exprValue, el, context, vars);
      }
    }
  };


  var release = _.bind(bindingImpl.release, bindingContext);

  var binding = {id: bindingId, updateFun: f, skipChildren: bindingContext.skipChildren, releaseFun: release};
  Nox.bindings.push(binding);

  return binding;
};

Nox.updateBindings = function(){
  var start = new Date().getTime();

  // for(var i=0; i < Nox.bindings.length; i++){
  //   Nox.bindings[i].skipUpdate = false;
  // }

  for(var i=0; i < Nox.bindings.length; i++){
    Nox.bindings[i].updateFun();
  }
  var end = new Date().getTime();
  // console.info("updateBindings took: " + (end - start));
};

Nox.defaulEvalExpr          = function(expr, context, vars){ return Nox.read(expr, context, vars); };
Nox.defaultValueState       = function(exprValue){ return exprValue; };
Nox.defaultInit             = function(){ /* noop */ };
Nox.defaultUpdate           = function(){ /* noop */ };
Nox.defaultRelease          = function(){ /* noop */ };

Nox.bindingImplFor = function(bindingName){
  return {
    init: Nox.Bindings[bindingName+"Init"] || Nox.defaultInit,
    update: Nox.Bindings[bindingName+"Update"] || Nox.defaultUpdate,
    evalExpr: Nox.Bindings[bindingName+"EvalExpr"] || Nox.defaulEvalExpr,
    valueState: Nox.Bindings[bindingName+"ValueState"] || Nox.defaultValueState,
    release: Nox.Bindings[bindingName+"Release"] || Nox.defaultRelease
  };
};

Nox.createMutate = function(expr, context, vars){
  // the returned function will be invoked in binddngContext, so it is safe to use this.state
  return function(newValue){
    if(newValue === undefined){
      // event handler will pass "undefined" as newValue
      // we do not want to check any state changes
      // simply fire updateBindings
      Nox.updateBindings();
    }else{
      if(!_.isEqual(newValue, this.state)){
        this.state = newValue;
        Nox.write(expr, context, vars, newValue);
        Nox.updateBindings();
      }
    }

  };
};

Nox.addBindingId = function(el, bindingId, attrName){
  attrName = attrName || "data-binding-ids";
  var bindingIds = $(el).attr(attrName);

  if(bindingIds){
    var bindingIdsArr = bindingIds.split(",")
    bindingIdsArr.push(bindingId);
    bindingIds = bindingIdsArr.join(",");
  }else{
    bindingIds = bindingId + "";
  }

  $(el).attr(attrName, bindingIds);
}

Nox.addDependentBindingId = function(el, dependentBindingId){
  Nox.addBindingId(el, dependentBindingId, "data-dependent-binding-ids");
}

Nox.initAttributeBindings = function(el, context, vars, created){
  var attributes = Nox.parseAttributeNames(el);

  for(var i=0; i < attributes.length; i++){
    var attribute = attributes[i],
        expr = $(el).attr(attribute);

    if(expr === undefined)
      continue;

    if(attribute.indexOf("data-") == -1 && expr.indexOf("{{") > -1){
      expr = '"'+expr.replace(/\n/g, "\\n").replace(/\{\{(.*?)\}\}/g, "\"+($1)+\"")+'"';

      var bindingImpl = Nox.bindingImplFor("nodeAttribute"),
          binding = Nox.createBinding(expr, el, context, vars, bindingImpl, {attribute: attribute});

      Nox.addDependentBindingId(el, binding.id);

      created.push(binding);
    }
  }
}

Nox.initTextBindings = function(el, context, vars, created){
  for(var i=0; i < el.childNodes.length; i++){
    var childNode = el.childNodes[i],
        expr = $(childNode).text();

    if(childNode.nodeType == 3 && expr.indexOf("{{") > -1){

      expr = '"'+expr.replace(/\n/g, "\\n").replace(/\{\{(.*?)\}\}/g, "\"+($1)+\"")+'"';

      var bindingImpl = Nox.bindingImplFor("nodeValue"),
          binding = Nox.createBinding(expr, childNode, context, vars, bindingImpl)

      Nox.addDependentBindingId(el, binding.id);

      created.push(binding);
    }
  }
}

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

Nox.initDataBindings = function(el, context, vars, created){
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
        binding = Nox.createBinding(expr, el, context, vars, bindingImpl);
        skipChildren = binding.skipChildren || skipChildren;

    Nox.addBindingId(el, binding.id);

    created.push(binding);
  }

  return skipChildren;
}

Nox.initBindings = function(el, context, vars, created){
  var created = created || [],
      skipChildren = Nox.initDataBindings(el, context, vars, created);

  Nox.initAttributeBindings(el, context, vars, created);

  if(skipChildren)
    return created;

  Nox.initTextBindings(el, context, vars, created);

  $(el).children().each(function(){
    Nox.initBindings(this, context, vars, created);
  });

  return created;
};

Nox.initAndUpdateBindings = function(context, vars, el){
  $(function(){
    var created = Nox.initBindings(el || document.body, context, vars || {});
    Nox.updateBindings();
  });
};