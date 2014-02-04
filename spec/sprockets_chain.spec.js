var buster         = require("buster"),
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
