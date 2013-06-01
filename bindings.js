// --------------------------------------
// default data- bindings
// --------------------------------------

Nox.Bindings["text"] = function(el, noxNode, context, vars, expr){
  return {
    update: function(exprValue){
      $(el).text(exprValue);
    }
  };
};

Nox.Bindings["show"] = function(el, noxNode, context, vars, expr){
  var tpl = null;

  return {
    container: true,

    init: function(mutate){
      tpl = $(el).html().replace(/^\s+|\s+$/g, "");
      $(el).hide().empty();
    },

    update: function(exprValue){
      noxNode.releaseChildren();
      $(el).empty();

      if(exprValue){
        $(tpl).appendTo(el).each(function(){
          Nox.bind(context, vars, this, noxNode.createChildNode()).init().update();
        });
        $(el).show();
      }else{
        $(el).hide();
      }
    }
  };
};

Nox.Bindings["clock"] = function(el, noxNode, context, vars, expr){
  var intervalId = null;

  return {
    release: function(){
      clearInterval(intervalId);
    },
    init: function(mutate){
      var timer = function(){
        // console.info("run timer")
        $(el).text(new Date().getTime());
      };

      timer();

      intervalId = setInterval(timer, 1000);
    }
  };
};

Nox.Bindings["check"] = function(el, noxNode, context, vars, expr){
  return {
    init: function(mutate){
      $(el).on("change", function(){
        mutate(expr, context, vars, $(this).is(":checked"));
      });
    },
    update: function(exprValue){
      if(exprValue)   $(el).prop("checked", true);
      else            $(el).removeAttr("checked");
    }
  }
};

Nox.Bindings["loop"] = function(el, noxNode, context, vars, expr){
  var tpl = null;

  return {
    container: true,

    evalState: function(exprValue){
      return _.pluck(exprValue.entries, "id").join(",");
    },

    evalExprValue: function(){
      var opts = Nox.read(expr, context, vars);
      return {
        entries: Nox.read(opts.entries, context, vars),
        as: opts.as
      };
    },

    init: function(mutate){
      tpl = $(el).html().replace(/^\s+|\s+$/g, "");
      $(el).empty();
    },

    update: function(exprValue){
      $(el).empty();
      noxNode.releaseChildren();

      for(var i=0; i < exprValue.entries.length; i++){
        var entry = exprValue.entries[i];

        $(tpl).appendTo(el).each(function(){
          var newVars = _.extend({}, vars);
          newVars[exprValue.as] = entry;

          Nox.bind(context, newVars, this, noxNode.createChildNode()).init().update();
        });
      }

    }
  }
};

Nox.Bindings["click"] = function(el, noxNode, context, vars, expr){
  return {
    init: function(mutate){
      $(el).on("click", function(){
        Nox.read(expr, context, vars);
        noxNode.root().update();
        return false;
      });
    }
  };
};

Nox.Bindings["value"] = function(el, noxNode, context, vars, expr){
  return {
    init: function(mutate){
      $(el).on("change blur keyup", function(){
        mutate(expr, context, vars, $(this).val());
      });
    },
    update: function(exprValue){
      $(el).val(exprValue);
    }
  };
};