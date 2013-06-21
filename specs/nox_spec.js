describe("Nox", function(){

  beforeEach(function(){ Nox.bindings = []; });
  afterEach(function(){ Nox.bindings = []; });

  describe("Eval", function(){

  });

  describe("Lifecycle", function(){
    it("adds the binding to the active bindings when created", function(){
      var el = $("<span data-text='this.name'></span>")[0];

      Nox.initAndUpdateBindings({}, {}, el);

      expect(Nox.bindings.length).toBe(1);
    });

    it("creates a unique id for each binding, attach it as data-binding-ids attribute and use it as key in active bindings list", function(){
      var el = $("<span data-text='this.name'></span>")[0],
          created = Nox.initAndUpdateBindings({}, {}, el);

      // expect(Nox.bindings["0"]).toBe(created[0]);

      expect($(el).attr("data-binding-ids")).toBe(Nox.bindings["0"].id);
    });

    it("removes the bindingId of the released element from active bindings", function(){
      var el = $("<span data-text='this.name'></span>")[0];

      Nox.initAndUpdateBindings({}, {}, el);
      Nox.release(el);

      expect(Nox.bindings.length).toBe(0);
    });

    it("will call the <bindingName>Release on release(element) before removing the active bindings of it", function(){
      var el = $("<span data-text='this.name'></span>")[0];

      Nox.Bindings.textRelease = jasmine.createSpy("textRelease");

      Nox.initAndUpdateBindings({}, {}, el);
      Nox.release(el);

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

        Nox.initAndUpdateBindings(app, {}, el);

        expect($(el).text()).toBe("joe");

        app.name = "bob";

        Nox.updateBindings();

        expect($(el).text()).toBe("bob");
      });
    });

    describe("Value", function(){
      it("updates the element .val() value to the expression value", function(){
        var el = $("<input data-value='this.name'/>")[0],
            app = {name: "joe"};

        Nox.initAndUpdateBindings(app, {}, el);

        expect($(el).val()).toBe("joe");

        app.name = "bob";

        Nox.updateBindings();

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

        Nox.initAndUpdateBindings(app, {}, el);

        expect($(el).children().length).toBe(1);
        expect($(el).children().html().toLowerCase()).toBe("joe");

        app.entries.push({id: 2, name: "bob"});
        Nox.updateBindings();

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

        Nox.initAndUpdateBindings(app, {}, el);

        app.entries = [];
        Nox.updateBindings();

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