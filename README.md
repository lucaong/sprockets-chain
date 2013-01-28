# SprocketsChain (experimental)

`SprocketsChain` is a node.js utility that parses `Sprockets` require directives and returns the dependency chain for
a JavaScript bundle, which is a list of the file paths that make the bundle, ordered so that each file is preceded by
all its dependencies.

## Why

`Sprockets` is very nice for managing assets and their dependencies in a Ruby project. When testing JavaScript though,
a precompilation step would be slow and actually not needed. It is more efficient to just require the separate
JavaScript/CoffeeScript files in the correct order, and `SprocketsChain` is parsing the require directives to provide
you with the correct ordered list of file paths. This helps setting up a JavaScript test suite that is fast and
completely independent from the Ruby application environment.

## Usage

```javascript
var SprocketsChain = require("sprockets-chain");

var sc = new SprocketsChain();

// Append paths to the list of load paths
sc.appendPath("app/assets/javascript");
sc.appendPath("lib/assets/javascript");
sc.appendPath("vendor/assets/jquery");

// If necessary, append extensions (defaults are ".js", ".coffee")
sc.appendExtensions(".ejs", ".eco");

// Get ordered array of individual absolute file paths that compose the
// `application.js` bundle
var chain = sc.depChain("application.js");
```

## Supported Sprockets directives

The following `Sprockets` directive are supported: `require`, `require_self`, `require_directory`, `require_tree`
and `include`

## MIT License

Copyright (c) 2013 Luca Ongaro

MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
