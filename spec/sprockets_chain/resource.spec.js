var buster         = require("buster"),
    SprocketsChain = require("../../lib/sprockets_chain"),
    _path          = require("path"),
    expect         = buster.referee.expect;

buster.spec.expose();

describe("SprocketsChain", function() {

  before(function() {
    var sc     = new SprocketsChain("./spec");
    sc.appendPath("fixtures");
    sc.appendPath("fixtures2");
    sc.appendPath("fixtures3");
    this.trail = sc._trail;
    this.res   = new SprocketsChain.Resource( "one.js", sc._trail );
    this.res2  = new SprocketsChain.Resource( "two/two.js", sc._trail );
    this.res3  = new SprocketsChain.Resource( "bad_eoln.js", sc._trail );
    this.res4  = new SprocketsChain.Resource( "multi.js", sc._trail );
    this.res5  = new SprocketsChain.Resource( "eleven/one.js", sc._trail );
  });

  describe("SprocketsChain.Resource", function() {

    describe("initialize", function() {
      it("sets the correct full path", function() {
        var res = new SprocketsChain.Resource( "one.js", this.trail );
        expect( res.full_path ).toEqual( _path.resolve(".", "spec/fixtures/one.js") );
      });

      it("sets the correct logical path with extension", function() {
        var res = new SprocketsChain.Resource( "one", this.trail );
        expect( res.logical_path ).toEqual( "one.js" );
      });

      it("sets the correct full path for index files", function() {
        var res = new SprocketsChain.Resource( "nine", this.trail );
        expect( res.full_path ).toEqual( _path.resolve(".", "spec/fixtures/nine/index.js") );
      });

      it("sets the correct logical path with extension for index files", function() {
        var res = new SprocketsChain.Resource( "nine", this.trail );
        expect( res.logical_path ).toEqual( "nine/index.js" );
      });

      it("sets the correct full path from bower.json's main", function() {
        var res = new SprocketsChain.Resource( "twelve", this.trail );
        expect( res.full_path ).toEqual( _path.resolve(".", "spec/fixtures3/twelve/one.js") );
      });

      it("sets the correct logical path from bower.json's main", function() {
        var res = new SprocketsChain.Resource( "twelve", this.trail );
        expect( res.logical_path ).toEqual( "twelve/one.js" );
      });

      it("sets the correct full path from bower.json's main", function() {
        var res = new SprocketsChain.Resource( "thirteen", this.trail );
        expect( res.full_path ).toEqual( _path.resolve(".", "spec/fixtures3/thirteen/one.js") );
      });

      it("parses bower.json's main property when an array", function() {
        var res = new SprocketsChain.Resource( "thirteen", this.trail );
        expect( res.logical_path ).toEqual( "thirteen/one.js" );
      });

      describe("Windows paths", function() {
        var mockPath;
        var mockTrail;

        beforeEach(function(){
          mockTrail = {
            find: function(logical_path){
              return mockPath;
            }
          };
        });

        describe("simple resource path", function(){
          beforeEach(function(){
            mockPath = "c:\\Users\\MockUser\\sprockets-chain\\spec\\fixtures\\one.js";
          });

          it("sets the correct full path with Windows separators", function(){
            var res = new SprocketsChain.Resource( "one.js", mockTrail );
            expect( res.full_path ).toEqual( "c:\\Users\\MockUser\\sprockets-chain\\spec\\fixtures\\one.js" );
            expect( res.logical_path ).toEqual( "one.js" );
          });

          it("sets the correct logical path with extension with Windows separators", function() {
            var res = new SprocketsChain.Resource( "one", mockTrail );
            expect( res.full_path ).toEqual( "c:\\Users\\MockUser\\sprockets-chain\\spec\\fixtures\\one.js" );
            expect( res.logical_path ).toEqual( "one.js" );
          });
        });

        describe("complex resource path", function(){
          beforeEach(function(){
            mockPath = "c:\\Users\\MockUser\\sprockets-chain\\spec\\fixtures\\two\\two.js";
          });

          it("sets the correct full path with Windows separators", function(){
            var res = new SprocketsChain.Resource( "two/two.js", mockTrail );
            expect( res.full_path ).toEqual( "c:\\Users\\MockUser\\sprockets-chain\\spec\\fixtures\\two\\two.js" );
            expect( res.logical_path ).toEqual( "two/two.js" );
          });

          it("sets the logical path extension with Windows separators", function(){
            var res = new SprocketsChain.Resource( "two/two", mockTrail );
            expect( res.full_path ).toEqual( "c:\\Users\\MockUser\\sprockets-chain\\spec\\fixtures\\two\\two.js" );
            expect( res.logical_path ).toEqual( "two/two.js" );
          });
        });
      });
    });

    describe("resolve", function() {
      it("resolves the logical path given a path relative to the current resource", function() {
        expect( this.res2.resolve("./three") ).toEqual("two/three");
      });

      it("just returns the logical path if given", function() {
        expect( this.res2.resolve("two/three") ).toEqual("two/three");
      });
    });

    describe("parseRequires", function() {
      it("returns all require directives", function() {
        this.stub( this.res, "content", function() {
          return "//= require four\n#=  require_self\n/*\n*= require_directory  ./two\n*/"
        });
        expect( this.res.parseRequires() ).toEqual(["require four", "require_self", "require_directory  ./two"]);
      });

      it("does not return directives happening after code", function() {
        this.stub( this.res, "content", function() {
          return "//= require four\nsome code\n#=  require_self\n/*\n*= require_directory  ./two\n*/"
        });
        expect( this.res.parseRequires() ).toEqual(["require four"]);
      });
    });

    describe("parseDeps", function() {
      it("returns all dependencies, with logical path and directive", function() {
        this.stub( this.res, "parseRequires", function() {
          return ["require four", "require_self", "require_directory ./two", "require_tree ./five", "stub ./five/six/eight-stub"];
        });
        expect( this.res.parseDeps() ).toEqual([
          { path: "four",                     directive: "require" },
          { path: "one.js",                   directive: "require_self" },
          { path: "two/three.coffee",         directive: "require_directory" },
          { path: "two/two.js",               directive: "require_directory" },
          { path: "five/six/eight-stub.js",   directive: "require_tree" },
          { path: "five/six/seven.js.coffee", directive: "require_tree" },
          { path: "five/six/six.js",          directive: "require_tree" },
          { path: "five/six/eight-stub",      directive: "stub" }
        ]);
      });

      it("throws error if require_directory is used with non-relative path", function() {
        var self = this;
        this.stub( this.res, "parseRequires", function() {
          return ["require_directory two"];
        });
        expect(function() {
          self.res.parseDeps();
        }).toThrow("Error");
      });

      it("throws error if require_tree is used with non-relative path", function() {
        var self = this;
        this.stub( this.res, "parseRequires", function() {
          return ["require_tree five"];
        });
        expect(function() {
          self.res.parseDeps();
        }).toThrow("Error");
      });
    });

    describe("depTree", function() {
      it("creates the dependency tree", function() {
        var tree = this.res.depTree();
        expect( tree.dependencies[0].logical_path ).toEqual("four.js");
        expect( tree.dependencies[1].logical_path ).toEqual("one.js");
        expect( tree.dependencies[0].dependencies[0].logical_path ).toEqual("eight/eight.coffee");
      });
    });

    describe("depTree", function() {
      it("creates the dependency tree", function() {
        var tree = this.res3.depTree();
        expect( tree.dependencies[0].logical_path ).toEqual("five/six/six.js");
      });
    });

    describe("depChain", function() {
      function full_path(file_name, fixtures_dir) {
        if (!fixtures_dir) {
          fixtures_dir = "spec/fixtures"
        }
        return _path.join( _path.resolve(".", fixtures_dir), file_name );
      }

      it("returns the dependency chain", function() {
        var chain    = this.res.depChain(),
            expected = [ "eight/eight.coffee", "four.js", "one.js", "two/three.coffee", "two/two.js", "five/six/seven.js.coffee", "five/six/seven.js.coffee", "five/six/six.js" ]
            .map(function( p ) {
              var fixtures_dir = "spec/fixtures";
              if ( p === "four.js" ) {
                fixtures_dir = "spec/fixtures2";
              }
              return full_path(p, fixtures_dir);
            });
        expect( chain ).toEqual( expected );
      });

      it("only includes dependencies required by siblings once", function() {
        var chain = this.res4.depChain();
        expect( chain.length ).toEqual(4);
        expect( chain[0] ).toEqual(full_path("ten/one.js"));
        expect( chain[1] ).toEqual(full_path("ten/two.js"));
        expect( chain[2] ).toEqual(full_path("ten/three.js"));
        expect( chain[3] ).toEqual(full_path("multi.js"));
      });

      it("returns all dependencies for require_tree when the path is for the current directory (ie. 'require_tree ./') ", function() {
        //Doing this has resulted in an infinite loop in the past.
        var chain = this.res5.depChain();
        expect( chain.length ).toEqual(2);
        expect( chain[0] ).toEqual(full_path("eleven/one.js"));
        expect( chain[1] ).toEqual(full_path("eleven/two.js"));
      });
    });
  });

});
