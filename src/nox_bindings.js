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
