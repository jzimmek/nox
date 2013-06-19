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
Nox.write.cache = {};