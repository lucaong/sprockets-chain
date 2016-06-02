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

  // Some libraries have './somepath' as their main path
  function cleanUpPath( path ) {
    return path.replace( /\/\./gi, '' ).replace( /\/\//gi, '' );
  }

  // Return the full path given a logical path
  function fullPath( logical_path, trail ) {
    var full_path = trail.find( logical_path );

    // Attempt to parse bower.json
    if ( full_path == null ) {
      var bower_main = null,
        temp_path = null;
      try {
        bower_main = JSON.parse(_fs.readFileSync( trail.find( logical_path + '/bower.json' )))['main']
      } catch (error) {
        // No bower.json main attribute or bower.json is unreadable or doesn't exist
        bower_main = null;
      }

      if ( bower_main != null ) {
        temp_path = logical_path + '/' + bower_main;
        temp_path = cleanUpPath( temp_path );
        full_path = trail.find( temp_path );

        if ( full_path == null ) {
          // Some libraries have an array for their main attribute
          temp_path = logical_path + '/' + bower_main[0];
          temp_path = cleanUpPath( temp_path );
          full_path = trail.find( temp_path );
        }
      }
    }

    if ( full_path == null ) {
      full_path = trail.find( logical_path + '/index' );
    }

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
  
  /*
  For the list of dependencies, `deps`, return a map of paths merged
  with parent stubs that have been stubbed out for quick lookup later.
    
  Only ancestor files can stub out children - siblings can't stub
  each other out.
  */
  function collectStubs( deps, parentStubs ){
    var stubs;
    
    if ( typeof parentStubs !== "object" ) {
      parentStubs = {};
    }
    
    // Check each directive 
    deps.forEach(function(d){
      if ( d.require_directive === "stub" ){
        if ( !stubs ){
          // Only create a new object if we have stubbed assets at this level.
          // This avoids a long prototype chain of empty objects.
          stubs = Object.create( parentStubs );
        }
        stubs[d.full_path] = true;
      }
    });
    
    // If we don't have any stubs at this level then just return `parentStubs`.
    if ( !stubs ){
      stubs = parentStubs;
    }
    
    return stubs;
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
          case "stub":
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
          paths    = [],
          self     = this;

      entries.forEach(function( e ) {
        if ( _fs.statSync( _path.join( full_dir, e ) ).isFile() ) {
          if (self._trail.extensions.toArray().indexOf(_path.extname(e)) == -1) {
            return;
          }
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
          if (self._trail.extensions.toArray().indexOf(_path.extname(e)) == -1) {
            return;
          }
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
    depChain: function( chain, parentStubs ) {
      var deps  = this.depTree().dependencies,
          stubs = collectStubs( deps, parentStubs ),
          already_added = false,
          self = this;

      if ( !Array.isArray( chain ) ) {
        chain = [];
      }
      
      function isStubbed(d){ return stubs[d.full_path] != null; }
      function isSelf(d) { return d.full_path === self.full_path }
      function addSelf() {
        if ( self.require_directive === "include" || !contains( chain, self.full_path ) ) {
          chain.push( self.full_path );
        }
      }

      deps.forEach(function( d ) {
        if (isStubbed(d)){
          // skip this resource and it's children
        } else if ( !isSelf(d) && !contains(chain, d.full_path) ) {
          d.depChain( chain, stubs );
        } else if ( d.require_directive === "include" ) {
          d.depChain( chain, stubs );
        } else if( isSelf(d) ){
          addSelf();
          already_added = true;
        }
      });

      if ( !already_added ) { addSelf() }

      return chain;
    }

  };

  return Resource;

})();
