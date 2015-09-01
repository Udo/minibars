# Minibars JavaScript Templating Library

Minibars is a small, light-weight alternative to the more fully-featured Handlebars (http://handlebarsjs.com/) templating engine. It's non-minified code is just about 8kb in size, which makes it a viable alternative where code size is an issue and not all of Handlebars' features are required.

I designed Minibars to be a drop-in replacement for Handlebars in my daily usage - your mileage will probably vary.

# Getting Started

Minibars templates are strings. For convenience, they can be defined and embedded in <script> tags:
```<script id="entry-template" type="text/x-minibars-template">
  <div>
    <h1>{{title}}</h1>
    <div>
      {{body}}
    </div>
  </div>
</script>```

If you're re-using existing Handlebars templates in this way, you can leave the type attribute as-is (which is most likely "text/x-handlebars-template").

Before you can use the template, it needs to be compiled. For example, using jQuery to fetch the content of the template string, it might look like this:

```const myTemplate = Minibars.compile(
    $('#entry-template').html());```
  
Due to compilation, the template `myTemplate` becomes a simple function you can call, passing an arbitrary data object as an argument. 

```$('#entries').append(myTemplate({
    title : 'Hello World!',
    body : '<Greetings from Minibars!>',
    }));```

The Minibars template function then generates HTML code from that data:

```<div>
    <h1>Hello World</h1>
    <div>
      &lt;Greetings from Minibars!&gt;
    </div>
  </div>```
  
