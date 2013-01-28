module.exports = (function() {

  var _path = require("path"),
      _fs   = require("fs");

  var Resource = function( logical_path, trail ) {
    this._trail        = trail;
    this.logical_path = logical_path;
  };

  function contains( ary, item ) {
    return ary.indexOf( item ) >= 0;
  }

  function isRelative( path ) {
    return path.match(/^\.($|\.?\/)/) !== null;
  }

  function _rawDepChain( self, already_added ) {
    var deps  = self.depTree().dependencies,
        chain = [];

    already_added = already_added || [];

    if ( self.require_directive !== "include" && contains( already_added, self.fullPath() ) ) {
      return [];
    }

    if ( self.require_directive !== "require_self" ) {
      deps.forEach(function( d ) {
        _rawDepChain( d, already_added.slice() ).forEach(function( r ) {
          chain.push( r );
          already_added.push( r.fullPath() );
        });
      });
    }

    if ( self.require_directive === "include" || !contains( already_added, self.fullPath() ) ) {
      chain.push( self );
      already_added.push( self.fullPath() );
    }

    return chain;
  }

  Resource.prototype = {

    fullPath: function() {
      if ( typeof this.full_path === "undefined" ) {
        this.full_path = this._trail.find( this.logical_path );
      }
      if ( this.full_path == null ) {
        throw new Error(
          "Logical path " + this.logical_path +
          " does not correspond to any file (valid extensions: " +
          this._trail.extensions.toArray().join(", ") + ")"
        );
      }
      return this.full_path;
    },

    resolve: function( path ) {
      if ( isRelative( path ) ) {
        var dir = _path.dirname( this.logical_path );
        return _path.join( dir, path );
      }
      return path;
    },

    content: function() {
      var full_path = this.fullPath();

      return _fs.readFileSync( this.fullPath() );
    },

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

      header.split("\n").forEach( function( line ) {
        if ( match = DIRECTIVE_PATTERN.exec( line ) ) {
          results.push( match[1].trim() );
        }
      });

      return results;
    },

    parseDeps: function() {
      var requires = this.parseRequires(),
          deps     = [],
          self     = this;

      requires.forEach(function( r ) {
        var a         = r.split(/\s+/),
            directive = a[0],
            required  = a[1];

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

    pathsInDir: function( dir ) {
      var self_dir = _path.dirname( this.logical_path ),
          full_dir = _path.join( _path.dirname( this.fullPath() ), dir ),
          entries  = this._trail.entries( full_dir ),
          paths    = [];

      entries.forEach(function( e ) {
        if ( _fs.statSync( _path.join( full_dir, e ) ).isFile() ) {
          paths.push( _path.join( self_dir, dir, e ) );
        }
      });

      return paths;
    },

    pathsInTree: function( dir ) {
      var self_dir = _path.dirname( this.logical_path ),
          full_dir = _path.join( _path.dirname( this.fullPath() ), dir ),
          entries  = this._trail.entries( full_dir ),
          paths    = [],
          self     = this;

      entries.forEach(function( e ) {
        if ( _fs.statSync( _path.join( full_dir, e ) ).isFile() ) {
          paths.push( _path.join( self_dir, dir, e ) );
        } else {
          paths = paths.concat( self.pathsInTree( _path.join( dir, e ) ) );
        }
      });

      return paths;
    },

    depTree: function() {
      var deps = this.parseDeps(),
          self = this;

      self.dependencies = [];

      deps.forEach(function( d ) {
        var res = new Resource( d.path, self._trail );

        res.require_directive = d.directive;

        if ( res.fullPath() !== self.fullPath() ) {
          res.depTree();
        }
        self.dependencies.push( res );
      });

      return self;
    },

    depChain: function() {
      var chain = _rawDepChain( this );

      return chain.map(function( res ) {
        return res.fullPath();
      });
    }
  };

  return Resource;

})();
