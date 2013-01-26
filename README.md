# SprocketsChain

This is an experiment. The aim is to parse sprocket includes and return the dependency chain, which is an ordered list of file paths where each file appears after all its dependencies.

## Usage:

```javascript
var SprocketsChain = require("sprockets-chain");

var sc = new SprocketsChain();

// Append paths to the list of load paths
sc.appendPath("app/assets/javascript");
sc.appendPath("lib/assets/javascript");
sc.appendPath("vendor/assets/jquery")

var chain = sc.depChain("application.js"); // Returns ordered array of absolute file paths in the application.js bundle
```
