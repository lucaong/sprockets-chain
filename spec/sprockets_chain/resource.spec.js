var buster         = require("buster"),
    SprocketsChain = require("../../lib/sprockets_chain"),
    _path          = require("path");

buster.spec.expose();

describe("SprocketsChain", function() {

  before(function() {
    var sc    = new SprocketsChain("./spec");
    sc.appendPath("fixtures");
    sc.appendPath("fixtures2");
    this.res  = new SprocketsChain.Resource( "one.js", sc._trail );
    this.res2 = new SprocketsChain.Resource( "two/two.js", sc._trail );
  });

  describe("SprocketsChain.Resource", function() {

    describe("fullPath", function() {
      it("returns the correct full path", function() {
        expect( this.res.fullPath() ).toEqual( _path.resolve(".", "spec/fixtures/one.js") );
      });
    });

    describe("resolve", function() {
      it("resolves the logical path of a resource given its relative path", function() {
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
          return ["require four", "require_self", "require_directory ./two", "require_tree ./five"];
        });
        expect( this.res.parseDeps() ).toEqual([
          { path: "four",                     directive: "require" },
          { path: "one.js",                   directive: "require_self" },
          { path: "two/three.coffee",         directive: "require_directory" },
          { path: "two/two.js",               directive: "require_directory" },
          { path: "five/six/seven.js.coffee", directive: "require_tree" },
          { path: "five/six/six.js",          directive: "require_tree" }
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
        expect( tree.dependencies[0].logical_path ).toEqual("four");
        expect( tree.dependencies[1].logical_path ).toEqual("one.js");
        expect( tree.dependencies[0].dependencies[0].logical_path ).toEqual("eight/eight");
      });
    });

    describe("depChain", function() {
      it("returns the dependency chain", function() {
        var chain    = this.res.depChain(),
            expected = [ "eight/eight.coffee", "four.js", "one.js", "two/three.coffee", "two/two.js", "five/six/seven.js.coffee", "five/six/seven.js.coffee", "five/six/six.js" ]
            .map(function( p ) {
              var fixtures_dir = "spec/fixtures";
              if ( p === "four.js" ) {
                fixtures_dir = "spec/fixtures2";
              }
              return _path.join( _path.resolve(".", fixtures_dir), p );
            });
        expect( chain ).toEqual( expected );
      });
    });
  });

});
