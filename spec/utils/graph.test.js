describe('Graph', function() {

  describe('Graph.Node', function() {

    describe('no edges', function() {

      beforeEach(function() {
        this.n = new Mirador.Graph.Node('one', [], undefined);
      });

      it('should be able to add and remove edges', function() {
        this.n.addEdge('two');
        expect(this.n.edge_list).toContain('two');
        this.n.removeEdge('two');
        expect(this.n.edge_list).not.toContain('two');
      });
      
      // ...
    });

    describe('with edges', function() {

    });
  });

  describe('a graph with zero connected components (empty graph)', function() {

    beforeEach(function() {
      this.g = new Mirador.Graph([]);
    });

    it('should not contain any nodes', function() {
      expect(this.g.containsNode('one')).toBe(false);

      // no args, so gets all nodes in g
      expect(this.g.getNodes().length).toBe(0);

      // gets nodes in g with these names
      expect(this.g.getNodes(['one', 'two', 'three']).length).toBe(0);
    });

    // ...
  });

  describe('a graph with one connected component', function() {

    beforeEach(function() {
      this.g = new Mirador.Graph([
        {
          name: 'one',
          edge_list: ['two', 'three'],
          drag_handle: 'handle1'
        },
        {
          name: 'two',
          edge_list: ['one'],
        },
        {
          name: 'three',
          edge_list: ['one'],
        }
      ]);
    });

    // ...
  });

  describe('a graph with more than one connected component', function() {

  });
});
