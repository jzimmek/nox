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
