module.exports = (function() {

  var _path = require("path"),
      _fs   = require("fs");

  // Return true if array contains item
  function contains( array, item ) {
    return array.indexOf( item ) >= 0;
  }

  // Return true if given path is relative
  function isRelative( path ) {
    return path.match(/^\.($|\.?\/)/) !== null;
  }

  // Return the full path given a logical path
  function fullPath( logical_path, trail ) {
    var full_path = trail.find( logical_path );
    if ( full_path == null ) {
      throw new Error(
        "Logical path " + logical_path +
        " does not correspond to any file (valid extensions: " +
        trail.extensions.toArray().join(", ") + ")"
      );
    }
    return full_path;
  }
  
  function normalizePath( path ){
    return path.replace(/\\/g, '/');
  }

  // Resource constructor
  var Resource = function Resource() {
    this.initialize.apply( this, arguments );
  };

  // Resource instance methods
  Resource.prototype = {

    initialize: function( path, trail ) {
      this._trail       = trail;
      this.full_path    = fullPath( path, trail );

      // Add extension to logical path
      var split         = normalizePath( this.full_path ).split( path );
      this.logical_path = path + split[ split.length - 1 ];
    },

    // Resolve a path relative to this resource to a logical path
    resolve: function( path ) {
      if ( isRelative( path ) ) {
        var dir = _path.dirname( this.logical_path );
        return normalizePath( _path.join( dir, path ) );
      }
      return path;
    },

    // Return the file content of this resource
    content: function() {
      var full_path = this.full_path;

      return _fs.readFileSync( this.full_path );
    },

    // Return an array of all the Sprockets require directives in this resource
    parseRequires: function() {
      var header, match,
          results           = [],
          HEADER_PATTERN    = new RegExp(
          '^(?:\\s*' +
            '(' +
              '(?:\/[*](?:\\s*|.+?)*?[*]\/)' + '|' +
              '(?:\/\/.*\n?)+' + '|' +
              '(?:#.*\n?)+' +
            ')*' +
          ')*', 'm'),
          DIRECTIVE_PATTERN = new RegExp('^\\W*=\\s*(\\w+.*?)(\\*\\/)?$');

      header = (HEADER_PATTERN.exec( this.content() ) || []).shift() || '';

      header.split(/\r?\n/).forEach( function( line ) {
        if ( match = DIRECTIVE_PATTERN.exec( line ) ) {
          results.push( match[1].trim() );
        }
      });

      return results;
    },

    // Return an array of dependencies for this resource, each represented by
    // an object like: { path: logical_path, directive: require_directive }
    parseDeps: function() {
      var requires = this.parseRequires(),
          deps     = [],
          self     = this;

      requires.forEach(function( r ) {
        var a         = r.match(/(\w+)(?:\s+(["']?)(.*)\2)?/),
            directive = a[1],
            required  = a[3];

        switch( directive ) {
          case "require":
          case "include":
            deps.push({
              directive: directive,
              path:      self.resolve( required )
            });
            break;
          case "require_self":
            deps.push({
              directive: directive,
              path:      self.logical_path
            });
            break;
          case "require_directory":
            if ( !isRelative( required ) ) {
              throw new Error("require_directory argument must be a relative path")
            }
            self.pathsInDir( required ).forEach(function( p ) {
              deps.push({
                directive: directive,
                path:      p
              });
            });
            break;
          case "require_tree":
            if ( !isRelative( required ) ) {
              throw new Error("require_tree argument must be a relative path")
            }
            self.pathsInTree( required ).forEach(function( p ) {
              deps.push({
                directive: directive,
                path:      p
              });
            });
        }
      });

      return deps;
    },

    // Return an array of logical paths of all the files in a directory,
    // specified by its path relative to this resource
    pathsInDir: function( dir ) {
      var self_dir = _path.dirname( this.logical_path ),
          full_dir = _path.join( _path.dirname( this.full_path ), dir ),
          entries  = this._trail.entries( full_dir ),
          paths    = [];

      entries.forEach(function( e ) {
        if ( _fs.statSync( _path.join( full_dir, e ) ).isFile() ) {
          paths.push( normalizePath( _path.join( self_dir, dir, e ) ) );
        }
      });

      return paths;
    },

    // Return an array of logical paths of all the files in a directory tree,
    // specified by its path relative to this resource
    pathsInTree: function( dir ) {
      var self_dir = _path.dirname( this.logical_path ),
          full_dir = _path.join( _path.dirname( this.full_path ), dir ),
          entries  = this._trail.entries( full_dir ),
          paths    = [],
          self     = this;

      entries.forEach(function( e ) {
        if ( _fs.statSync( _path.join( full_dir, e ) ).isFile() ) {
          paths.push( normalizePath( _path.join( self_dir, dir, e ) ) );
        } else {
          paths = paths.concat( self.pathsInTree( _path.join( dir, e ) ) );
        }
      });

      return paths;
    },

    // Build and return the dependency tree of this resource
    depTree: function() {
      var deps = this.parseDeps(),
          self = this;

      self.dependencies = [];

      deps.forEach(function( d ) {
        var res = new Resource( d.path, self._trail );

        res.require_directive = d.directive;

        if ( res.full_path !== self.full_path ) {
          res.depTree();
        }
        self.dependencies.push( res );
      });

      return self;
    },

    // Return the dependency chain of this resource, which is an array of the
    // file paths of all the dependency of this resource plus this resource
    // itself, ordered so that every file is preceded by all its dependencies.
    depChain: function( already_added ) {
      var deps  = this.depTree().dependencies,
          chain = [];

      if ( !Array.isArray( already_added ) ) {
        already_added = [];
      }

      if ( this.require_directive !== "include" && contains( already_added, this.full_path ) ) {
        return [];
      }

      if ( this.require_directive !== "require_self" ) {
        deps.forEach(function( d ) {
          chain = chain.concat( d.depChain( chain.slice() ) );
        });
      }

      if ( this.require_directive === "include" || !contains( chain, this.full_path ) ) {
        chain.push( this.full_path );
      }

      return chain;
    }

  };

  return Resource;

})();
