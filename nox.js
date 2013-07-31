var Nox = {};

Nox.Watch = function(obj, field, fun){
  this.obj = obj;
  this.field = Nox.Watch.fieldAccessor(field);
  this.fun = fun;
  this.lastKnownValue = undefined;
  this.isReleased = false;

  var toJSONOrig = obj.toJSON;

  obj.toJSON = function(){
    return toJSONOrig ? toJSONOrig.call(_.omit(this, "nox")) : _.omit(this, "nox");
  };

  obj.nox.watches.push(this);
};

Nox.Watch.fieldAccessor = function(field){
  return _.isFunction(field) ? field : (field.match(/^[_a-zA-Z0-9]+$/) ? field : new Function("return " + field));
};

Nox.Watch.prototype.release = function(){
  if(this.isReleased)
    return;

  this.isReleased = true;

  this.obj.nox.watches = _.without(this.obj.nox.watches, this);

  this.obj = null;
  this.field = null;
  this.fun = null;
  this.lastKnownValue = null;
};

Nox.Watch.clone = function(value){
  // TODO cloning a Date value results in a browser freeze on watchTraverse loop
  // TODO needs further investigation

  if(_.isDate(value))
    return new Date(value.getTime());

  return _.clone(value);
};

Nox.Watch.readLatestValue = function(obj, field){
  return _.isFunction(field) ? field.call(obj) : obj[field];
};

Nox.Watch.prototype.updateValue = function(newValue){
  this.lastKnownValue = Nox.Watch.clone(newValue);
  this.fun.call(this.obj, this.lastKnownValue, this.field);
};

Nox.Watch.prototype.run = function(){  
  var latestValue = Nox.Watch.readLatestValue(this.obj, this.field);

  if(!_.isEqual(this.lastKnownValue, latestValue)){
    this.updateValue(latestValue);
    return true;
  }

  return false;
};

Nox.watch = function(obj, field, fun){
  if(!obj.nox)
    obj.nox = {watches: []};

  var w = new Nox.Watch(obj, field, fun);
  w.run();

  return w;
};

Nox.Error = function(){
};

Nox.Error.prototype.clear = function(){
  var keys = _.keys(this);

  for(var i=0, key; (key = keys[i]) !== undefined; i++){
    if(key == "nox" || _.isFunction(this[key]))
      continue;

    this[key] = null;
  }

  return this;
};

Nox.Error.prototype.isEmpty = function(){
  var keys = _.keys(this);

  for(var i=0, key; (key = keys[i]) !== undefined; i++){
    var val = this[key];
    if(val){
      if(key == "nox" || _.isFunction(val))
        continue;

      return false;
    }
  }

  return true;
};

Nox.Traverse = {};

Nox.Traverse.traverseArray = function(arr, root, visited){
  for(var i=0; i < arr.length; i++){
    Nox.Traverse.traverse(arr[i], root, visited);
  }
};

Nox.Traverse.traverseObject = function(obj, root, visited){
  for(var key in obj){
    if(key === "nox")
      continue;

    var val = obj[key];

    if(!val)
      continue;

    if(_.isObject(val) && !_.isDate(val))
      Nox.Traverse.traverse(val, root, visited);
  }
};


Nox.Traverse.traverse = function(obj, root, visited){
  root = root || obj;
  visited = visited || [];

  if(_.include(visited, obj))
    return;

  visited.push(obj);
  
  var watches = obj.nox ? obj.nox.watches : [];

  for(var i=0, watch; (watch = watches[i]) !== undefined; i++){
    if(watch.isReleased)
      continue;

    if(watch.run()){
      Nox.Traverse.traverse(root, root, []);
      return
    }
  }

  if(_.isArray(obj))  Nox.Traverse.traverseArray(obj, root, visited);
  else                Nox.Traverse.traverseObject(obj, root, visited);
};

Nox.Resolve = {};

Nox.Resolve.findTextNodesWithVariable = function(selector){
  return $(selector).add($("*", selector)).contents().filter(function(){
    return this.nodeType == 3 && this.nodeValue.indexOf("{{") > -1;
  });
};

Nox.Resolve.resolveVariables = function(scope, selector, resolves){
  var $textNodes = Nox.Resolve.findTextNodesWithVariable(selector);

  $textNodes.each(function(){
    var varNames = _.map(this.nodeValue.match(/{{(.*?)}}/g), function(e){ return e.substring(2, e.length - 2)}),
        textNode = this,
        origText = textNode.nodeValue;

    var varValues = _.inject(varNames, function(memo, key){
      memo[key] = "{{"+key+"}}";
      return memo;
    }, {});



    for(var i=0, varName; (varName = varNames[i]) !== undefined; i++){
      (function(varName){

        var resolve = _.detect(resolves, function(e){ return e[0] == varName; });

        if(!resolve)
          return;

        var resolveVariable = resolve[0],
            resolveObj = resolve[1],
            resolveField = resolve[2];

        var watch = Nox.watch(resolveObj, resolveField, function(newValue){
          varValues[resolveVariable] = (newValue === null ? "" : newValue.toString());
          
          var replacedText = origText;
          
          for(var key in varValues){
            replacedText = replacedText.replace("{{"+key+"}}", varValues[key]);
          }

          textNode.nodeValue = replacedText;
        });

        scope.watches.push(watch);


      })(varName);
    }

  });

};


