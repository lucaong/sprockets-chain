# SprocketsChain (experimental)

`SprocketsChain` parses sprockets directives and returns the dependency chain, which is an ordered list of file paths where each file appears after all its dependencies.

## Why:

In some situations (e.g. JavaScript tests) precompiling assets is slow and actually not needed.
It is more efficient to just require separate JavaScript/CoffeeScript assets in the correct order, and `SprocketsChain`
is parsing require directives to provide you with the correct ordered list of file paths.

## Usage:

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

## Supported Sprockets directives:

`require`, `require_self`, `require_directory`, `require_tree`, `include`
