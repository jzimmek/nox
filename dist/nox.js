var Nox = {};

Nox.idOf = function(obj){
  if(obj === null || obj === undefined)
    throw "invalid argument";

  var type = typeof(obj);

  if(type === "string" || type === "number" || type === "boolean")
    return obj.toString();

  if(type === "object")
    return Nox.idOf((typeof(obj.id) === "function") ? obj.id() : obj.id);

  throw "could not determine of: " + obj;
};

Nox.translateInputValue = function(input){
  if(input === undefined)
    return null;

  if(_.isString(input)){

    if(input.match(/^[-+]?[0-9]*\.?[0-9]+$/))
      return parseFloat(input);
    
    if(input.match(/^[-+]?[0-9]+$/))
      return parseInt(input, 10);
    
    if(input === "true" || input == "yes")
      return true;

    if(input === "false" || input == "no")
      return false;

  }

  return input;
};

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
    var value = bindingImpl.value(expr, context, vars),
        state = bindingImpl.state(value);

    if(!_.isEqual(state, bindingContext.state)){
      // console.info("!!!! ", expr, state, bindingContext.state);
      bindingContext.state = state;
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
};$(document).on("ajaxComplete", function(){
  Nox.rootBindingSet.updateFun();
});Nox.BindingSet = function(el, parentBindingSet){
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
Nox.Bindings = {};

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

Nox.Bindings.errorFactory = function(expr, dynamic){
  return "{validator: '"+expr+"', key: '"+dynamic+"'}";
};

Nox.Bindings.errorValue = function(expr, context, vars){
  var res = Nox.read(expr, context, vars);
  return {
    validator: Nox.read(res.validator, context, vars),
    key: res.key
  };
};

Nox.Bindings.errorState = function(value){
  return (value.validator.validator || value.validator).errors
};

// Nox.Bindings.errorInit = function(el, mutate){
//   $(el).removeClass("error-true").addClass("error-false");
// };

Nox.Bindings.errorUpdate = function(el, value){
  var validator = value.validator.validator || value.validator,
      key = value.key,
      res = validator.isInvalid(key);

  $(el).removeClass("error-"+(!res)).addClass("error-"+res);
};

Nox.Bindings.loopFactory = function(expr, dynamic){
  return "{entries: '"+expr+"', as: '"+dynamic+"'}";
};

Nox.Bindings.loopValue = function(expr, context, vars){
  var res = Nox.read(expr, context, vars);

  if(_.isArray(res))  return {entries: res, as: 'entry'};
  else                return {entries: Nox.read(res.entries, context, vars), as: res.as || "entry"};
}

Nox.Bindings.loopState = function(value){
  return _.map(value.entries, function(e){ return Nox.idOf(e); });
};

Nox.Bindings.loopInit = function(el, mutate){
  this.skipChildren = true;
  this.tpl = $(el).html().replace(/^\s+|\s+$/g, "");

  $(el).empty();
};

Nox.Bindings.loopUpdate = function(el, value){
  var entries = value.entries,
      as = value.as,
      entryIds = _.map(entries, function(e){ return Nox.idOf(e); }),
      tpl = this.tpl,
      context = this.context,
      vars = this.vars,
      bindingSet = this.bindingSet;


  var childIds = _.map($("> [data-id]", el).toArray(), function(e){ return $(e).attr("data-id"); });

  for(var i=0; i < childIds.length; i++){
    var childId = childIds[i];
    if(!_.include(entryIds, childId)){
      // console.info("remove existing dom child ("+childId+") which no longer exist in model")
      var childEl = $("> [data-id='"+childId+"']", el)[0];
      Nox.rootBindingSet.findByEl(childEl).releaseFun();
    }
  }

  for(var i=0; i < entries.length; i++){
    var entryId = Nox.idOf(entries[i]);

    if(!_.include(childIds, entryId)){
      // console.info("create dom child ("+entryId+") which is new in model");
      var newVars = _.clone(vars);
      newVars[as] = entries[i];

      $(tpl).each(function(){
        var childBindingSet = bindingSet.nested(this);

        Nox.initBindings(this, context, newVars, childBindingSet);
        $(this).attr("data-id", entryId);
        $(el).append(this);

        if(!childBindingSet.hasBindingsDeep()){
          bindingSet.removeBindingSet(childBindingSet);
        }else{
          childBindingSet.updateFun();
        }

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
};Nox.ValidatorField = function(name, validator){
  this.name = name;
  this.validator = validator;
};

Nox.ValidatorField.isBlank = function(value){
  return value === null || value === undefined || value === "";
};

Nox.ValidatorField.prototype.length = function(opts){
  if(opts.min)  this.minLength(opts.min);
  if(opts.max)  this.maxLength(opts.max);
};

Nox.ValidatorField.prototype.minLength = function(length){
  this.validator.rule(this.name, "minLength", function(value){
    if(Nox.ValidatorField.isBlank(value))
      return;

    return value.length >= length;
  });

  return this;
};

Nox.ValidatorField.prototype.maxLength = function(length){
  this.validator.rule(this.name, "maxLength", function(value){
    if(Nox.ValidatorField.isBlank(value))
      return;

    return value.length <= length;
  });

  return this;
};

Nox.Validator = function(){
  this.rules = [];
  this.errors = {};
};

Nox.Validator.prototype.isValid = function(key){
  return !this.errors[key];
};

Nox.Validator.prototype.isInvalid = function(key){
  return !!this.errors[key];
};

Nox.Validator.prototype.validate = function(obj){
  this.errors = {};

  for(var i=0; i < this.rules.length; i++){
    var key = this.rules[i][0],
        rule = this.rules[i][1],
        fun = this.rules[i][2];

    if(this.errors[key])
      continue;

    var value = obj[key];

    if(fun(value) === false)
      this.errors[key] = rule;
  }

  return _.size(this.errors) == 0;
};

Nox.Validator.prototype.rule = function(key, rule, fun){
  this.rules.push([key, rule, fun]);
};

Nox.Validator.fieldMandatoryFun = function(value){
  return !Nox.ValidatorField.isBlank(value);
};

Nox.Validator.prototype.field = function(name, optional){
  var f = new Nox.ValidatorField(name, this);

  if(!optional)
    this.rule(name, "mandatory", Nox.Validator.fieldMandatoryFun);

  return f;
};