Nox.Scope = function(selector, fun, parentScope, args, resolves){
  this.selector = selector;
  this.childScopes = [];

  this.model = {};

  this.parentScope = parentScope;

  this.isReleased = false;

  this.watches = [];
  this.resolves = resolves || [];

  if(fun){
    fun.apply(this, _.union([this.model], args||[]));
    this.resolves = this.resolves.reverse();

    Nox.Resolve.resolveVariables(this, selector, this.resolves);
  }
};

Nox.Scope.prototype.resolve = function(variable, obj, field){
  this.resolves.push([variable, obj, field]);
  return this;
};


Nox.Scope.prototype.rootScope = function(){
  return this.parentScope ? this.parentScope.rootScope() : this;
};

Nox.Scope.prototype.$ = function(selector){
  return $(selector, $(this.selector));
};

Nox.Scope.prototype.update = function(){
  Nox.Traverse.traverse(this.model);
  _.invoke(this.childScopes, "update");
  return this;
};

Nox.Scope.prototype.watch = function(obj, field, fun){
  var watch = Nox.watch(obj, field, _.bind(fun, this));
  this.watches.push(watch);
  return this;
};

Nox.Scope.prototype.release = function(){
  if(this.isReleased)
    return;

  this.isReleased = true;

  _.invoke(this.watches, "release");

  if(this.parentScope)
    this.parentScope.childScopes = _.without(this.parentScope.childScopes, this);

  _.invoke(this.childScopes, "release");

  this.selector = null;
  this.childScopes = null;
  this.parentScope = null;
  this.model = null;
  this.watches = null;
  this.resolves = null;
};

Nox.Scope.prototype.scope = function(selector, fun, args){
  var $el = this.$(selector),
      childScope = new Nox.Scope($el, fun, this, args, _.clone(this.resolves));

  this.childScopes.push(childScope);

  return this;
};

Nox.Scope.prototype.on = function(selector, event, fun){
  var rootScope = this.rootScope(),
      $el = this.$(selector);

  $el.on(event, function(e){
    fun(e);
    rootScope.update();
  });
  return this;
};

// ------

Nox.Scope.prototype.text = function(selector, obj, field){
  var $el = this.$(selector);
  this.watch(obj, field, function(newValue){
    $el.text(newValue);
  });

  return this;
};

Nox.Scope.prototype.value = function(selector, obj, field){
  var $el = this.$(selector),
      rootScope = this.rootScope();

  $el.on("change blur keyup", function(){
    obj[field] = $(this).val();
    rootScope.update();
  });

  this.watch(obj, field, function(newValue){
    $el.val(newValue);
  });

  return this;
};

Nox.Scope.prototype.loop = function(selector, obj, field, fun){
  var $el = this.$(selector),
      tpl = $el.html().replace(/^\s+|\s+$/g, "");

  $el.empty();

  var loopChildScopes = [];

  this.watch(obj, field, function(newValue){
    $el.empty();

    _.invoke(loopChildScopes, "release");
    loopChildScopes = [];

    for(var i=0; i < newValue.length; i++){
      (function(i){
        var $child = $(tpl);
        $child.appendTo($el);

        this.scope($child, function(){
          loopChildScopes.push(this);
          fun.apply(this, arguments);
        }, [newValue[i], $child]);

      }).call(this, i);
    }

  });

  return this;
};

Nox.Scope.prototype.toggle = function(selector, obj, field, fun){
  var $el = this.$(selector);

  if(fun){
    var tpl = $el.html().replace(/^\s+|\s+$/g, ""),
        childScope = null;

    this.watch(obj, field, function(newValue){
      $el.empty();

      if(newValue){
        var $child = $(tpl);
        $el.append($child);

        this.scope($el, function(){
          childScope = this;
          fun.apply(this, arguments);
        });

        $el.show();
      }else{
        if(childScope){
          childScope.release();
          childScope = null;
        }
        $el.hide();
      }
    });

  }else{

    this.watch(obj, field, function(newValue){
      $el.toggle(newValue === true);
    });

  }

  return this;
};

Nox.Scope.prototype.clazz = function(selector, obj, field, className){
  var $el = this.$(selector);

  this.watch(obj, field, function(newValue){
    if(newValue)  $el.addClass(className);
    else          $el.removeClass(className);
  });

  return this;
};

Nox.Scope.prototype.error = function(selector, obj, field){
  return this.clazz(selector, obj.error, field, "error");
};

Nox.Scope.prototype.attr = function(selector, obj, field, attribute){
  var $el = this.$(selector);

  this.watch(obj, field, function(newValue){
    if(newValue === null)   $el.removeAttr(attribute);
    else                    $el.attr(attribute, newValue);
  });

  return this;
};

