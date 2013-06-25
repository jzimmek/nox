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