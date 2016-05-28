/*jshint scripturl:true*/
(function($) {

  $.Workspace = function(options) {

    jQuery.extend(true, this, {
      workspaceSlotCls: 'slot',
      focusedSlot:      null,
      slots:            [],
      snapGroups:       [],
      windows:          [],
      appendTo:         null,
      layoutDescription:    null,
      state:            null,
      eventEmitter:     null
    }, options);

    this.element  = this.element || jQuery('<div class="workspace-container" id="workspace">');
    this.init();

  };

  $.Workspace.prototype = {
    init: function () {
      this.element.appendTo(this.appendTo);
      // this if statement does not appear to be doing anything because toggleSwitchWorkspace is not a function anywhere
      // if (this.type === "none") {
      //   this.parent.toggleSwitchWorkspace();
      //   return;
      // }

      this.calculateLayout();

      this.bindEvents();
      this.listenForActions();
    },

    listenForActions: function() {
      var _this = this;

      _this.eventEmitter.subscribe('resizeMirador', function(event) {
        _this.calculateLayout();
      });

      _this.eventEmitter.subscribe('manifestQueued', function(event, manifestPromise) {
        // Trawl windowObjects preemptively for slotAddresses and
        // notify those slots to display a "loading" state.
        // Similar to the operation of the manifestLoadStatusIndicator
        // and its associated manifestList controller.
        var targetSlot;

        if (_this.state.getStateProperty('windowObjects')) {
          var check = _this.state.getStateProperty('windowObjects').forEach(function(windowConfig, index) {
            // windowConfig.slotAddress will give the slot;
            // change the state on that slot to be "loading"
            if (windowConfig.slotAddress) {
              targetSlot = _this.getSlotFromAddress(windowConfig.slotAddress);
            } else {
              targetSlot = _this.focusedSlot || _this.slots.filter(function(slot) {
                return slot.hasOwnProperty('window') ? true : false;
              })[0];
            }
          });
        }
      });

      _this.eventEmitter.subscribe('windowRemoved', function(event, windowId) {
        _this.windows = jQuery.grep(_this.windows, function(window) {
          return window.id !== windowId;
        });
      });

      _this.eventEmitter.subscribe('REMOVE_NODE', function(event, node){
        _this.removeNode(node);
      });

      _this.eventEmitter.subscribe('ADD_SLOT_ITEM', function(event, slot){
        _this.addItem(slot);
      });

      _this.eventEmitter.subscribe('ADD_WINDOW', function(event, windowConfig) {
        _this.addWindow(windowConfig);
      });

      _this.eventEmitter.subscribe('SPLIT_RIGHT', function(event, slot) {
        _this.splitRight(slot);
      });

      _this.eventEmitter.subscribe('SPLIT_LEFT', function(event, slot) {
        _this.splitLeft(slot);
      });

      _this.eventEmitter.subscribe('SPLIT_DOWN', function(event, slot) {
        _this.splitDown(slot);
      });

      _this.eventEmitter.subscribe('SPLIT_UP', function(event, slot) {
        _this.splitUp(slot);
      });

      _this.eventEmitter.subscribe('RESET_WORKSPACE_LAYOUT', function(event, options) {
        _this.resetLayout(options.layoutDescription);
      });

      _this.eventEmitter.subscribe('ADD_FLEXIBLE_SLOT', function(event) {
        // splitRight on the rigthtmost slot
        _this.splitRight(_this.slots[_this.slots.length - 1]);
        _this.bindEvents();
      });

      _this.eventEmitter.subscribe('ADD_DRAG_HANDLE', function(event) {
        // create new snap group
        _this.snapGroups.push('snap-group-' + $.genUUID());

        // call d3 function
        _this.renderDragHandles();
        _this.bindEvents();
      });

      _this.eventEmitter.subscribe('REMOVE_DRAG_HANDLE', function(event, id) {
        // remove the snap group given by id
        _this.snapGroups = _this.snapGroups.filter(function(e, i, a) {
          return e === id ? false : true;
        });

        // call d3 function
        // then un-register the removed drag-handle's layout-slots
        _this.renderDragHandles();
        jQuery('.layout-slot.' + id).removeClass(id);
      });

      _this.eventEmitter.subscribe('flex-slot-dragstop', $.debounce(function(event, ui) {
        // publish "flex-slot-drag" event
        var id = ui.helper[0].attributes['data-layout-slot-id'].value;
        _this.slotCoordinates[id].x = ui.position.left;
        _this.slotCoordinates[id].y = ui.position.top;

        // get all id's in the snap-group
        // TODO: pass calculateLayout a single id instead of a list
        var slotIDs = [id];

        // pass to calculateLayout
        _this.calculateLayout(undefined, slotIDs, undefined);

        var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];
        _this.eventEmitter.publish('layoutChanged', root);

      }, 100));

      _this.eventEmitter.subscribe('flex-slot-resizestop', $.debounce(function(event, ui) {
        // publish "flex-slot-resize" event
        var id = ui.helper[0].attributes['data-layout-slot-id'].value;
        _this.slotCoordinates[id].dx = ui.size.width;
        _this.slotCoordinates[id].dy = ui.size.height;

        var slotIDs = [id];
        _this.calculateLayout(undefined, undefined, slotIDs);

        var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];
        _this.eventEmitter.publish('layoutChanged', root);

      }, 100));

      _this.eventEmitter.subscribe('drag-handle-dragstop', $.debounce(function(event, ui) {
        var id = ui.helper[0].id;
        var slotIDs = [];
        jQuery('.' + id).each(function(i, val) {
          var dlsi = val.attributes['data-layout-slot-id'].value;
          if (slotIDs.indexOf(dlsi) === -1) {
            slotIDs.push(dlsi);
            // write to slotCoordinates
            _this.slotCoordinates[dlsi].x = val.offsetLeft;
            _this.slotCoordinates[dlsi].y = val.offsetTop;
          }
        });
        _this.calculateLayout(undefined, slotIDs, undefined);

        var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];
        _this.eventEmitter.publish('layoutChanged', root);

      }, 100));
    },

    bindEvents: function() {
      var _this = this;

      jQuery('.layout-slot')
      .click(function() {
        // Bring clicked window to the top
        var elem = this,
        stack = '.layout-slot',
        min,
        group = jQuery.makeArray(jQuery(stack)).sort(function(a, b) {
          return (parseInt(jQuery(a).css("zIndex"), 10) || 0) - (parseInt(jQuery(b).css("zIndex"), 10) || 0);
        });
        if (group.length < 1) {
          return;
        }
        min = parseInt(group[0].style.zIndex, 10) || 0;
        jQuery(group).each(function(i) {
          this.style.zIndex = min+i;
        });
        if (elem === undefined) {
          return;
        }
        jQuery(elem).css({'zIndex' : min+group.length});
      })
      .draggable({
        stack: '.layout-slot',
        snap: '.layout-slot, .drag-handle',
        //snapMode: 'outer',
        stop: _this.createSnapGroup 
      }).on('dragstop', $.debounce(function(event, ui) {
        _this.eventEmitter.publish('flex-slot-dragstop', ui);
      }))
      .resizable().on('resizestop', $.debounce(function(event, ui) {
        _this.eventEmitter.publish('flex-slot-resizestop', ui);
      }));

      jQuery('.drag-handle').each(function(index) {
        var __this = this; // __this and _this are different, be careful!
        jQuery(__this).draggable({
          multiple: {
            items: function getSelectedItems() {
              return jQuery('.ui-draggable.' + jQuery(__this).attr('id'));
            },
            beforeStart: jQuery.noop,
          },
          snap: '.layout-slot',
          snapMode: 'outer',
          stop: _this.createSnapGroup
        }).on('dragstop', $.debounce(function(event, ui) {
          _this.eventEmitter.publish('drag-handle-dragstop', ui);
        }));
      });

      jQuery('.drag-handle-remove')
      .click(function(event) {
        var id = event.currentTarget.__data__;
        _this.eventEmitter.publish('REMOVE_DRAG_HANDLE', id);
      });
    },

    get: function(prop, parent) {
      if (parent) {
        return this[parent][prop];
      }
      return this[prop];
    },

    set: function(prop, value, options) {
      var _this = this;
      if (options) {
        this[options.parent][prop] = value;
      } else {
        this[prop] = value;
      }
      _this.eventEmitter.publish(prop + '.set', value);
    },

    /**
     * Add the classes required to create a snap-group with the dragged element.
     */
    createSnapGroup: function() {

      /**
       * Get the name of the snap group that corresponds to a give jQuery selection.
       *
       * @param {jQuery selection} selection A jQuery selection that can contain layout-slots
       *     and drag-handles.
       * @return {false | Array} This returns either false or a one-element array.
       */
      function getSnapGroup(selection) {
        var re = '^snap-group-',
        reObj = new RegExp(re);

        function getDragHandleId(selection) {
          var id;
          if (selection.length > 0) {
            id = selection[0].id;
            return reObj.test(id) ? [id] : false;
          }
          return false;
        }
        return selection.filter('.layout-slot').hasClassRegEx(re) || getDragHandleId(selection.filter('.drag-handle'));
      }

      // Get the possible snap targets, then pull out only the snap targets that are "snapping"
      // thisSnapGroup and targetSnapGroup will either be single-element lists, or false
      var snapTargets = jQuery(this).data('ui-draggable').snapElements,
      snappedTargets = jQuery.map(snapTargets, function(element) {
        return element.snapping ? element.item : null;
      }),
      thisElt = jQuery(this),
      thisSnapGroup = getSnapGroup(thisElt),
      targetElts = jQuery(snappedTargets),
      targetSnapGroup = getSnapGroup(targetElts);

      if (thisElt.filter('.layout-slot').length > 0) {
        thisElt.removeClass(thisSnapGroup[0]);
        if (targetSnapGroup) {
          thisElt.addClass(targetSnapGroup[0]);
        }
      } else { // 'thisElt' is a dragHandle
        targetElts.filter('.layout-slot').removeClass(targetSnapGroup[0]).addClass(thisSnapGroup[0]);
      }
    },

    /**
     * Use d3 to render the dragHandles.
     */
    renderDragHandles: function() {
      var _this = this,
      n = _this.snapGroups.length,
      handles = d3.select('#workspace').selectAll('.drag-handle').data(_this.snapGroups, function(d) { 
        // binds data to element by id, so that when an item is removed from _this.snapGroups,
        // the DOM element with corresponding #id is removed, instead of the most recently added element
        return d;
      }),
      handlesDiv = handles.enter().append('div')
        .attr('id', function(d) { return d; })
        .classed({'drag-handle': true})
        .style({
          'background-color': 'red',
          'border-top-left-radius': '8px',
          'border-top-right-radius': '8px',
          'height': '25px',
          'left': 75*n + 'px',
          'position': 'absolute',
          'top': '50px',
          'width': '50px'
        }),
      handlesDivA = handlesDiv.append('a')
        .attr('href', 'javascript:;')
        .classed({'drag-handle-remove': true});

      handlesDivA.append('i')
        .attr('float', 'left')
        .classed({'fa fa-times': true})
        .style('padding', '4px');

      handles.exit().remove('div');
    },

    calculateLayout: function(resetting, draggedIDs, resizedIDs) {
      var _this = this,
      layout,
      divs;

      // if flexible layout is enabled, do not use isfahan
      // instead, use flexible layout settings for width, height, and offset

      // save layout description
      var slotX = 50, slotY = 50, slotDX = 500, slotDY = 500;
      if ($.DEFAULT_SETTINGS.flexibleWorkspace === true && typeof _this.layoutDescription === 'object') {
        // if layoutdescription children have id attributes, then store them in slotCoordinates
        //if (_this.slotCoordinates || (!_this.slotCoordinates && _this.layoutDescription.id)) {
        //
        if (!_this.slotCoordinates) {// && _this.layoutDescription.id) {
            // need to initialize in case we are restoring a saved workspace
          _this.slotCoordinates = {};
        }

        if (_this.layoutDescription.id) { // this means we've initialized the workspace already, and need to save what we've got
          var childs = _this.layoutDescription.children;
          var keyy;
          for (var p = 0; p < childs.length; p++) {
            // save the coordinates
            keyy = childs[p].id;

            if (childs[p].x && childs[p].y && childs[p].dx && childs[p].dy) {
                
            // assume key to be something meaningful
            if (!_this.slotCoordinates[keyy]) {
              _this.slotCoordinates[keyy] = {};
            }
            if (draggedIDs === undefined || draggedIDs.indexOf(keyy) === -1) {
              _this.slotCoordinates[keyy].x = childs[p].x;
              _this.slotCoordinates[keyy].y = childs[p].y;
            }
            if (resizedIDs === undefined || resizedIDs.indexOf(keyy) === -1) {
              _this.slotCoordinates[keyy].dx = childs[p].dx;
              _this.slotCoordinates[keyy].dy = childs[p].dy;
            }

            }
          }
        }
      }

      _this.layout = layout = new Isfahan({
        containerId: _this.element.attr('id'),
        layoutDescription: _this.layoutDescription,
        configuration: null,
        padding: 3 
      });

      // if flex workspace is enabled
      //   go thru _this.layout and load the coords into the children attr

      if ($.DEFAULT_SETTINGS.flexibleWorkspace === true) {

        var children = _this.layout[0].children;
          // restore the saved coordinates
          for (var j = 0; j < children.length; j++) {

            // if _this.slotCoordinates doesnt have anything for this children item
            //   add it
            //   
            if (!_this.slotCoordinates[children[j].id]) {
              _this.slotCoordinates[children[j].id] = {};
              _this.slotCoordinates[children[j].id].x = slotX * (j + 1);
              _this.slotCoordinates[children[j].id].y = slotY * (j + 1);
              _this.slotCoordinates[children[j].id].dx = slotDX;
              _this.slotCoordinates[children[j].id].dy = slotDY;
            }

            // restore it
            children[j].x = _this.slotCoordinates[children[j].id].x;
            children[j].y = _this.slotCoordinates[children[j].id].y;
            children[j].dx = _this.slotCoordinates[children[j].id].dx;
            children[j].dy = _this.slotCoordinates[children[j].id].dy;
          }
      }

      var data = layout.filter( function(d) {
        return !d.children;
      });

      // Data Join.
      divs = d3.select("#" + _this.element.attr('id')).selectAll(".layout-slot")
      .data(data, function(d) { return d.id; });

      // Implicitly updates the existing elements.
      // Must come before the enter function.
      divs.call(cell).each(function(d) {
        _this.slots.forEach(function(slot) {
          if (slot.slotID === d.id) {
            slot.layoutAddress = d.address;
          }
        });
      });

      // Enter
      divs.enter().append("div")
      .attr("class", "layout-slot")
      .attr("data-layout-slot-id", function(d) { return d.id; })
      .call(cell)
      .each(function(d) {
        var appendTo = _this.element.children('div').filter('[data-layout-slot-id="'+ d.id+'"]')[0];
        _this.slots.push(new $.Slot({
          slotID: d.id,
          layoutAddress: d.address,
          focused: true,
          appendTo: appendTo,
          state: _this.state,
          eventEmitter: _this.eventEmitter
        }));
      });

      // add draggable/resizable events to new div
      // _this.bindEvents();

      // Exit
      divs.exit()
      .remove("div")
      .each(function(d) { 
        var slotMap = _this.slots.reduce(function(map, temp_slot) {
          if (d.id === temp_slot.slotID) {
            map[d.id] = temp_slot;
          }
          return map;
        }, {}),
        slot = slotMap[d.id];

        if (slot && slot.window && !resetting) {
          _this.eventEmitter.publish("windowRemoved", slot.window.id);
        }
        
        // nullify the window parameter of old slots
        slot.window = null;
        _this.slots.splice(_this.slots.indexOf(slot), 1);

        // remove it from the slotCoordinates var
        if (_this.slotCoordinates[d.id]) {
          delete _this.slotCoordinates[d.id];
        }
      });

      function cell() {
        this
        .style("left", function(d) { return d.x + "px"; })
        .style("top", function(d) { return d.y + "px"; })
        .style("width", function(d) { return Math.max(0, d.dx ) + "px"; })
        .style("height", function(d) { return Math.max(0, d.dy ) + "px"; });
      }

      var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];

      _this.eventEmitter.publish("layoutChanged", root);
      _this.eventEmitter.publish('slotsUpdated', {slots: _this.slots});

      if (_this.slots.length <= 1) {
          _this.eventEmitter.publish('HIDE_REMOVE_SLOT');
        } else {
          _this.eventEmitter.publish('SHOW_REMOVE_SLOT');
        }
    },

    split: function(targetSlot, direction) {
      var _this = this,
      node = ($.DEFAULT_SETTINGS.flexibleWorkspace && _this.slots.length === 1) ? jQuery.grep(_this.layout, function(node) { return node.id === targetSlot.slotID; })[1] : jQuery.grep(_this.layout, function(node) { return node.id === targetSlot.slotID; })[0],
      nodeIndex = node.parent ? node.parent.children.indexOf(node) : 0,
      nodeIsNotRoot = node.parent;

      function addSibling(node, indexDifference) {
        if (nodeIsNotRoot) {
          var siblingIndex = nodeIndex + indexDifference,
          newSibling = _this.newNode(node.type, node);

          node.parent.children.splice(siblingIndex, 0, newSibling);
          _this.layout.push(newSibling);
          return newSibling;
        }

        // handles the case where the root needs to be mutated.
        node.type = node.type === 'row' ? 'column' : 'row';
        mutateAndAdd(node, indexDifference);
      }

      function mutateAndAdd(node, indexDifference) {
        // Locally mutate the tree to accomodate a 
        // sibling of another kind, transforming
        // both the target node and its parent.
        var newParent = _this.newNode(node.type, node.parent);

        // Flip its type while keeping
        // the same id.
        node.type = node.type === 'row' ? 'column' : 'row';

        // Create a new node (which will be childless)
        // that is also a sibling of this node.
        newSibling = _this.newNode(node.type, newParent);

        // maintain array ordering.
        newParent.children = [];
        newParent.children.push(node); // order matters, place node first.
        newParent.children.splice(indexDifference, 0, newSibling); // order matters, so put new sibling on one side or the other.
        if (nodeIsNotRoot) {
          newParent.parent = node.parent;
          // replace the old node in its parent's child
          // array with the new parent.
          newParent.parent.children[nodeIndex] = newParent;
        }

        node.parent = newParent;
        _this.layout.push(newParent, newSibling);
      }

      if (node.type === 'column') {
        // Since it is a column:
        // 
        // If adding to a side, simply
        // add a sibling.
        // Left means before, right means after.
        if (direction === 'r' || direction === 'l') {
          indexDifference = direction === 'r' ? 1 : 0;
          addSibling(node, indexDifference);
        } 
        // If adding above or below, the
        // operation must be changed to mutating
        // the structure. 
        // Up means before, Down means after.
        else {
          indexDifference = direction === 'd' ? 1 : 0;
          mutateAndAdd(node, indexDifference);
        }
      } else {
        // Since it is a row:
        //
        // If adding to a side, mutate the 
        // structure.
        // Left means before, right means after.
        if (direction === 'r' || direction === 'l') {
          indexDifference = direction === 'r' ? 1 : 0;
          mutateAndAdd(node, indexDifference);
        } 
        // If adding above or below, the
        // operations must be switched to adding
        // a sibling. 
        // Up means before, Down means after.
        else {
          indexDifference = direction === 'd' ? 1 : 0;
          addSibling(node, indexDifference);
        }
      }

      // Recalculate the layout.
      // The original hierarchical structure is
      // accessible from the root node. Passing 
      // it back through the layout code will 
      // recalculate everything else needed for 
      // the redraw.
      var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];
      _this.layoutDescription = root;
      _this.calculateLayout();

    },

    splitRight: function(targetSlot) {
      var _this = this;
      _this.split(targetSlot, 'r');
    },

    splitLeft: function(targetSlot) {
      var _this = this;
      _this.split(targetSlot, 'l');
    },

    splitUp: function(targetSlot) {
      var _this = this;
      _this.split(targetSlot, 'u');
    },

    splitDown: function(targetSlot) {
      var _this = this;
      _this.split(targetSlot, 'd');
    },

    removeNode: function(targetSlot) {
      // de-mutate the tree structure.
      var _this = this,
      filter = jQuery.grep(_this.layout, function(node) { return node.id === targetSlot.slotID; }),
      node = ($.DEFAULT_SETTINGS.flexibleWorkspace && filter.length > 1) ? filter[1] : filter[0], 
      nodeIndex = node.parent.children.indexOf(node),
      parentIndex,
      remainingNode,
      root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];

      if (node.parent.children.length === 2) {
        // de-mutate the tree without destroying
        // the children of the remaining node, 
        // which in this case means changing their
        // IDs.
        node.parent.children.splice(nodeIndex,1);
        remainingNode = node.parent.children[0];

        remainingNode.parent.id = remainingNode.id;
        delete node.parent;
      } else if (node.parent.children.length === 1) { 
      } else { 
        // If the node is one of more than 2 siblings,
        // simply splice it out of the parent's children 
        // array.
        node.parent.children.splice(nodeIndex, 1);
      }

      //delete targetSlot;
      _this.layoutDescription = root;
      _this.calculateLayout();
    },

    newNode: function(type, parent) {
      if (typeof parent === 'undefined') {
        return {
          type: type,
          id: $.genUUID()
        };
      } else {
        return {
          type: type,
          id: $.genUUID(),
          parent: parent
        };
      }
    },

    getSlotFromAddress: function(address) {
      var _this = this;
      return _this.slots.filter(function(slot) {
        return slot.layoutAddress === address;
      })[0];
    },

    resetLayout: function(layoutDescription) {
      this.layoutDescription = layoutDescription;
      this.calculateLayout(true);
      this.placeWindows();
    },

    placeWindows: function() {
      // take the windows array and place
      // as many windows into places as can 
      // fit.
      var _this = this,
      deletedWindows;

      if (_this.windows.length > _this.slots.length) {
        // splice modifies the original array and 
        // returns the deleted items, 
        // so we can just perform a forEach on the 
        // return value, and have the saveController
        // remove these windows in response to the event
        // (which otherwise it would not do).
        //
        // The event was not called in the calculateLayout
        // function because we need the other windows to remain,
        // so we filter them here.
        _this.windows.splice(0, _this.windows.length -_this.slots.length).forEach(function(removedWindow){
          _this.eventEmitter.publish('windowRemoved', removedWindow.id);
        });
      }
      
      _this.windows.forEach(function(window) {
        var slot = _this.getAvailableSlot();
        slot.window = window;

        window.update({
          id: window.id, 
          slotAddress: slot.layoutAddress, 
          state: _this.state,
          appendTo: slot.element,
          currentCanvasID: window.currentCanvasID,
          currentFOcus: window.currentFocus
        });
      });
    },

    getAvailableSlot: function() {
      return this.slots.filter(function(slot) {
        return !slot.window;
      })[0];
    },

    clearSlot: function(slotId) {
      if (this.slots[slotId].windowElement) { 
        this.slots[slotId].windowElement.remove();
      }
      this.slots[slotId].window = null;
    },

    addItem: function(slot) {
      var _this = this;
      this.focusedSlot = slot;
      _this.eventEmitter.publish('TOGGLE_LOAD_WINDOW');
    },

    addWindow: function(windowConfig) {
      // Windows can be added from a config,
      // from a saved state, (in both those cases they are in the form of "windowObjects")
      // from the workspace windows list after a grid layout change,
      // from the manifests panel in image mode,
      // or from the manifests panel in thumbnail mode.
      var _this = this,
          newWindow,
          targetSlot;

      // toggles the other top-level panels closed and focuses the
      // workspace. For instance, after selecting an object from the
      // manifestPanel.
      _this.eventEmitter.publish('TOGGLE_OVERLAYS_FALSE');

      if (windowConfig.slotAddress) {
        targetSlot = _this.getSlotFromAddress(windowConfig.slotAddress);
      } else {
        targetSlot = _this.focusedSlot || _this.getAvailableSlot();
      }

      windowConfig.appendTo = targetSlot.element;
      windowConfig.state = _this.state;
      windowConfig.eventEmitter = _this.eventEmitter;

      if (!targetSlot.window) {
        windowConfig.slotAddress = targetSlot.layoutAddress;
        windowConfig.id = windowConfig.id || $.genUUID();

        _this.eventEmitter.publish("windowSlotAdded", {id: windowConfig.id, slotAddress: windowConfig.slotAddress});
        newWindow = new $.Window(windowConfig);
        _this.windows.push(newWindow);

        targetSlot.window = newWindow;

        _this.eventEmitter.publish("windowAdded", {id: windowConfig.id, slotAddress: windowConfig.slotAddress});

        _this.eventEmitter.publish(('currentCanvasIDUpdated.' + windowConfig.id), windowConfig.currentCanvasID);
      } else {
        targetSlot.window.element.remove();
        targetSlot.window.update(windowConfig);
        _this.eventEmitter.publish(('currentCanvasIDUpdated.' + windowConfig.id), windowConfig.currentCanvasID);
        // The target slot already has a window in it, so just update that window instead,
        // using the appropriate saving functions, etc. This obviates the need changing the
        // parent, slotAddress, setting a new ID, and so on.
      }
    }
  };
}(Mirador));
