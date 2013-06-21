Nox.Bindings = {};

Nox.Bindings.nodeAttributeUpdate = function(exprValue, el, context, vars){
  $(el).attr(this.attribute, exprValue);
};

Nox.Bindings.nodeValueUpdate = function(exprValue, el, context, vars){
  el.nodeValue = exprValue;
};

Nox.Bindings.clickInit = function(expr, el, context, vars, mutate){
  $(el).on("click", function(e){
    e.preventDefault();
    Nox.read(expr, context, vars);
    mutate(undefined);
  });
};

Nox.Bindings.valueInit = function(expr, el, context, vars, mutate){
  $(el).on("change blur keyup", function(){
    mutate($(this).val());
  });
};

Nox.Bindings.valueUpdate = function(exprValue, el, context, vars){
  $(el).val(exprValue);
};

Nox.Bindings.valuePlaceholderInit = function(expr, el, context, vars, mutate){

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

Nox.Bindings.valuePlaceholderUpdate = function(exprValue, el, context, vars){
  if(!exprValue && navigator.userAgent.match(/MSIE/i))
    exprValue = this.placeholder;

  $(el).val(exprValue);
};

Nox.Bindings.checkInit = function(expr, el, context, vars, mutate){
  $(el).on("change", function(){
    mutate($(this).is(":checked"));
  });
};

Nox.Bindings.checkUpdate = function(exprValue, el, context, vars){
  if(exprValue) $(el).prop("checked", true);
  else          $(el).removeAttr("checked");
};

Nox.Bindings.showUpdate = function(exprValue, el, context, vars){
  var isVisible = !!exprValue;
  $(el).toggle(isVisible);

  if(!isVisible){
    $("[data-dependent-bindings-ids],[data-bindings-ids]", el);
  }
};

Nox.Bindings.hideUpdate = function(exprValue, el, context, vars){
  var isVisible = !exprValue;
  $(el).toggle(isVisible);
};

Nox.Bindings.textUpdate = function(exprValue, el, context, vars){
  $(el).text(exprValue);
};

Nox.Bindings.loopFactory = function(expr, dynamic){
  return "{entries: '"+expr+"', as: '"+dynamic+"'}";
};

Nox.Bindings.loopEvalExpr = function(expr, context, vars){
  var res = Nox.read(expr, context, vars);

  if(_.isArray(res))  return {entries: res, as: 'entry'};
  else                return {entries: Nox.read(res.entries, context, vars), as: res.as || "entry"};
}

Nox.Bindings.loopValueState = function(exprValue){
  return _.pluck(exprValue.entries, "id");
};

Nox.Bindings.loopInit = function(expr, el, context, vars, mutate){
  this.skipChildren = true;
  this.tpl = $(el).html().replace(/^\s+|\s+$/g, "");

  $(el).empty();
};

Nox.Bindings.loopUpdate = function(exprValue, el, context, vars){
  var entries = exprValue.entries,
      as = exprValue.as,
      entryIds = _.map(entries, function(e){ return e.id + ""; }),
      tpl = this.tpl;


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
