describe("Nox", function(){

  describe("Watch", function(){

    it("new Watch", function(){
      var obj = {name: "joe", nox: {watches: []}},
          fun = jasmine.createSpy("watch fun");

      spyOn(Nox.Watch, "fieldAccessor").andReturn("name");

      var watch = new Nox.Watch(obj, "name", fun);

      expect(watch.obj).toBe(obj);
      expect(Nox.Watch.fieldAccessor).toHaveBeenCalledWith("name");
      expect(watch.field).toBe("name");
      expect(watch.fun).toBe(fun);
      expect(watch.lastKnownValue).toBe(undefined);
      expect(watch.isReleased).toBe(false);

      expect(obj.nox.watches).toEqual([watch]);
    });

    it("fieldAccessor", function(){
      expect(Nox.Watch.fieldAccessor("someString")).toBe("someString");
      
      var res = Nox.Watch.fieldAccessor("this.name.length > 10");        
      expect(typeof(res)).toBe("function");

      var code = res.toString()
                    .replace(/\n/g, "")
                    .replace("function anonymous() {", "")
                    .replace(/\}$/, "")
                    .replace(/^\s|\s$/g, "")
                    .replace(/;$/, "");

      expect(code).toBe("return this.name.length > 10");

      var fun = (function(){});
      expect(Nox.Watch.fieldAccessor(fun)).toBe(fun);
    });

    it("release", function(){
      var obj = {name: "joe", nox: {watches: []}};
      var watch = new Nox.Watch(obj, "name", (function(){}));

      watch.release();
      expect(watch.isReleased).toBe(true);
      expect(watch.obj).toBe(null);
      expect(watch.field).toBe(null);
      expect(watch.lastKnownValue).toBe(null);
      expect(obj.nox.watches).toEqual([]);
    });

    it("readLatestValue", function(){
      expect(Nox.Watch.readLatestValue({name: "joe"}, "name")).toBe("joe");
      expect(Nox.Watch.readLatestValue({name: "joe"}, function(){ return this.name; })).toBe("joe");
    });

    it("clone", function(){
      var obj = {name: "joe"},
          obj2 = Nox.Watch.clone(obj);

      expect(obj).toEqual(obj2);
      expect(obj).not.toBe(obj2);

      var date1 = new Date(),
          date2 = Nox.Watch.clone(date1);

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });


    it("updateValue", function(){
      var obj = {name: "joe", nox: {watches: []}},
          fun = jasmine.createSpy("watch fun"),
          watch = new Nox.Watch(obj, "name", fun);

      spyOn(Nox.Watch, "clone").andReturn("bob!");

      watch.updateValue("bob");

      expect(Nox.Watch.clone).toHaveBeenCalledWith("bob");
      expect(watch.lastKnownValue).toBe("bob!");
      expect(fun).toHaveBeenCalledWith("bob!", "name");
    });

    describe("run", function(){
      it("returns false if latestValue is same as lastKnownValue", function(){
        var obj = {name: "joe", nox: {watches: []}},
            fun = jasmine.createSpy("watch fun"),
            watch = new Nox.Watch(obj, "name", fun);

        spyOn(watch, "updateValue");

        watch.lastKnownValue = "joe";
        expect(watch.run()).toBe(false);
        expect(watch.updateValue).not.toHaveBeenCalled();
      });

      it("calls updateValue and returns true latestValue is not same as lastKnownValue", function(){
        var obj = {name: "joe", nox: {watches: []}},
            fun = jasmine.createSpy("watch fun"),
            watch = new Nox.Watch(obj, "name", fun);

        spyOn(watch, "updateValue");

        expect(watch.run()).toBe(true);
        expect(watch.updateValue).toHaveBeenCalledWith("joe");

        obj.name = "bob";
        expect(watch.run()).toBe(true);
        expect(watch.updateValue).toHaveBeenCalledWith("bob");
      });

    });

    it("watch", function(){
      var obj = {name: "joe"};

      spyOn(Nox.Watch.prototype, "run");

      var res = Nox.watch(obj, "name", (function(){}));

      expect(obj.nox.watches).toEqual([res]);      
      expect(Nox.Watch.prototype.run).toHaveBeenCalled();
    });

  });

  describe("Traverse", function(){
    it("demo", function(){

      var obj = {name: "joe", fullname: null};

      Nox.watch(obj, "name", function(newValue){
        this.fullname = newValue + "!";
      });

      expect(obj.fullname).toBe("joe!");

      Nox.Traverse.traverse(obj, obj, []);

      // no changes

      expect(obj.name).toBe("joe");
      expect(obj.fullname).toBe("joe!");


      obj.name = "bob";
      Nox.Traverse.traverse(obj, obj, []);

      expect(obj.name).toBe("bob");
      expect(obj.fullname).toBe("bob!");
    });

    it("traverseArray", function(){
      var entry1 = {name: "entry1"},
          entry2 = {name: "entry2"},
          arr = [entry1, entry2],
          root = {},
          visited = [];

      spyOn(Nox.Traverse, "traverse");

      Nox.Traverse.traverseArray(arr, root, visited);

      expect(Nox.Traverse.traverse).toHaveBeenCalledWith(entry1, root, visited);
      expect(Nox.Traverse.traverse).toHaveBeenCalledWith(entry2, root, visited);
    });

    it("traverseObject", function(){
      var root = {},
          visited = [];

      spyOn(Nox.Traverse, "traverse");

      Nox.Traverse.traverse.reset();        
      Nox.Traverse.traverseObject({nested: {name: "joe"}}, root, visited);

      expect(Nox.Traverse.traverse).toHaveBeenCalledWith({name: "joe"}, root, visited);

      // do not traverse null values
      Nox.Traverse.traverse.reset();
      Nox.Traverse.traverseObject({name: null}, root, visited);
      
      expect(Nox.Traverse.traverse).not.toHaveBeenCalled();

      // do not traverse non-objects
      Nox.Traverse.traverse.reset();        
      Nox.Traverse.traverseObject({name: ""}, root, visited);
      
      expect(Nox.Traverse.traverse).not.toHaveBeenCalled();

      // do not traverse nox object
      Nox.Traverse.traverse.reset();        
      Nox.Traverse.traverseObject({nox: {watches: []}}, root, visited);
      
      expect(Nox.Traverse.traverse).not.toHaveBeenCalled();

      // do not traverse date object
      Nox.Traverse.traverse.reset();
      Nox.Traverse.traverseObject({date: new Date()}, root, visited);
      
      expect(Nox.Traverse.traverse).not.toHaveBeenCalled();
    });
  });

  describe("Scope", function(){

    it("new Scope", function(){
      var selector = $("<div></div>")[0],
          fun = jasmine.createSpy("scope fun"),
          parentScope = {},
          args = [100];

      spyOn(Nox.Resolve, "resolveVariables");

      var scope = new Nox.Scope(selector, fun, parentScope, args);

      // attribute references
      expect(scope.selector).toBe(selector);
      expect(scope.parentScope).toBe(parentScope);

      // initialized attributes
      expect(scope.childScopes).toEqual([]);
      expect(scope.model).toEqual({});
      expect(scope.watches).toEqual([]);
      expect(scope.resolves).toEqual([]);
      expect(scope.isReleased).toBe(false);
      
      expect(fun).toHaveBeenCalledWith(scope.model, 100);

      expect(Nox.Resolve.resolveVariables).toHaveBeenCalledWith(scope, selector, scope.resolves);
    });

    it("rootScope", function(){
      var scope = new Nox.Scope("<div></div>", null, null),
          scope2 = new Nox.Scope("<div></div>", null, scope);

      expect(scope.rootScope()).toBe(scope);
      expect(scope2.rootScope()).toBe(scope);
    });

    it("$", function(){
      var $selector = $("<div><p></p></div>"),
          scope = new Nox.Scope($selector, null, null);
      
      expect(scope.$("p").parent().html().toLowerCase()).toBe("<p></p>");
    });

    it("update", function(){
      var scope = new Nox.Scope("<div></div>");

      scope.childScopes.push({update: jasmine.createSpy("update")})

      spyOn(Nox.Traverse, "traverse");

      var res = scope.update();
      expect(Nox.Traverse.traverse).toHaveBeenCalledWith(scope.model);
      expect(scope.childScopes[0].update).toHaveBeenCalledWith();
      expect(res).toBe(scope);
    });

    it("watch", function(){
      var scope = new Nox.Scope("<div></div>"),
          obj = {},
          field = "field",
          fun = (function(){}),
          fakeWatch = {};
      
      spyOn(Nox, "watch").andReturn(fakeWatch);
      spyOn(_, "bind").andReturn(fun);

      var res = scope.watch(obj, field, fun);

      expect(Nox.watch).toHaveBeenCalledWith(obj, field, fun);
      expect(scope.watches).toEqual([fakeWatch]);
      expect(res).toBe(scope);
    });

    describe("release", function(){
      it("release itself", function(){
        var scope = new Nox.Scope("<div></div>");
        scope.release();

        expect(scope.isReleased).toBe(true);
        expect(scope.selector).toBe(null);
        expect(scope.childScopes).toBe(null);
        expect(scope.parentScope).toBe(null);
        expect(scope.model).toBe(null);
        expect(scope.watches).toBe(null);
        expect(scope.resolves).toBe(null);
      });

      it("release own children", function(){
        var scope = new Nox.Scope("<div></div>"),
            childScopes = scope.childScopes;

        childScopes.push({release: jasmine.createSpy("child release")});

        scope.release();

        expect(childScopes[0].release).toHaveBeenCalled();
      });

      it("remove from parent", function(){
        var parentScope = {childScopes: []},
            scope = new Nox.Scope("<div></div>", null, parentScope);

        parentScope.childScopes.push(scope);

        scope.release();

        expect(parentScope.childScopes).toEqual([]);
      });
    });

    it("scope", function(){
      var scope = new Nox.Scope("<div><p></p></div>"),
          fun = jasmine.createSpy("scope fun"),
          args = [100];

      var res = scope.scope("p", fun, args);

      expect(scope.childScopes.length).toBe(1);
      expect(fun).toHaveBeenCalledWith(scope.childScopes[0].model, 100);
      expect(res).toBe(scope);
    });

    it("on", function(){
      var selector = $("<div><p></p></div>"),
          scope = new Nox.Scope(selector),
          fun = jasmine.createSpy("on click fun");

      var res = scope.on("p", "click", fun);

      var rootScope = scope.rootScope();
      spyOn(rootScope, "update");

      selector.find("p").trigger("click");

      expect(fun).toHaveBeenCalled();
      expect(rootScope.update).toHaveBeenCalled();
      expect(res).toBe(scope);
    });

    it("resolve", function(){
      var scope = new Nox.Scope("<div></div>");
      scope.resolve("name", {}, "username");
      expect(scope.resolves).toEqual([["name", {}, "username"]]);
    });

    describe("Resolve", function(){
      it("resolveVariables", function(){
        var $el = $("<div>{{name}}</div>"),
            scope = {watches: []};
        
        Nox.Resolve.resolveVariables(scope, $el, [["name", {name: "joe"}, "name"]]);
        
        expect($el.html()).toBe("joe");
        expect(scope.watches.length).toBe(1);
        expect(_.omit(scope.watches[0].obj, "nox")).toEqual({name: "joe"});
        expect(scope.watches[0].field).toEqual("name");
      });

      it("findTextNodesWithVariable", function(){
        var res = Nox.Resolve.findTextNodesWithVariable($("<div>{{name}}</div>"));
        expect(res.length).toBe(1);
        expect(res[0].nodeValue).toBe("{{name}}");

        res = Nox.Resolve.findTextNodesWithVariable($("<div>{{name}} and {{age}}</div>"));
        expect(res.length).toBe(1);
        expect(res[0].nodeValue).toBe("{{name}} and {{age}}");

        res = Nox.Resolve.findTextNodesWithVariable($("<div>{{name}} and <span>{{age}}</span></div>"));
        expect(res.length).toBe(2);
        expect(res[0].nodeValue).toBe("{{name}} and ");
        expect(res[1].nodeValue).toBe("{{age}}");
      });

    });

    describe("Bindings", function(){

      it("text", function(){
        var $el = $("<div><span></span></div>");
        var scope = new Nox.Scope($el, function(model){
          model.name = "joe";

          this.text("span", model, "name");
        });

        expect($el.html().toLowerCase()).toBe("<span>joe</span>");

        scope.model.name = "bob";
        scope.update();

        expect($el.html().toLowerCase()).toBe("<span>bob</span>");
      });

      it("value", function(){
        var $el = $("<div><input type='text'/></div>");
        var scope = new Nox.Scope($el, function(model){
          model.name = "joe";

          this.value("input", model, "name");
        });

        var $input = $el.find("input");

        expect($input.val()).toBe("joe");

        scope.model.name = "bob";
        scope.update();

        expect($input.val()).toBe("bob");

        $input.val("joe");
        $input.trigger("change");

        expect(scope.model.name).toBe("joe");
      });

      it("loop", function(){
        var $el = $("<div><ul><li><span></span></li></ul></div>");
        var scope = new Nox.Scope($el, function(model){
          model.entries = [
            {title: "Entry 1"},
            {title: "Entry 2"}
          ];

          this.loop("ul", model, "entries", function(entryModel, entry){
            this.text("span", entry, "title");
          });
        });

        expect($el.find("ul").html().replace(/\s/g, "").toLowerCase()).toBe("<li><span>Entry 1</span></li><li><span>Entry 2</span></li>".replace(/\s/g, "").toLowerCase());

        scope.model.entries.push({title: "Entry 3"});
        scope.update();

        expect($el.find("ul").html().replace(/\s/g, "").toLowerCase()).toBe("<li><span>Entry 1</span></li><li><span>Entry 2</span></li><li><span>Entry 3</span></li>".replace(/\s/g, "").toLowerCase());

        scope.model.entries = [{title: "Entry 1"}];
        scope.update();

        expect($el.find("ul").html().replace(/\s/g, "").toLowerCase()).toBe("<li><span>Entry 1</span></li>".replace(/\s/g, "").toLowerCase());


        // parent of LI should be UL
        expect($($el.find("li")[0]).parent()[0]).toBe($el.find("ul")[0]);
      });

      it("clazz", function(){
        var $el = $("<div><span></span></div>");
        var scope = new Nox.Scope($el, function(model){
          model.name = "joe";

          this.clazz("span", model, "this.name.length > 3", "myClass");
        });

        expect($el.find("span").hasClass("myClass")).toBe(false);

        scope.model.name = "joe!!!";
        scope.update();

        expect($el.find("span").hasClass("myClass")).toBe(true);

        scope.model.name = "joe";
        scope.update();

        expect($el.find("span").hasClass("myClass")).toBe(false);
      });

      it("error", function(){
        var $el = $("<div><span></span></div>");
        var scope = new Nox.Scope($el, function(model){
          model.error = {};
          this.error("span", model, "name");
        });

        expect($el.find("span").hasClass("error")).toBe(false);

        scope.model.error.name = "mandatory";
        scope.update();

        expect($el.find("span").hasClass("error")).toBe(true);

        scope.model.error.name = null;
        scope.update();

        expect($el.find("span").hasClass("error")).toBe(false);
      });

      it("attr", function(){
        var $el = $("<div><img src=''/></div>");
        var scope = new Nox.Scope($el, function(model){
          model.url = "/img.png";
          this.attr("img", model, "url", "src");
        });

        expect($el.find("img").attr("src")).toBe("/img.png");

        scope.model.url = null
        scope.update();

        expect($el.find("img").attr("src")).toBeUndefined();
      });

      it("check", function(){
        var $el = $("<div><input type='checkbox'/></div>");
        var scope = new Nox.Scope($el, function(model){
          model.done = true;
          this.check("input", model, "done");
        });

        var $input = $el.find("input");

        expect($input.is(":checked")).toBe(true);

        scope.model.done = false;
        scope.update();

        expect($input.is(":checked")).toBe(false);

        $input.prop("checked", true);
        $input.trigger("change");

        expect(scope.model.done).toBe(true);

        $input.removeAttr("checked");
        $input.trigger("change");

        expect(scope.model.done).toBe(false);
      });

      it("radioset", function(){
        var $el = $("<div><div class='radioset'/></div>"),
            entries = [
              "entry1",
              "entry2"
            ];

        var scope = new Nox.Scope($el, function(model){
          model.entry = null;
          this.radioset(".radioset", model, "entry", {entries: entries});
        });

        $div = $el.find(".radioset");

        expect($div.children().length).toBe(2);
        expect($($div.children()[0]).is(":checked")).toBe(false);
        expect($($div.children()[1]).is(":checked")).toBe(false);

        scope.model.entry = "entry1";
        scope.update();

        expect($($div.children()[0]).is(":checked")).toBe(true);
        expect($($div.children()[1]).is(":checked")).toBe(false);

        scope.model.entry = "entry2";
        scope.update();

        expect($($div.children()[0]).is(":checked")).toBe(false);
        expect($($div.children()[1]).is(":checked")).toBe(true);

        $($div.children()[0]).prop("checked", true);
        $($div.children()[0]).trigger("change");

        expect($($div.children()[0]).is(":checked")).toBe(true);
        expect($($div.children()[1]).is(":checked")).toBe(false);
      });

      it("select", function(){
        var $el = $("<div><select/></div>"),
            entries = [
              "entry1",
              "entry2"
            ];

        var scope = new Nox.Scope($el, function(model){
          model.entry = null;
          this.select("select", model, "entry", {entries: entries});
        });

        $select = $el.find("select");

        expect($select.children().length).toBe(3);
        expect($select.attr("multiple")).toBeUndefined();
        expect($($select.children()[0]).html()).toBe("please choose");
        expect($($select.children()[0]).is(":checked")).toBe(true);

        scope.model.entry = "entry1";
        scope.update();

        expect($($select.children()[1]).is(":checked")).toBe(true);

        $($select.children()[0]).attr("selected", "selected");
        $select.trigger("change");

        expect(scope.model.entry).toBe(null);

        $($select.children()[2]).attr("selected", "selected");
        $select.trigger("change");

        expect(scope.model.entry).toBe("entry2");
      });

      it("select multiple", function(){
        var $el = $("<div><select/></div>"),
            entries = [
              "entry1",
              "entry2"
            ];

        var scope = new Nox.Scope($el, function(model){
          model.entry = [];
          this.select("select", model, "entry", {entries: entries, multiple: true});
        });

        $select = $el.find("select");

        expect($select.children().length).toBe(2);
        expect($select.attr("multiple")).toBe("multiple");

        scope.model.entry = ["entry1", "entry2"];
        scope.update();

        expect($($select.children()[0]).is(":checked")).toBe(true);
        expect($($select.children()[1]).is(":checked")).toBe(true);

        scope.model.entry = [];
        scope.update();

        expect($($select.children()[0]).is(":checked")).toBe(false);
        expect($($select.children()[1]).is(":checked")).toBe(false);

        $select.children().attr("selected", "selected");
        $select.trigger("change");

        expect(scope.model.entry).toEqual(["entry1", "entry2"]);
      });

      it("date", function(){
        var $el = $("<div><div class='date'/></div>");

        var scope = new Nox.Scope($el, function(model){
          model.date = null;
          this.date(".date", model, "date");
        });

        $div = $el.find(".date");

        expect($div.find(".day option:selected").html()).toBe("please choose");
        expect($div.find(".month option:selected").html()).toBe("please choose");
        expect($div.find(".year option:selected").html()).toBe("please choose");

        var now = moment();

        scope.model.date = now.toDate();
        scope.update();

        expect($div.find(".day option:selected").val()).toBe(now.date().toString());
        expect($div.find(".month option:selected").val()).toBe(now.month().toString());
        expect($div.find(".year option:selected").val()).toBe(now.year().toString());

        $div.find(".day option[value='1']").attr("selected", "selected");
        $div.find(".month option[value='0']").attr("selected", "selected");
        $div.find(".year option[value='2010']").attr("selected", "selected");
        
        $div.find("select").trigger("change");

        expect(moment(scope.model.date).format("YYYY-MM-DD")).toBe("2010-01-01");

        $div.find(".day option[value='']").attr("selected", "selected");
        $div.find("select").trigger("change");

        expect(scope.model.date).toBe(null);
      });

    });
  });


});