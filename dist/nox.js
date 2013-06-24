var Nox = {};

Nox.bindings = [];

Nox.createBinding = function(expr, el, context, vars, bindingImpl, bindingContextAttributes){
  var bindingId = (_.uniqueId() + 1) + "",
      bindingContext = {
        expr: expr,
        context: context,
        vars: vars,
        el: el
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
    Nox.updateBindings();
  }else{
    if(!_.isEqual(newValue, this.state)){
      this.state = newValue;
      Nox.write(this.expr, this.context, this.vars, newValue);
      Nox.updateBindings();
    }
  }
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
    Nox.initBindings(el || document.body, context, vars || {});
    Nox.updateBindings();
  });
};$(document).on("ajaxComplete", function(){
  Nox.updateBindings();
});Nox.Bindings = {};

Nox.Bindings.nodeAttributeUpdate = function(el, value){
  $(el).attr(this.attribute, value);
};

Nox.Bindings.nodeValueUpdate = function(el, value){
  el.nodeValue = value;
};

Nox.Bindings.clickInit = function(el, mutate){
  var expr = this.expr,
      context = this.context,
      vars = this.vars;

  $(el).on("click", function(e){
    e.preventDefault();
    Nox.read(expr, context, vars);
    mutate(undefined);
  });
};

Nox.Bindings.valueInit = function(el, mutate){
  $(el).on("change blur keyup", function(){
    mutate($(this).val());
  });
};

Nox.Bindings.valueUpdate = function(el, value){
  $(el).val(value);
};

Nox.Bindings.valuePlaceholderInit = function(el, mutate){

  var placeholder = this.placeholder = $(el).attr("placeholder");

  $(el).on("change blur keyup", function(){
    mutate($(this).val());
  });

  if(navigator.userAgent.match(/MSIE/i)){
  
    $(el).focus(function(){
      if($(this).val() == placeholder)
        $(this).val("");
    });

    $(el).blur(function(){
      if(!$(this).val())
        $(this).val(placeholder);
    });

  }
};

Nox.Bindings.valuePlaceholderUpdate = function(el, value){
  if(!value && navigator.userAgent.match(/MSIE/i))
    value = this.placeholder;

  $(el).val(value);
};

Nox.Bindings.checkInit = function(el, mutate){
  $(el).on("change", function(){
    mutate($(this).is(":checked"));
  });
};

Nox.Bindings.checkUpdate = function(el, value){
  if(value)   $(el).prop("checked", true);
  else        $(el).removeAttr("checked");
};

Nox.Bindings.showUpdate = function(el, value){
  var isVisible = !!value;
  $(el).toggle(isVisible);

  if(!isVisible){
    $("[data-dependent-bindings-ids],[data-bindings-ids]", el);
  }
};

Nox.Bindings.hideUpdate = function(el, value){
  var isVisible = !value;
  $(el).toggle(isVisible);
};

Nox.Bindings.textUpdate = function(el, value){
  $(el).text(value);
};

Nox.Bindings.loopFactory = function(expr, dynamic){
  return "{entries: '"+expr+"', as: '"+dynamic+"'}";
};

Nox.Bindings.loopValue = function(expr, context, vars){
  var res = Nox.read(expr, context, vars);

  if(_.isArray(res))  return {entries: res, as: 'entry'};
  else                return {entries: Nox.read(res.entries, context, vars), as: res.as || "entry"};
}

Nox.Bindings.loopState = function(exprValue){
  return _.pluck(exprValue.entries, "id");
};

Nox.Bindings.loopInit = function(el, mutate){
  this.skipChildren = true;
  this.tpl = $(el).html().replace(/^\s+|\s+$/g, "");

  $(el).empty();
};

Nox.Bindings.loopUpdate = function(el, value){
  var entries = value.entries,
      as = value.as,
      entryIds = _.map(entries, function(e){ return e.id + ""; }),
      tpl = this.tpl,
      context = this.context,
      vars = this.vars;


  var childIds = _.map($("> [data-id]", el).toArray(), function(e){ return $(e).attr("data-id"); });

  for(var i=0; i < childIds.length; i++){
    var childId = childIds[i];
    if(!_.include(entryIds, childId)){
      // console.info("remove existing dom child ("+childId+") which no longer exist in model")
      var childEl = $("> [data-id='"+childId+"']", el)[0];
      Nox.release(childEl);
      $(childEl).remove();
    }
  }

  for(var i=0; i < entries.length; i++){
    var entryId = entries[i].id + "";

    if(!_.include(childIds, entryId)){
      // console.info("create dom child ("+entryId+") which is new in model");
      var newVars = _.clone(vars);
      newVars[as] = entries[i];

      $(tpl).each(function(){
        var created = Nox.initBindings(this, context, newVars, created);
        $(this).attr("data-id", entryId);
        $(el).append(this);

        _.invoke(created, "updateFun");
      });
    }

  }
}
Nox.read = function(expr, context, vars){
  var varKeys = _.keys(vars);
  var cacheKey = expr + varKeys;
  var fun = Nox.read.cache[cacheKey];

  if(!fun){
    try{
      Nox.read.cache[cacheKey] = (fun = new Function(varKeys, "return " + expr));
    }catch(e){
      if(window.console){
        window.console.error("expr", expr, "context", context, "vars", vars);
      }
      throw e;
    }
  }

  return fun.apply(context, _.values(vars));
};
Nox.read.cache = {};

Nox.write = function(expr, context, vars, value){
  expr = "(" + expr + ") = (value);";

  var varKeys = _.keys(vars).concat(["value"]);
  var cacheKey = expr + varKeys;

  var fun = Nox.write.cache[cacheKey];

  if(!fun)
    Nox.write.cache[cacheKey] = (fun = new Function(varKeys, "return " + expr));

  return fun.apply(context, _.values(vars).concat([value]));
};
Nox.write.cache = {};Nox.parseAttributeNames = function(el){
  var html = $("<div/>").append($(el).clone().empty()).html(),
      res = html.match(/\s+([-a-z0-9]+)\s*=/ig);

  if(res){
    for(var i=0; i < res.length; i++){
      res[i] = res[i].replace(/\s|=/g, "");
    }
  }

  return res || [];
};

Nox.BINDING_ID_ATTRIBUTE_NAMES = [ "data-binding-ids", "data-dependent-binding-ids" ];

Nox.release = function(el){
  // console.info("releasing", el);
  var releasedBindingIds = [];

  for(var i=0; i < Nox.BINDING_ID_ATTRIBUTE_NAMES.length; i++){
    var attrName = Nox.BINDING_ID_ATTRIBUTE_NAMES[i];
    releasedBindingIds.push(($(el).attr(attrName)||"").split(","));
    $("["+attrName+"]", el).each(function(){
      releasedBindingIds.push(($(this).attr(attrName)||"").split(","));
    });
  }

  var bindingIds = _(releasedBindingIds).chain().flatten().reject(function(e){ return e === ""; }).value();


  var bindings = _.select(Nox.bindings, function(e){ return _.include(bindingIds, e.id); });

  _.invoke(bindings, "releaseFun");

  Nox.bindings = _.reject(Nox.bindings, function(e){
    return _.include(bindingIds, e.id);
  });
};
