Nox.ValidatorField = function(name, validator){
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