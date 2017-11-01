/**
 * Adjacency list implementation of a graph data structure.
 */
(function($) {

  /**
   * Constructor.
   *
   * @param {Array} nodeList
   *   List of {Object}s to initialize the graph with, of the form:
   *   [
   *     {
   *       name: '...',
   *       edge_list: '...',
   *       drag_handle: '...'
   *     },
   *     ...
   *   ], where
   *   `name` is the {String} name of the current node,
   *   `edge_list` is an array of {String} names of nodes that the current node is connected to, and
   *   `drag_handle` is the {String} name of the drag handle adjacent to the current node,
   *     or undefined if there is none.
   */
  $.Graph = function(nodeList) {
    var _this = this;
    this.node_list = [];
    if (nodeList !== undefined) {
      nodeList.forEach(function(e) {
        _this.node_list.push(new $.Graph.Node(e.name, e.edge_list, e.drag_handle));
      });
    }
  };

  $.Graph.prototype = {

    /**
     * Return true if the graph contains a node with the given name, false otherwise.
     *
     * @param {String} name
     * @return {Boolean}
     */
    containsNode: function(name) {
      var i = this.node_list.length;
      while (i--) {
        if (this.node_list[i].name === name) {
          return true;
        }
      }
      return false;
    },

    /**
     * If called with no arguments, return the list of all {Graph.Node}s in this graph.
     * Otherwise, return a list of {Graph.Node}s with the given names.
     *
     * @param {Array} nodeNamesList
     *   Array of {String} names of nodes to get.
     * @return {Array}
     */
    getNodes: function(nodeNameList) {
      if (nodeNameList === undefined) {
        return this.node_list;
      }
      else {
        return this.node_list.filter(function(v) {
          return nodeNameList.indexOf(v.name) !== -1;
        });
      }
    },

    /**
     * Update the graph so that the node given by `name` is connected only to the nodes given by `edgeList`.
     *
     * @param {String} name
     *   Name of the node to add or remove edges on.
     * @param {Array} edgeList
     *   Array of {String} names of nodes to conect to the given node.
     */
    updateNodeEdges: function(name, edgeList) {
      this.getNodes([name])[0].edge_list = edgeList.slice();
      this.getNodes().forEach(function(e) {
        // if current node is connected to `name`, but its name is not on `edgeList`, then remove edge
        if (e.edge_list.indexOf(name) !== -1 && edgeList.indexOf(e.name) === -1) {
          e.removeEdge(name);
        }
        // if current node is not connected to `name`, but its name is on `edgeList`, then add edge
        else if (e.edge_list.indexOf(name) === -1 && edgeList.indexOf(e.name) !== -1) {
          e.addEdge(name);
        }
      });
    },

    /**
     * Add a node to the graph, connecting it with the given edges in nodeNameList
     *
     * @param {String} name
     * @param {Array} nodeNameList
     *   Array of {String} names of nodes
     */
    addNode: function(name, nodeNameList) {
      this.node_list.push(new $.Graph.Node(name, []));
      this.updateNodeEdges(name, nodeNameList === undefined ? [] : nodeNameList);
    },

    /**
     * Remove a node from the graph.
     *
     * @param {String} name
     *   Name of the node to remove.
     */
    removeNode: function(name) {
      // disconnect the node from the graph
      this.updateNodeEdges(name, []);
      // splice it out of the array
      this.node_list.splice(this.node_list.indexOf(this.getNodes([name])[0]), 1);
    },

    /**
     * Add a drag handle name to each node in the given names list.
     * if nodeNamesList is undefined, add the handle to all nodes.
     *
     * @param {String} name
     *   Name of the drag handle.
     * @param {Array} nodeNamesList
     *   Array of {String} names of nodes to add the drag handle to.
     */
    addDragHandle: function(name, nodeNamesList) {
      this.getNodes(nodeNamesList).forEach(function(e) {
        e.addDragHandle(name);
      });
    },

    /**
     * Remove a drag handle name from each node in the given names list.
     * if nodeNamesList is undefined, remove the handle from all nodes.
     *
     * @param {String} name
     *   Name of the drag handle.
     * @param {Array} nodeNamesList
     *   Array of {String} names of nodes to remove the drag handle from.
     */
    removeDragHandle: function(name, nodeNamesList) {
      this.getNodes(nodeNamesList).forEach(function(e) {
        if (e.drag_handle === name) {
          e.removeDragHandle();
        }
      });
    },

    /**
     * Get the list of all node names in the connected component of the graph that contains the given node.
     * Does a depth-first-search.
     *
     * @param {String} nodeName
     * @return {Array}
     *   Array of strings of all node names in the connected component.
     */
    getConnectedComponent: function(nodeName) {

      // add all the nodes connected to nodeName that aren't in the accumulator, to the accumulator
      var _this = this;
      function getConnectedComponentHelper(nodeName, acc) {
        // add the nodeName and its edgeList to the accumulator
        // for each edge in the edgelist, call gcchelper on it if it isn't already in the accumulator
        var accCopy = acc.slice();
        accCopy.push(nodeName);
        _this.getNodes([nodeName])[0].edge_list.forEach(function(e, i, a) {
          // if e is not in the accumulator, call getConnectedComponentHelper on it
          if (accCopy.indexOf(e) === -1) {
             accCopy = getConnectedComponentHelper(e, accCopy);
          }
        });
        return accCopy;
      }
      return getConnectedComponentHelper(nodeName, []);
    },

    /**
     * If any node that the given node is connected to has a non-undefined drag_handle property, return it.
     * Otherwise, return undefined.
     *
     * @param {String} nodeName
     *   The node to find a drag handle for.
     * @return {String | undefined}
     */
    getDragHandle: function(nodeName) {
      var connectedNodeNames = this.getConnectedComponent(nodeName),
      ret;
      this.getNodes(connectedNodeNames).forEach(function(e) {
        if (e.drag_handle !== undefined) {
          ret = e.drag_handle;
        }
      });
      return ret;
    }
  };

  /**
   * Constructor for the graph nodes.
   *
   * @param {String} name
   * @param {Array} edgeList
   *   An array of {String}s
   * @param {String} dragHandle
   */
  $.Graph.Node = function(name, edgeList, dragHandle) {
    this.name = name;
    this.edge_list = edgeList.slice();
    this.drag_handle = dragHandle;
  };

  $.Graph.Node.prototype = {

    /**
     * Add an edge to the edge_list of the node.
     */
    addEdge: function(end) {
      this.edge_list.push(end);
    },

    /**
     * Remove an edge from the edge_list of the node.
     */
    removeEdge: function(name) {
      var idx = this.edge_list.indexOf(name);
      if (idx !== -1) {
        this.edge_list.splice(idx, 1);
      }
    },

    /**
     * Add drag handle to the node.
     */
    addDragHandle: function(name) {
      this.drag_handle = name;
    },

    /**
     * Remove drag handle from the node.
     */
    removeDragHandle: function() {
      this.drag_handle = undefined;
    }
  };

}(Mirador));
