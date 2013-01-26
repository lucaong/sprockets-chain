module.exports = (function() {

  var Trail    = require("hike").Trail,
      Resource = require("./sprockets_chain/resource");

  var SprocketsChain = function( root, options ) {
    options = options || {};
    this._trail = new Trail( root || "." );
    this._trail.extensions.append(".js", ".coffee");
  };

  SprocketsChain.Resource = Resource;

  SprocketsChain.prototype = {

    appendPath: function( path ) {
      this._trail.paths.append( path );
    },

    depTree: function( file_path ) {
      var resource = this.resource( file_path );
      return resource.depTree();
    },

    depChain: function( file_path ) {
      var tree = this.resource().depTree( file_path );
      return tree.depChain();
    },

    resource: function( logical_path ) {
      return new SprocketsChain.Resource( logical_path, this._trail );
    }

  };

  return SprocketsChain;

})();
