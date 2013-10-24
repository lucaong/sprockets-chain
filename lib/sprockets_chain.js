module.exports = (function() {

  var Trail    = require("hike").Trail,
      Resource = require("./sprockets_chain/resource");

  var SprocketsChain = function( root, options ) {
    options = options || {};
    this._trail = new Trail( root || "." );
    this._trail.extensions.append( [ ".js", ".coffee", ".litcoffee" ] );
  };

  SprocketsChain.Resource = Resource;

  SprocketsChain.prototype = {

    // Append path to the load path
    appendPath: function( path ) {
      this._trail.paths.append( path );
    },

    // Append extensions to the list of supported extensions
    appendExtensions: function() {
      var args = Array.prototype.slice.call( arguments );
      this._trail.extensions.append( args );
    },

    // Prepend path to the load path
    prependPath: function( path ) {
      this._trail.paths.prepend( path );
    },

    // Prepend extensions to the list of supported extensions
    prependExtensions: function() {
      var args = Array.prototype.slice.call( arguments );
      this._trail.extensions.prepend( args );
    },

    // Build and return the dependency tree of a given resource (specified by its logical path)
    depTree: function( file_path ) {
      var resource = this.resource( file_path );
      return resource.depTree();
    },

    // Build and return the dependency chain of a given resource (specified by its logical path)
    depChain: function( file_path ) {
      var tree = this.depTree( file_path );
      return tree.depChain();
    },

    // Create and return a new SprocketsChain.Resource object for the given logical path
    resource: function( logical_path ) {
      return new SprocketsChain.Resource( logical_path, this._trail );
    }

  };

  return SprocketsChain;

})();
