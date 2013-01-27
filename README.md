# SprocketsChain (experimental)

`SprocketsChain` parses sprocket includes and returns the dependency chain, which is an ordered list of file paths where each file appears after all its dependencies.

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

## Supported directives:

`require`, `require_self`, `require_dir`, `require_tree`
