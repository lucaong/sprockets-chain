var _path          = require("path"),
    buster         = require("buster"),
    SprocketsChain = require("../lib/sprockets_chain"),
    expect         = buster.referee.expect;

buster.spec.expose();

describe("SprocketsChain", function() {

  before(function() {
    this.sc = new SprocketsChain();
    this.sc.appendPath("spec/fixtures");
  });

  describe("depTree", function() {
    it("creates new resource and proxies to its depTree method", function() {
      var spy = this.spy();
      this.stub( this.sc, "resource", function() {
        return { depTree: spy };
      });
      this.sc.depTree();
      expect( spy ).toHaveBeenCalled();
    });
  });

  describe("depChain", function() {
    it("creates new resource and proxies to its depChain method", function() {
      var spy = this.spy();
      this.stub( this.sc, "resource", function() {
        return { 
          depTree: function() {
            return { depChain: spy };
          }
        };
      });
      this.sc.depChain();
      expect( spy ).toHaveBeenCalled();
    });
  });

});


describe("require_tree across paths", function(){
  
  before(function(){
    this.sc = new SprocketsChain();
    this.sc.appendPath("spec/fixtures4/assets");
    this.sc.appendPath("spec/fixtures4/vendor");
  });
  
  
  it("resolves require_tree directories relative to root directory", function(){
    // Note: order of paths is reversed because dependencies are
    // output first before the original file.
    var expectedPaths = [
      _path.resolve("./spec/fixtures4/", "vendor/sub2/two.js"),
      _path.resolve("./spec/fixtures4/", "assets/sub1/one.js")
    ];
    
    var result = this.sc.depChain('sub1/one.js');
    expect(result).toEqual(expectedPaths);
  });
  
});
