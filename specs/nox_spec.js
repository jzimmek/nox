describe("Nox", function(){

  beforeEach(function(){ Nox.rootBindingSet = new Nox.BindingSet(null, null); });
  afterEach(function(){ Nox.rootBindingSet = new Nox.BindingSet(null, null); });


  it("translateInputValue", function(){

    expect(Nox.translateInputValue(null)).toBeNull();
    expect(Nox.translateInputValue(undefined)).toBeNull();

    expect(Nox.translateInputValue("100")).toBe(100);
    expect(Nox.translateInputValue("-100")).toBe(-100);

    expect(Nox.translateInputValue("100.1")).toBe(100.1);
    expect(Nox.translateInputValue("-100.1")).toBe(-100.1);

    expect(Nox.translateInputValue("true")).toBe(true);
    expect(Nox.translateInputValue("yes")).toBe(true);
    expect(Nox.translateInputValue("false")).toBe(false);
    expect(Nox.translateInputValue("no")).toBe(false);
  });

  it("idOf", function(){
    expect(Nox.idOf(1)).toBe("1");
    expect(Nox.idOf(1.1)).toBe("1.1");
    expect(Nox.idOf("abc")).toBe("abc");
    expect(Nox.idOf(true)).toBe("true");
    expect(Nox.idOf(false)).toBe("false");

    expect(function(){
      Nox.idOf(null);
    }).toThrow("invalid argument");

    expect(function(){
      Nox.idOf(undefined);
    }).toThrow("invalid argument");

    var origIdOf = Nox.idOf;

    spyOn(Nox, "idOf");

    origIdOf({id: 100});

    expect(Nox.idOf).toHaveBeenCalledWith(100);

    Nox.idOf.reset();

    origIdOf({id: function(){ return 10; }});

    expect(Nox.idOf).toHaveBeenCalledWith(10);
  });



  describe("BindingSet", function(){

    it("takes an element and parentBindingSet as contructor arguments and stores them as property", function(){
      var el = {},
          parent = {},
          obj = new Nox.BindingSet(el, parent);

      expect(obj.el).toBe(el);
      expect(obj.parentBindingSet).toBe(parent);
    });

    it("creates a new BindingSet instance for the passed element, having this as parent and adds it to bindingsSets", function(){
      var obj = new Nox.BindingSet(null, null),
          el = {},
          obj2 = obj.nested(el);

      expect(obj2.el).toBe(el);
      expect(obj2.parentBindingSet).toBe(obj);
      expect(obj.bindingSets).toEqual([obj2]);
    });

    it("returns the BindingSet for the passed element or null if no BindingSet for this element exists", function(){

      var el = {},
          obj = new Nox.BindingSet(el, null);

      expect(obj.findByEl(el)).toBe(obj);

      var el2 = {},
          obj2 = obj.nested(el2);

      expect(obj.findByEl(el2)).toBe(obj2);

      expect(obj.findByEl({})).toBe(null);
    });

    it("returns true if at least one direct binding exist", function(){
      var obj = new Nox.BindingSet(null, null);
      expect(obj.hasBindings()).toBe(false);
      obj.bindings.push({});
      expect(obj.hasBindings()).toBe(true);
    });

    it("returns true if at least one direct or nested binding exist", function(){
      var obj = new Nox.BindingSet(null, null),
          obj2 = obj.nested({});

      expect(obj.hasBindingsDeep()).toBe(false);
      obj2.bindings = [{}];
      expect(obj.hasBindingsDeep()).toBe(true);
    });

    it("returns the number of direct bindings", function(){
      var obj = new Nox.BindingSet(null, null);
      expect(obj.numBindings()).toBe(0);
      obj.bindings.push({});
      expect(obj.numBindings()).toBe(1);
    });

    it("returns the number of direct and nested bindings", function(){
      var obj = new Nox.BindingSet(null, null);
      expect(obj.numBindingsDeep()).toBe(0);
      obj.bindings.push({});
      expect(obj.numBindingsDeep()).toBe(1);

      var obj2 = obj.nested({});
      obj2.bindings.push({});
      expect(obj.numBindingsDeep()).toBe(2);
    });

    it("returns the number of direct bindingSets", function(){
      var obj = new Nox.BindingSet(null, null);
      expect(obj.numBindingSets()).toBe(0);
      obj.nested({});
      expect(obj.numBindingSets()).toBe(1);
    });

    it("adds a binding", function(){
      var obj = new Nox.BindingSet(null, null);
      expect(obj.bindings.length).toBe(0);
      obj.addBinding({});
      expect(obj.bindings.length).toBe(1);
    });

    it("removes a binding", function(){
      var obj = new Nox.BindingSet(null, null),
          binding = {};

      obj.bindings = [binding];
      obj.removeBinding(binding);

      expect(obj.bindings.length).toBe(0);
    });

    it("removes a bindingSet", function(){
      var obj = new Nox.BindingSet(null, null),
          el = {},
          obj2 = obj.nested(el);

      obj.removeBindingSet(obj2);

      expect(obj.bindingSets.length).toBe(0);
    });

    it("invokes updateFun on each binding and bindingSet", function(){
      var obj = new Nox.BindingSet(null, null);

      var bindingSpy = jasmine.createSpy("binding");
      var bindingSetSpy = jasmine.createSpy("bindingSet");

      obj.bindings = [{updateFun: bindingSpy}];
      obj.bindingSets = [{updateFun: bindingSetSpy}];

      obj.updateFun();

      expect(bindingSpy).toHaveBeenCalled();
      expect(bindingSetSpy).toHaveBeenCalled();
    });

    it("invokes releaseFun on each binding and bindingSet, removes itself from parent and cleans out properties", function(){
      var parentSpy = jasmine.createSpy("parent.removeBinding");

      var obj = new Nox.BindingSet(null, {removeBindingSet: parentSpy});

      var bindingSpy = jasmine.createSpy("binding");
      var bindingSetSpy = jasmine.createSpy("bindingSet");

      obj.bindings = [{releaseFun: bindingSpy}];
      obj.bindingSets = [{releaseFun: bindingSetSpy}];

      obj.releaseFun();

      expect(parentSpy).toHaveBeenCalled();
      expect(bindingSpy).toHaveBeenCalled();
      expect(bindingSetSpy).toHaveBeenCalled();

      expect(obj.el).toBeNull();
      expect(obj.parentBindingSet).toBeNull();
      expect(obj.bindings).toBeNull();
      expect(obj.bindingSets).toBeNull();
    });

    it("returns self if as rootBindingSet if no parentBindingSet, calls rootBindingSet on parentBindingSet otherwise", function(){
      var obj = new Nox.BindingSet(null, null);

      expect(obj.rootBindingSet()).toBe(obj);

      var obj2 = obj.nested({});

      expect(obj2.rootBindingSet()).toBe(obj);
    });

    it("returns this from updateFun", function(){
      var obj = new Nox.BindingSet(null, null);
      expect(obj.updateFun()).toBe(obj);
    });

  });


  describe("Validator", function(){

    it("new", function(){
      expect(new Nox.Validator().rules).toEqual([]);
      expect(new Nox.Validator().errors).toEqual({});
    });

    it("rule", function(){
      var v = new Nox.Validator();

      var fun = (function(){});
      v.rule("key", "rule", fun);

      expect(v.rules).toEqual([["key", "rule", fun]]);
    });

    it("field", function(){
      var v = new Nox.Validator();

      spyOn(v, "rule");

      var f = v.field("myfield", false); // mandatory
      expect(v.rule).toHaveBeenCalledWith("myfield", "mandatory", Nox.Validator.fieldMandatoryFun);

      v.rule.reset();

      f = v.field("myfield", true); // optional
      expect(v.rule).not.toHaveBeenCalledWith("myfield", "mandatory", Nox.Validator.fieldMandatoryFun);
    });

    it("isValid", function(){
      var v = new Nox.Validator();
      
      v.errors["email"] = null;
      expect(v.isValid("email")).toBe(true);

      v.errors["email"] = "xyz";
      expect(v.isValid("email")).toBe(false);
    });

    it("isInvalid", function(){
      var v = new Nox.Validator();
      
      v.errors["email"] = "xyz";
      expect(v.isInvalid("email")).toBe(true);

      v.errors["email"] = null;
      expect(v.isInvalid("email")).toBe(false);
    });

    it("#fieldMandatoryFun", function(){
      spyOn(Nox.ValidatorField, "isBlank");
      Nox.Validator.fieldMandatoryFun(123);
      expect(Nox.ValidatorField.isBlank).toHaveBeenCalledWith(123);
    });

    describe("ValidatorField", function(){

      it("new", function(){
        var v = new Nox.Validator();
        var f = new Nox.ValidatorField("myfield", v);

        expect(f.name).toEqual("myfield");
        expect(f.validator).toBe(v);
      });

      it("#isBlank", function(){
        expect(Nox.ValidatorField.isBlank("")).toBe(true);
        expect(Nox.ValidatorField.isBlank("joe")).toBe(false);
        expect(Nox.ValidatorField.isBlank(123)).toBe(false);
        expect(Nox.ValidatorField.isBlank(undefined)).toBe(true);
        expect(Nox.ValidatorField.isBlank(null)).toBe(true);
      });

      it("minLength", function(){
        var v = new Nox.Validator();

        spyOn(v, "rule").andCallThrough();

        var f = new Nox.ValidatorField("myfield", v);
        var res = f.minLength(3);

        expect(res).toBe(f);
        expect(v.rule).toHaveBeenCalled();

        var args = v.rule.mostRecentCall.args;

        expect(args[0]).toEqual("myfield");
        expect(args[1]).toEqual("minLength");

        var fun = args[2];

        expect(fun(null)).toBeUndefined();
        expect(fun("")).toBeUndefined();
        expect(fun(undefined)).toBeUndefined();

        expect(fun("joe")).toBe(true);
        expect(fun("jo")).toBe(false);
      });

      it("maxLength", function(){
        var v = new Nox.Validator();

        spyOn(v, "rule").andCallThrough();

        var f = new Nox.ValidatorField("myfield", v);
        var res = f.maxLength(3);

        expect(res).toBe(f);
        expect(v.rule).toHaveBeenCalled();

        var args = v.rule.mostRecentCall.args;

        expect(args[0]).toEqual("myfield");
        expect(args[1]).toEqual("maxLength");

        var fun = args[2];

        expect(fun(null)).toBeUndefined();
        expect(fun("")).toBeUndefined();
        expect(fun(undefined)).toBeUndefined();

        expect(fun("joe")).toBe(true);
        expect(fun("joey")).toBe(false);
      });

      it("length", function(){
        var v = new Nox.Validator();
        var f = new Nox.ValidatorField("myfield", v);

        spyOn(f, "minLength");
        spyOn(f, "maxLength");

        // ---

        f.length({});

        expect(f.minLength).not.toHaveBeenCalled();
        expect(f.maxLength).not.toHaveBeenCalled();

        f.minLength.reset();
        f.maxLength.reset();

        // ---

        f.length({min: 3});

        expect(f.minLength).toHaveBeenCalledWith(3);
        expect(f.maxLength).not.toHaveBeenCalled();

        f.minLength.reset();
        f.maxLength.reset();

        // ---

        f.length({max: 3});

        expect(f.minLength).not.toHaveBeenCalled();
        expect(f.maxLength).toHaveBeenCalledWith(3);

        f.minLength.reset();
        f.maxLength.reset();

        // ---

        f.length({min: 1, max: 3});

        expect(f.minLength).toHaveBeenCalledWith(1);
        expect(f.maxLength).toHaveBeenCalledWith(3);

        f.minLength.reset();
        f.maxLength.reset();

      });
    });

  });


  describe("Eval", function(){

  });

  describe("Lifecycle - Deprecated", function(){
    it("adds the binding to the active bindings when created", function(){
      var el = $("<span data-text='this.name'></span>")[0];

      Nox.initAndUpdateBindings({}, {}, el);

      expect(Nox.rootBindingSet.numBindingsDeep()).toBe(1);
    });

    it("will call the <bindingName>Release on release(element) before removing the active bindings of it", function(){
      var el = $("<span data-text='this.name'></span>")[0];

      Nox.Bindings.textRelease = jasmine.createSpy("textRelease");

      Nox.initAndUpdateBindings({}, {}, el);
      Nox.rootBindingSet.findByEl(el).releaseFun();

      expect(Nox.Bindings.textRelease).toHaveBeenCalled();
    })
  });


  describe("DOM", function(){
    it("returns an empty array if the element has no attributes", function(){
      expect(Nox.parseAttributeNames($("<div></div>"))).toEqual([]);
    });

    it("returns an array of attribute names of the element", function(){
      expect(Nox.parseAttributeNames($("<div data-value='data-value'></div>")).join()).toEqual(["data-value"].join());
      expect(Nox.parseAttributeNames($("<div data-1='data-1' data-2='data-2'></div>")).sort().join()).toEqual(["data-1", "data-2"].sort().join());
    });
  });

  describe("Bindings", function(){

    describe("Text", function(){
      it("updates the element .text() value to the expression value", function(){
        var el = $("<span data-text='this.name'></span>")[0],
            app = {name: "joe"};

        var bindingSet = Nox.initAndUpdateBindings(app, {}, el);

        expect($(el).text()).toBe("joe");

        app.name = "bob";

        bindingSet.updateFun();

        expect($(el).text()).toBe("bob");
      });
    });

    describe("Value", function(){
      it("updates the element .val() value to the expression value", function(){
        var el = $("<input data-value='this.name'/>")[0],
            app = {name: "joe"};

        var bindingSet = Nox.initAndUpdateBindings(app, {}, el);

        expect($(el).val()).toBe("joe");

        app.name = "bob";

        bindingSet.updateFun();

        expect($(el).val()).toBe("bob");
      });

      it("updates the model when the elements value changes", function(){
        var el = $("<input data-value='this.name'/>")[0],
            app = {name: "joe"};

        Nox.initAndUpdateBindings(app, {}, el);

        $(el).val("bob-change").trigger("change");
        expect(app.name).toBe("bob-change");

        $(el).val("bob-keyup").trigger("keyup");
        expect(app.name).toBe("bob-keyup");

        $(el).val("bob-blur").trigger("blur");
        expect(app.name).toBe("bob-blur");
      });
    });

    describe("Loop", function(){
      it("initially removes all children of the element", function(){
        var el = $("<ul data-loop='this.entries'><li>xyz</li></ul>")[0],
            app = {entries: []};

        Nox.initAndUpdateBindings(app, {}, el);

        expect($(el).children().length).toBe(0);
      });

      it("creates a child and append it to element for each entry in the expression value", function(){
        var el = $("<ul data-loop='this.entries'><li data-text='entry.name'></li></ul>")[0],
            app = {entries: [{id: 1, name: "joe"}]};

        var bindingSet = Nox.initAndUpdateBindings(app, {}, el);

        expect($(el).children().length).toBe(1);
        expect($(el).children().html().toLowerCase()).toBe("joe");

        app.entries.push({id: 2, name: "bob"});
        bindingSet.updateFun();

        expect($(el).children().length).toBe(2);
        expect($($(el).children()[0]).html().toLowerCase()).toBe("joe");
        expect($($(el).children()[1]).html().toLowerCase()).toBe("bob");
      });

      it("assigns the id of the model entry object as data-id attribute to created child elements", function(){
        var el = $("<ul data-loop='this.entries'><li data-text='entry.name'></li></ul>")[0],
            app = {entries: [{id: 1, name: "joe"}]};

        Nox.initAndUpdateBindings(app, {}, el);

        expect($($(el).children()[0]).attr("data-id")).toBe("1");
      });

      it("removes child elements which no longer exist in the expression value", function(){
        var el = $("<ul data-loop='this.entries'><li data-text='entry.name'></li></ul>")[0],
            app = {entries: [{id: 1, name: "joe"}]};

        var bindingSet = Nox.initAndUpdateBindings(app, {}, el);

        app.entries = [];
        bindingSet.updateFun();

        expect($(el).children().length).toBe(0);
      });

      it("uses entry as default iterator variable if an array is passed as expression", function(){
        var el = $("<ul data-loop='this.entries'><li data-text='entry.name'></li></ul>")[0],
            app = {entries: [{id: 1, name: "joe"}]};

        Nox.initAndUpdateBindings(app, {}, el);
        expect($(el).children().html().toLowerCase()).toBe("joe");
      });

      it("uses entry as default iterator variable", function(){
        var el = $("<ul data-loop='{entries: \"this.entries\"}'><li data-text='entry.name'></li></ul>")[0],
            app = {entries: [{id: 1, name: "joe"}]};

        Nox.initAndUpdateBindings(app, {}, el);
        expect($(el).children().html().toLowerCase()).toBe("joe");
      });

      it("use passed as value as iterator variable", function(){
        var el = $("<ul data-loop='{entries: \"this.entries\", as: \"person\"}'><li data-text='person.name'></li></ul>")[0],
            app = {entries: [{id: 1, name: "joe"}]};

        Nox.initAndUpdateBindings(app, {}, el);
        expect($(el).children().html().toLowerCase()).toBe("joe");
      });

      it("pass iterator variable as dynamic factory", function(){
        var el = $("<ul data-loop-person='this.entries'><li data-text='person.name'></li></ul>")[0],
            app = {entries: [{id: 1, name: "joe"}]};

        Nox.initAndUpdateBindings(app, {}, el);
        expect($(el).children().html().toLowerCase()).toBe("joe");
      });

    });

  });

});