Nox.Scope.prototype.check = function(selector, obj, field){
  var self = this,
      $el = this.$(selector);

  $el.on("change", function(){
    obj[field] = $(this).is(":checked");
    self.update();
  });

  this.watch(obj, field, function(newValue){
    if(newValue)  $el.prop("checked", true);
    else          $el.removeAttr("checked");
  }, selector);

  return this;
};

Nox.Scope.prototype.radioset = function(selector, obj, field, opts){
  var $el = this.$(selector),
      self = this,
      entries = opts.entries,
      label = opts.label || (function(v){ return v.toString(); }),
      name = "radio"+_.uniqueId();

  $el.on("change", function(){
    obj[field] = entries[$(":checked", this).index()];
    self.update();
  });

  this.watch(obj, field, function(newValue){
    $el.empty();

    var checked = obj[field];

    for(var i=0; i < entries.length; i++){
      var radio = $("<input type='radio' name='"+name+"'/>")[0];

      if(entries[i] === checked)
        $(radio).attr("checked", "checked");

      $el.append(radio);
      $el.append(label(entries[i]));
    };

  });

  return this;
};

Nox.Scope.prototype.select = function(selector, obj, field, opts){
  var $el = this.$(selector),
      self = this,
      entries = opts.entries,
      multiple = opts.multiple === true,
      label = opts.label || (function(v){ return v.toString(); });

  if(multiple)
    $el.attr("multiple", "multiple");

  $el.on("change", function(){

    if(multiple){
      obj[field] = _.map($("option:selected", this).toArray(), function(e){ return entries[$(e).index()]; });
    }else{
      var selectedIdx = $("option:selected", this).index();
      obj[field] = (selectedIdx == 0) ? null : entries[selectedIdx - 1];
    }

    self.update();
  });

  this.watch(obj, field, function(newValue){

    $el.empty();

    if(!multiple)
      $el.append("<option>please choose</option>");

    var selected = multiple ? obj[field] : [obj[field]];

    for(var i=0; i < entries.length; i++){
      var option = $("<option>"+label(entries[i])+"</option>");

      if(_.include(selected, entries[i]))
        $(option).attr("selected", "selected");

      $el.append(option);
    }

  });

  return this;
};

Nox.Scope.prototype.date = function(selector, obj, field, opts){

  var $el = this.$(selector),
      self = this,
      $day = $("<select class='day'></select>"),
      $month = $("<select class='month'></select>"),
      $year = $("<select class='year'></select>");

  $el.append($day).append($month).append($year);

  $(".day,.month,.year", $el).on("change", function(){

    if($("option:selected", this).val() === ""){
      obj[field] = null;
      self.update();
      return;
    }

    var day = $("option:selected", $day).val(),
        month = $("option:selected", $month).val(),
        year = $("option:selected", $year).val();

    if(day && month && year){
      obj[field] = new Date(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));
      self.update();
    }
  });

  var initOptions = function(el, min, max, selected, label){
    for(var i=min; i <= max; i++){
      var option = $("<option value='"+i+"'>"+label(i)+"</option>");

      if(selected === i)
        $(option).attr("selected", "selected");

      $(el).append(option);
    }    
  };

  this.watch(obj, field, function(newValue){

    $day.html("<option value=''>please choose</option>");
    $month.html("<option value=''>please choose</option>");
    $year.html("<option value=''>please choose</option>");

    var now = (newValue === null) ? moment() : moment(newValue),
        lastDayInMonth = moment(now).endOf("month").date();

    initOptions($day,   1,                lastDayInMonth,   newValue !== null ? now.date() : null, function(v){ return v; });
    initOptions($month, 0,                11,               newValue !== null ? now.month() : null, function(v){ return v + 1; });
    initOptions($year,  now.year() - 10,  now.year() + 10,  newValue !== null ? now.year() : null, function(v){ return v; });

  });

  return this;
};

Nox.Scope.prototype.inlineEdit = function(selector, obj, field){

  var $el = this.$(selector),
      $input = $("<input type='text'/>"),
      $span = $("<span></span>");
  
  $input.hide();

  this.text($span, obj, field);
  this.value($input, obj, field);

  $el.append($span).append($input);

  $span.on("dblclick", function(){
    $(this).hide();
    $input.show().focus();
  });

  $input.on("blur", function(){
    $(this).hide();
    $span.show();
  });

  return this;
};

Nox.Scope.prototype.message = function(selector, obj, field){
  var $el = this.$(selector),
      self = this;
  
  $el.hide();

  this.watch(obj, field, function(newValue){
    if(newValue){
      $el.hide().text(newValue).fadeIn("slow", function(){
        obj[field] = null;
        self.update();
      });
    }
    else $el.hide();
  });

  return this;
};

Nox.Scope.prototype.transition = function(selector, obj, field, opts){
  var $el = this.$(selector);

  this.watch(obj, field, function(newValue){
    $el.transition(opts);
  });

  return this;
};