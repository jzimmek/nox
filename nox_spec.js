describe("Nox", function(){

  describe("parseAttributeNames", function(){
    it("returns an empty array if no attributes found", function(){
      expect(Nox.parseAttributeNames($("<span></span>")[0])).toEqual([]);
    });

    it("returns an array containing the names of the found attributes", function(){
      // expect(Nox.parseAttributeNames($("<span bla bli=1 blub=\"123\" data-attr data-attr2=\"\"></span>")[0])).toEqual(["bla", "bli", "blub", "data-attr", "data-attr2"]);
      
      // TODO ie8 fail when attribute has no value
      var attributes = Nox.parseAttributeNames($("<span bli=1 blub=\"123\" data-attr2=\"\"></span>")[0]);
      expect(attributes.sort().join(",")).toEqual(["bli", "blub", "data-attr2"].sort().join(","));
    });
  });

  describe("read", function(){
    beforeEach(function(){
      Nox.read.cache = {};
    })

    it("evaluates expression and returns result", function(){
      expect(Nox.read("this.name", {name: "joe"}, {})).toEqual("joe");
      expect(Nox.read("this.name+id", {name: "joe"}, {id: 100})).toEqual("joe100");
    });

    it("caches expressions", function(){
      Nox.read("this.name", {name: "joe"}, {});
      expect(typeof(Nox.read.cache["this.name"])).toBe("function");
    });
  });

  describe("write", function(){
    it("assigns value to the expression", function(){
      var obj = {};
      Nox.write("this.name", obj, {}, "joe");
      expect(obj.name).toBe("joe");
    });
  });

  describe("Node", function(){

    it("new", function(){
      var parent = {},
          node = new Nox.Node(parent);

      expect(node.parent).toBe(parent);
      expect(node.bindings).toEqual([]);
      expect(node.children).toEqual([]);
      expect(node.states).toEqual([]);
      expect(node.includesContainerBinding).toBe(false);
    });

    describe("addBinding", function(){
      it("adds binding to node.bindings", function(){
        var node = new Nox.Node(null),
            binding = {};

        node.addBinding(binding);
        expect(node.bindings).toEqual([binding]);
      });
      it("assigns true to node.includesContainerBinding if any added binding has a truthy container property", function(){
        var node = new Nox.Node(null);
        node.addBinding({container: true});
        expect(node.includesContainerBinding).toBe(true);
      });
    });

    describe("createState", function(){
      it("adds the newly created state to node.states", function(){
        var node = new Nox.Node(null),
            state = node.createState();

        expect(node.states).toEqual([state]);
      });

      it("has an initial value of undefined", function(){
        var node = new Nox.Node(null),
            state = node.createState();

        expect(state.get()).toBeUndefined();
      });

      it("sets and gets a value", function(){
        var node = new Nox.Node(null),
            state = node.createState();

        state.set(100);
        expect(state.get()).toEqual(100);
      });
    });

    it("returns the root node", function(){
      var root = new Nox.Node(null),
          child = new Nox.Node(root);

      expect(root.root()).toBe(root);
      expect(child.root()).toBe(root);
    });

    describe("init", function(){
      it("invokes the init function on each node.bindings object", function(){
        var node = new Nox.Node(null);
        node.bindings = [{init: jasmine.createSpy()}];

        node.init();
        expect(node.bindings[0].init).toHaveBeenCalled();
      });

      it("it skips node.bindings object which do not have an init function", function(){
        var node = new Nox.Node(null);
        node.bindings = [{}];
        node.init(); // would fail otherwise
      });

      it("invokes the node.initChildren function", function(){
        var node = new Nox.Node(null);

        spyOn(node, "initChildren");

        node.init();
        expect(node.initChildren).toHaveBeenCalled();
      });

      it("returns node", function(){
        var node = new Nox.Node(null);
        expect(node.init()).toBe(node);
      });
    });

    describe("initChildren", function(){
      it("invokes the init function on each node.children object", function(){
        var node = new Nox.Node(null);
        node.children = [{init: jasmine.createSpy()}];
        node.initChildren();
        expect(node.children[0].init).toHaveBeenCalled();
      });

      it("returns node", function(){
        var node = new Nox.Node(null);
        expect(node.initChildren()).toBe(node);
      });
    });

    describe("update", function(){

      it("invokes the update function on each node.bindings object", function(){
        var node = new Nox.Node(null);
        node.bindings = [Nox.bindingDefaults({update: jasmine.createSpy()}, node, "null", {}, {})];

        node.update();
        expect(node.bindings[0].update).toHaveBeenCalled();
      });

      it("it skips node.bindings object which do not have an update function", function(){
        var node = new Nox.Node(null);
        node.bindings = [{}];
        node.update(); // would fail otherwise
      });

      it("invokes the node.updateChildren function", function(){
        var node = new Nox.Node(null);

        spyOn(node, "updateChildren");

        node.update();
        expect(node.updateChildren).toHaveBeenCalled();
      });

      it("returns node", function(){
        var node = new Nox.Node(null);
        expect(node.update()).toBe(node);
      });
    });

    describe("updateChildren", function(){
      it("invokes the update function on each node.children object", function(){
        var node = new Nox.Node(null);
        node.children = [{update: jasmine.createSpy()}];
        node.updateChildren();
        expect(node.children[0].update).toHaveBeenCalled();
      });

      it("returns node", function(){
        var node = new Nox.Node(null);
        expect(node.updateChildren()).toBe(node);
      });
    });

    describe("release", function(){
      it("releases all bindings and children of node", function(){
        var node = new Nox.Node(null);
        
        spyOn(node, "releaseBindings");
        spyOn(node, "releaseChildren");

        node.release();

        expect(node.releaseBindings).toHaveBeenCalled();
        expect(node.releaseChildren).toHaveBeenCalled();
      });
    });

    describe("releaseBindings", function(){
      it("invokes release on each bindings of node", function(){
        var node = new Nox.Node(null);
        var binding = {
          release: jasmine.createSpy()
        };
        node.bindings.push(binding);
        node.releaseBindings();

        expect(binding.release).toHaveBeenCalled();
        expect(node.bindings.length).toBe(0);
      });
    });

    describe("releaseChildren", function(){
      it("removes all children from node", function(){
        var node = new Nox.Node(null);
        node.createChildNode();

        node.releaseChildren();
        expect(node.children.length).toBe(0);
      });

      it("invokes release on each removed child", function(){
        var node = new Nox.Node(null);
            child = node.createChildNode();

        spyOn(child, "release");

        node.releaseChildren();

        expect(child.release).toHaveBeenCalled();
      });

    });

    describe("createChildNode", function(){
      it("adds the newly created child to node.children", function(){
        var node = new Nox.Node(null),
            child = node.createChildNode();

        expect(node.children).toEqual([child]);
      });

      it("assigns node to child.parent", function(){
        var node = new Nox.Node(null),
            child = node.createChildNode();

        expect(child.parent).toBe(node);

      });
    });

    describe("createMutator", function(){

      beforeEach(function(){
        var root = this.root = {
          update: jasmine.createSpy()
        };


        this.binding = {
          state: {
            get: (function(){}),
            set: (function(){})
          },
          noxNode: {
            root: (function(){ return root; })
          }
        };
      });

      it("returns a function", function(){
        var mutator = Nox.Node.createMutator(this.binding);
        expect(typeof(mutator)).toBe("function");
      });

      it("does nothing when mutator is called with same value", function(){
        spyOn(this.binding.state, "get").andReturn(null);

        var mutator = Nox.Node.createMutator(this.binding);
        mutator("expr", "context", "vars", null /*newValue*/);
      });

      it("if value if different, then updates state to newValue, call Nox.write and update on root node", function(){
        spyOn(this.binding.state, "get").andReturn(null);
        spyOn(this.binding.state, "set");
        spyOn(Nox, "write");

        var mutator = Nox.Node.createMutator(this.binding);
        mutator("expr", "context", "vars", 100 /*newValue*/);

        expect(this.binding.state.set).toHaveBeenCalledWith(100);
        expect(Nox.write).toHaveBeenCalledWith("expr", "context", "vars", 100);
        expect(this.root.update).toHaveBeenCalled();
      });

    });

  });

  it("findDataBindings", function(){
    expect(Nox.findDataBindings(["data-value", "bla", "blub", "data-value2"])).toEqual(["value", "value2"]);
  });

  it("findAttributeBindings", function(){
    var el = $("<span data-value=\"\" bla=\"\" blub=\"{{this.name}}\"></span>")[0];
    expect(Nox.findAttributeBindings(["data-value", "bla", "blub"], el)).toEqual(["blub"]);
  });

  it("findTextBindings", function(){
    var el = $("<span>name {{this.name}}<br/>age {{this.age}}<br/>bla blub</span>")[0];
    var bindings = Nox.findTextBindings(el);
    expect(bindings.length).toBe(2);
    expect(bindings[0].nodeValue).toBe("name {{this.name}}");
    expect(bindings[1].nodeValue).toBe("age {{this.age}}");
  });


  // describe("Leaks", function(){

  //   beforeEach(function(){
  //     $("#nox").empty();
  //   });

  //   afterEach(function(){
  //     $("#nox").empty();
  //   });

  // });


  describe("Bindings", function(){

    beforeEach(function(){
      $("#nox").empty();
    });

    afterEach(function(){
      $("#nox").empty();
    });

    describe("attribute-bindings", function(){
      it("evaluates the expression in attribute node", function(){
        var el = $("<span class='{{this.name}}'></span>")[0],
            app = {name: "joe"},
            node = Nox.bind(app, {}, el, new Nox.Node()).init().update();

        expect($(el).attr("class")).toBe("joe");

        app.name = "bob";
        node.root().update();
        expect($(el).attr("class")).toBe("bob");

        app.name = null;
        node.root().update();
        expect($(el).attr("class")).toBe("null");
      });

    });

    describe("text-bindings", function(){
      it("evaluates the expression in text node", function(){
        var el = $("<span>{{this.name}}</span>")[0],
            app = {name: "joe"},
            node = Nox.bind(app, {}, el, new Nox.Node()).init().update();

        expect($(el).text()).toBe("joe");

        app.name = "bob";
        node.root().update();
        expect($(el).text()).toBe("bob");

        app.name = null;
        node.root().update();
        expect($(el).text()).toBe("null");
      });
    });

    describe("data-bindings", function(){
      describe("text", function(){
        it("calls $.text() passing in the expression result as argument", function(){
          var el = $("<span data-text='this.name'></span>")[0],
              app = {name: "joe"},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update();

          expect($(el).text()).toBe("joe");

          app.name = "bob";
          node.update();

          expect($(el).text()).toBe("bob");
        });
      });

      describe("value", function(){
        it("calls $.val() passing in the expression result as argument", function(){
          var el = $("<input data-value='this.name'/>")[0],
              app = {name: "joe"},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update();

          expect($(el).val()).toBe("joe");

          app.name = "bob";
          node.update();

          expect($(el).val()).toBe("bob");
        });

        it("assign the user input to the expression", function(){
          var el = $("<input data-value='this.name'/>")[0],
              app = {name: "joe"},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update();

          $(el).val("bob").trigger("change");
          expect(app.name).toBe("bob");

          $(el).val("joe").trigger("blur");
          expect(app.name).toBe("joe");

          $(el).val("bob").trigger("keyup");
          expect(app.name).toBe("bob");
        });

        it("calls node.root().update() on change, blur and keyup", function(){
          var el = $("<input data-value='this.name'/>")[0],
              app = {name: null},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update(),
              root = node.root();

          spyOn(root, "update");

          $(el).trigger("change");
          expect(root.update).toHaveBeenCalled();

          root.update.reset();

          $(el).val("joe").trigger("blur");
          expect(root.update).toHaveBeenCalled();

          root.update.reset();

          $(el).val("bob").trigger("keyup");
          expect(root.update).toHaveBeenCalled();
        });

      });

      describe("check", function(){
        it("assigns true to the expression if the checkbox is checked, false otherwise", function(){
          var el = $("<input type='checkbox' data-check='this.done'/>")[0],
              app = {done: null},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update();

          $(el).trigger("change");
          expect(app.done).toBe(false);

          $(el).prop("checked", true).trigger("change");
          expect(app.done).toBe(true);
        });

        it("checks the checkbox if the expressions result is true, unchecks it otherwise", function(){
          var el = $("<input type='checkbox' data-check='this.done'/>")[0],
              app = {done: null},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update();

          // expression result of null will be treated as false
          expect($(el).is(":checked")).toBe(false);

          app.done = false;
          node.update();
          expect($(el).is(":checked")).toBe(false);

          app.done = true;
          node.update();
          expect($(el).is(":checked")).toBe(true);
        });

        it("calls node.root().update() on change", function(){
          var el = $("<input type='checkbox' data-check='this.done'/>")[0],
              app = {done: null},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update(),
              root = node.root();

          spyOn(root, "update");

          $(el).trigger("change");
          expect(root.update).toHaveBeenCalled();
        });
      });

      describe("click", function(){
        it("evaluates the expression on click", function(){
          var el = $("<button data-click='this.fun()'></button>")[0],
              app = {fun: jasmine.createSpy()},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update();

          $(el).trigger("click");

          expect(app.fun).toHaveBeenCalled();
        });

        it("calls node.root().update() on click", function(){
          var el = $("<button data-click='this.fun()'></button>")[0],
              app = {fun: jasmine.createSpy()},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update(),
              root = node.root();

          spyOn(root, "update");

          $(el).trigger("click");
          expect(root.update).toHaveBeenCalled();
        });
      });

      describe("loop", function(){
        it("evaluates the expression and clones the template for each entry, bind it and add is as child to the element", function(){
          var el = $("<ul data-loop=\"{entries: 'this.entries', as: 'entry'}\"><li>{{entry.name}}</li></ul>")[0],
              bob = {id: 1, name: "bob"},
              joe = {id: 2, name: "joe"},
              app = {entries: [
                bob,
                joe
              ]},
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update().children[0];

          expect($(el).children().length).toBe(2);
          expect(node.children.length).toBe(2);

          var child1 = $(el).children()[0],
              child2 = $(el).children()[1];

          expect($(child1).appendTo("<div></div>").parent().html().toLowerCase()).toBe("<li>bob</li>");
          expect($(child2).appendTo("<div></div>").parent().html().toLowerCase()).toBe("<li>joe</li>");

          app.entries = _.without(app.entries, bob);

          node.root().update();

          expect($(el).children().length).toBe(1);
          expect(node.children.length).toBe(1);
          expect($($(el).children()[0]).appendTo("<div></div>").parent().html().toLowerCase()).toBe("<li>joe</li>");
        });
      });

      describe("show", function(){
        it("evaluates the expression and show the children if true, removes all children and hides itself otherwise", function(){

          var el = $("<div data-show='this.user'><span data-text='this.user.name'></span></div>"),
              app = {
                user: {
                  name: "joe"
                }
              },
              node = Nox.bind(app, {}, el, new Nox.Node()).init().update().children[0];

          $(el).appendTo("#nox");

          expect($(el).children().length).toBe(1);
          expect($(el).html().toLowerCase()).toBe("<span data-text=\"this.user.name\">joe</span>");
          expect($(el).is(":visible")).toBe(true);
          expect(node.children.length).toBe(1);

          app.user = null;
          node.root().update();

          expect($(el).children().length).toBe(0);
          expect($(el).is(":visible")).toBe(false);
          expect(node.children.length).toBe(0);

        });
      });

    });


  });

});