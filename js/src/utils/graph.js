(function($) {

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

    containsNode: function(name) {
      var i = this.node_list.length;
      while (i--) {
        if (this.node_list[i].name === name) {
          return true;
        }
      }
      return false;
    },

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

    updateNodeEdges: function(name, edgeList) {
      // set edge list of this node to edgeList
      this.getNodes([name])[0].edge_list = edgeList.slice();
      this.getNodes().forEach(function(e) {
        if (e.edge_list.indexOf(name) !== -1 && edgeList.indexOf(e.name) === -1) {
          e.removeEdge(name);
        }
        else if (e.edge_list.indexOf(name) === -1 && edgeList.indexOf(e.name) !== -1) {
          e.addEdge(name);
        }
      });
    },

    addNode: function(name, nodeNameList) {
      this.node_list.push(new $.Graph.Node(name, []));
      this.updateNodeEdges(name, nodeNameList === undefined ? [] : nodeNameList);
    },

    removeNode: function(name) {
      // disconnect the node from the graph
      this.updateNodeEdges(name, []);
      // splice it out of the array
      this.node_list.splice(this.node_list.indexOf(this.getNodes([name])[0]), 1);
    },

    addDragHandle: function(name, nodeNamesList) {
      this.getNodes(nodeNamesList).forEach(function(e) {
        e.addDragHandle(name);
      });
    },

    removeDragHandle: function(name, nodeNamesList) {
      this.getNodes(nodeNamesList).forEach(function(e) {
        if (e.drag_handle === name) {   
          e.removeDragHandle();
        }
      });
    },

    // returns the name of all nodes connected to this node
    getConnectedNodeNames: function(nodeName, nodeNamesList) {
      
      //console.log(nodeName, nodeNamesList);
      // get edgelist of this node
      var _this = this,
      el = this.getNodes([nodeName])[0].edge_list;
      var newList = nodeNamesList.slice();
      if (newList.indexOf(nodeName) === -1) {
        newList.push(nodeName);
        return _.difference(el, newList).reduce(function(p, v) {
          // add current node to the running list
          // call getConnectedNodeNames on the new list
          return _this.getConnectedNodeNames(v, p); 
        }, newList); 
      } else {
        return nodeNamesList;
      }
    },

    getDragHandle: function(nodeName) {
      var connectedNodeNames = this.getConnectedNodeNames(nodeName, []),
      ret;
      this.getNodes(connectedNodeNames).forEach(function(e) {
        if (e.drag_handle !== undefined) {
          ret = e.drag_handle;
        }
      });
      return ret;
    }
  };

  $.Graph.Node = function(name, edgeList, dragHandle) { 
    this.name = name;
    this.edge_list = edgeList.slice();
    this.drag_handle = dragHandle;
  };
  
  $.Graph.Node.prototype = {
    addEdge: function(end) {  
      this.edge_list.push(end);
    },
    removeEdge: function(name) {
      var idx = this.edge_list.indexOf(name);
      if (idx !== -1) {
        this.edge_list.splice(idx, 1);
      }
    },
    addDragHandle: function(name) {
      this.drag_handle = name;
    },
    removeDragHandle: function() {
      this.drag_handle = undefined;
    }
  };

  /*
  $.Graph.DragHandleNode = function(name, edgeList) {
    $.Graph.Node.call(this);
    this.type = 'drag-handle';
  };
  $.Graph.DragHandleNode.prototype = Object.create($.Graph.Node.prototype);

  */
}(Mirador)); 
