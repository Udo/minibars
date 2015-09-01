# Minibars JavaScript Templating Library

<img src="https://github.com/Udo/minibars/blob/master/assets/minibar-logo.png?raw=true" align="right"/>Minibars is a small, light-weight alternative to the more fully-featured Handlebars (http://handlebarsjs.com/) templating engine. It's non-minified code is just about 8kb in size, which makes it a viable alternative where code size is an issue and not all of Handlebars' features are required.

I designed Minibars to be a minimally viable drop-in replacement for Handlebars in _my_ daily usage - your mileage will probably vary. Minibars does not offer any of the following advanced features: template comments (you can still use HTML comments), the Handblebars API, the same helper function signature, partials, and there are some differences in variable scoping behavior. However, simple Handlebars templates should compile without changes under Minibars.

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
		email : 'udo.schroeter@gmail.com'
	}
}
```

In these cases, you can use the dot notation to access lower levels of the data inside your template:

```html
  <div>
    <h1>{{title}}</h1>
    <div>
      {{body}}
    </div>
    <div class="meta">
      published: {{meta.published}}
      by: <a href="mailto:{{meta.email}}">{{meta.author}}</a>     
    </div>
  </div>
```
	
# Block Commands

## if Block

To conditionally render a block of HTML, use the `{#if fieldName}` command:

```html
  <div>
    <h1>{{title}}</h1>
    {{#if body}}<div>
      {{body}}
    </div>{{/if}}
  </div>
```

You can also optionally define an `{{else}}` section that will get rendered if the condition is not true:
	
```html
  <div>
    <h1>{{title}}</h1>
    {{#if body}}<div>
      {{body}}
    </div>
    {{else}}
    No content!    
    {{/if}}
  </div>
```

## unless Block

The `{{#unless fieldName}}` block functions exactly like `{{#if}}`, but inverse: the block gets rendered if `fieldName` is undefined.
	
## each Block

To render a block for each item in an array, use the `{{#each listName}}` command:
	
```html
  <ul>
    {{#each items}}<div>
      {{@index}}: {{text}}
    </div>{{/each}}
  </ul>
```

where the data might look like this:

```javascript
{
  items : [
    { text : 'example 1' },
    { text : 'example 2' },
    { text : 'example 3' },
  ]
}
```

You can use the `{{else}}` block in conjunction with {{#each}} (see the `if` block documentation for usage information).

### Binding Custom Variables

Like most blocks, the `{{#each}}` block supports binding custom variables to the referenced container object. This is done by appending a pipe symbol (`|`) and the custom field name to the command. In the example above, we might do this:

```html
  <ul>
    {{#each items | myItem myIndex }}<div>
      {{@myIndex}}: {{@myItem}}
    </div>{{/each}}
  </ul>
```

After defining them, the variables can be referenced by prefixing their names with an at symbol (`@`), as shown.

_Notice: this uses a slightly different syntax than Handlebars does when declaring the custom variables. Also, note that the variables have to be prefixed with an @ symbol when used. It is not necessary to use the dot prefix notation in order to access an outer custom variable._

## properties Block

To render a block for each item in an object (not an array), use the `{{#properties objectName}}` command:
	
```html
  <ul>
    {{#properties meta}}<div>
      {{@key}}: {{this}}
    </div>{{/properties}}
  </ul>
```

where the data might look like this:

```javascript
{
	meta : {
		published : '2015-08-31',
		author : 'udo',
		email : 'udo.schroeter@gmail.com'
	}
}
```

You can use the `{{else}}` block in conjunction with {{#properties}} (see the `if` block documentation for usage information).

_Notice: this is different from Handlebars.js which doesn't distinguish between arrays and objects - but Minibars does!_

## with Block

Using the `{{#with fieldName}}` command, you can change the reference of the current scope object.

```html
  <div>
    {{#with article}}
      <h1>{{title}}</h1>
      <div>
        {{body}}
      </div>
    {{/with}}
  </div>
```

where the data might look like this:
	
```javascript
{
	category : 'misc',
	article : {
		title : 'Hello World',
		body : '<Greetings from Minibars!>',
	}
}
```
 
### Addressing Parent Contexts

Inside block commands, the context of the data object changes to whatever the block is rendering. For example, within the `{{#with fieldName}}` block, the field `fieldName` becomes the local root object.

But it is still possible to access fields from outer contexts, using the dot prefix notation:

```html
  <div>
    {{#with article}}
      <h1>{{title}}</h1>
      <div>
        {{body}} from: {{..category}}
      </div>
    {{/with}}
  </div>
```

### The `this` keyword

Minibars interprets the word `this` as a field name referencing the current data context. Otherwise, `this` has no special meaning in Minibars and is not used inside helper functions.

### Circumventing Name Collisions

Handlebars uses the same notation for field names and commands, and Minibars - striving for limited drop-in compatibility - replicates this behavior. For example, if your data contains a field named "else", it will collide with the `{{else}}` command.
	
Minibars will always choose the name of a command over the name of a field when resolving this. To properly address a susceptible field, prefix its name with a dot character (`.`): `{{.else}}`

## log Helper

For debugging, it might be helpful to use the `{{log fieldName}}` command, which prints the referenced field into the browser's console.

# Compile Time Options

## Remove Whitespace

Minibars will remove the whitespace from rendered components if a template is compiled with the `trim` option: 

```javascript
  const temp1 = Minibars.compile(myTemplateString, { trim : true });
```
	
# Customizing Minibars

To extend the functionality of Minibars, you can introduce your own helper callbacks by appending functions to the `Minibars.helpers` object.

For reference, the helpers object already contains an example helper, called "trim", which removes superfluous whitespace from content:

```
Minibars.helpers.trim = function(val, container, fieldName, rootContext) {
  return(val.trim());
}
```

While commands like `{{#each}}` are incorporated into the template function at compile time, helpers are merely referenced and actually executed at run time as the template is being rendered.

However, a helper must still be defined before compilation, since Minibars will be resolving its name at that point. If it's not present, Minibars will assume it's referencing a data field instead.