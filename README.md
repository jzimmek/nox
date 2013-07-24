# Nox

Nox is a client-side library focusing on two way data-binding while leveraging exiting libraries, known concepts and patterns.

## Building Blocks

The building blocks in Nox are "Scope" and "Watch".

### Scope

A scope in Nox is a combination of an CSS selector and a javascript object model. The lifecyclye of the CSS selector and object model are tightly coupled. Removing the CSS selector elemets will destroy the object model and vice versa.

#### Hello World

		$(function(){
		  new Nox.Scope(document, function(model){
		  	model.username = "joe";

		  	this.text("span", model, "username");
		  })
		})

		...

		<body>
			hello <span>username</span>
		</body>


### Watch

A watch can be applied to a javascript object and is a function which will be invokes, whenever object is modified. You can register either a field of the object or an arbitrary expression as trigger.

Having a user object like:

		var user = {
		  email: "mail@domain"
		};

Let us watch for the "email" field:

		Nox.watch(user, "email", function(newValue){
		  // invoked whenever "email" field changed
		});

Or an expression:

		Nox.watch(user, "this.email.length > 10", function(newValue){
		  // invoked whenever result of this.email.length > 10 changed
		});


## Credits

The author has been inspired by great frameworks/libraries like Knockout, Ember, Backbone and Angular.

## License

Nox is released under the <a href="http://www.opensource.org/licenses/MIT" target="_blank">MIT License</a>.

## Support

If you need help using Nox, or have found a bug, please create an issue on the <a href="https://github.com/jzimmek/nox/issues" target="_blank">GitHub repo</a>.