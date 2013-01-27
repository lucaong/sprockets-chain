module.exports = (function() {

  var _path = require("path"),
      _fs   = require("fs");

  var Resource = function( logical_path, tail ) {
    this._tail        = tail;
    this.logical_path = logical_path;
    this.dependencies = [];
  };

  function _rawDepChain( self ) {
    var deps  = self.depTree().dependencies,
        chain = [];

    if ( deps.length > 0 ) {
      deps.forEach(function( d ) {
        if ( d.fullPath() !== self.fullPath() ) {
          _rawDepChain( d ).forEach(function( r ) {
            chain.push( r );
          });
        } else {
          chain.push( d );
        }
      });
    }

    chain.push( self );
    return chain;
  }

  Resource.prototype = {

    fullPath: function() {
      if ( typeof this.full_path === "undefined" ) {
        this.full_path = this._tail.find( this.logical_path );
      }
      return this.full_path;
    },

    resolve: function( path ) {
      if ( path.match(/^\.\//) ) {
        var dir = _path.dirname( this.logical_path );
        return _path.join( dir, path );
      }
      return path;
    },

    content: function() {
      var full_path = this.fullPath();

      if ( !full_path ) {
        throw new Error("Logical path " + this.logical_path + " cannot be found");
      }
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
          case "require_dir":
            self.pathsInDir( required ).forEach(function( p ) {
              deps.push({
                directive: directive,
                path:      p
              });
            });
            break;
          case "require_tree":
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
          entries  = this._tail.entries( full_dir ),
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
          entries  = this._tail.entries( full_dir ),
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

      deps.forEach(function( d ) {
        var res = new Resource( d.path, self._tail );

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

      return chain.reduce(function( ar, res ) {
        var full_path = res.fullPath(),
            directive = res.require_directive;
        if ( directive === "include" || ar.indexOf( full_path ) < 0 ) {
          ar.push( full_path );
        }
        return ar;
      }, []);
    }
  };

  return Resource;

})();
