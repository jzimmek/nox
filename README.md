# About

Nox is a small javascript library focusing on two way data-binding. Comes with a bunch of examples and specs. Is heavily inspired by the mvvm design pattern and great libraries like backbone, ember, knockout and angular. Stands on the shoulders of giants like jquery and underscore.

## Philosophy in a nutshell:

- focus on two way data-binding
- use dom for templating
- keep the codebase small
- think pragmatic and be just good enough

## Hello World:

    <script type="text/javascript">
    Nox.initAndUpdateBindings({name: "joe"});
    </script>

    <span>Hello {{this.name}}</span>

    <input type="text" data-value="this.name"/>

## Building Blocks overview:

Nox is all about bindings. Bindings are usual javascript expressions against your object model which can be attached to nodes on you dom. Bindings will be executed whenever your model value changes and on user input. Actually 3 binding types are supported: text, attribute and element.

### Text:

The "text" binding is an expression in curly brackets and can be used anywhere in your dom where you would use normal text instead.

Example:

    <span>{{this.name}}</span>

### Attribute:

The "attribute" binding is an expression in curly brackets (exactly like the "text" binding) and can be used in attribute values in your dom.

Example: 

    <span class="hightlight-{{true}}">hello world</span>

### Element:

The "element" binding is the most powerful and mostly used one. You can attach one or multiple of these bindings to any element in your dom. Element bindings are attached by using the data-* attribute. The syntax is data-<bindingName>.

Example: 

    <span data-text="this.name"></span>

# License

Nox is released under the [MIT License](http://www.opensource.org/licenses/MIT).