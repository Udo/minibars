# Minibars JavaScript Templating Library

Minibars is a small, light-weight alternative to the more fully-featured Handlebars (http://handlebarsjs.com/) templating engine. It's non-minified code is just about 8kb in size, which makes it a viable alternative where code size is an issue and not all of Handlebars' features are required.

I designed Minibars to be a drop-in replacement for Handlebars in my daily usage - your mileage will probably vary.

# Getting Started

Minibars templates are strings. For convenience, they can be defined and embedded in `<script>` tags:

```html
<script id="entry-template" type="text/x-minibars-template">
  <div>
    <h1>{{title}}</h1>
    <div>
      {{body}}
    </div>
  </div>
</script>
```

If you're re-using existing Handlebars templates in this way, you can leave the type attribute as-is (which is most likely "text/x-handlebars-template").

Before you can use the template, it needs to be compiled. For example, using jQuery to fetch the content of the template string, it might look like this:

```javascript
const myTemplate = Minibars.compile(
    $('#entry-template').html());
```
  
Due to compilation, the template `myTemplate` becomes a simple function you can call, passing an arbitrary data object as an argument. 

```javascript
$('#entries').append(myTemplate({
    title : 'Hello World!',
    body : '<Greetings from Minibars!>',
    }));
```

The Minibars template function then generates HTML code from that data:

```html
  <div>
    <h1>Hello World</h1>
    <div>
      &lt;Greetings from Minibars!&gt;
    </div>
  </div>
```
  
# Data Fields

Fundamentally, Minibars fills fields from your data object into placeholders assigned for them inside the template. The example above illustrates a simple case. By default, all content is escaped for HTML code, meaning that the data will be seen as plain text by the browser.

## Safe HTML Escaping

In the example above, the field `{{body}}`, combined with the data string `'<Greetings from Minibars!>'` results in the output:
	
```
  &lt;Greetings from Minibars!&gt;
```

## Raw Output

If you need un-escaped HTML code from the data object in your result, you can instead use the three-bracket notation: `{{{body}}}`, resulting in this (rather unsafe output):

```
  <Greetings from Minibars!>
```

## Accessing Sub Fields

Assuming you have a complex data object like this one:

```javascript
{
	title : 'Hello World',
	body : '<Greetings from Minibars!>',
	meta : {
		published : '2015-08-31',
		author : 'udo',
		email : 'udo.schroeter@gmail.com'	}}
```

In these cases, you can use the dot notation to access lower levels of the data inside your template:

```html
  <div>
    <h1>{{title}}</h1>
    <div>
      {{body}}
    </div>
    <div class="meta">      published: {{meta.published}}
      by: <a href="mailto:{{meta.email}}">{{meta.author}}</a>     
    </div>
  </div>
```
	
