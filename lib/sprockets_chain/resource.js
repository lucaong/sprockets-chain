module.exports = (function() {

  var _path = require("path"),
      _fs   = require("fs");

  var Resource = function( logical_path, tail ) {
    this._tail        = tail;
    this.logical_path = logical_path;
    this.dependencies = [];
  };

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
            deps.push( self.resolve( required ) );
            break;
          case "require_self":
            deps.push( self.logical_path );
            break;
          case "require_dir":
            deps = deps.concat( self.pathsInDir( required ) );
            break;
          case "require_tree":
            deps = deps.concat( self.pathsInTree( required ) );
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
        var res = new Resource( d, self._tail );

        if ( res.fullPath() !== self.fullPath() ) {
          res.depTree();
        }
        self.dependencies.push( res );
      });

      return self;
    },

    depChain: function() {
      var deps  = this.depTree().dependencies,
          chain = [],
          self  = this;

      if ( deps.length === 0 ) {
        return [];
      } else {
        deps.forEach(function( d ) {
          if ( d.fullPath() !== self.fullPath() ) {
            chain = chain.concat( d.depChain() );
          }
          chain.push( d.fullPath() );
        });
      }

      return chain.reduce(function( ar, el ) {
        if ( ar.indexOf( el ) < 0 ) {
          ar.push( el );
        }
        return ar;
      }, []);
    }

  };

  return Resource;

})();
