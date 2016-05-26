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

      // y u no work???
      //jQuery('.layout-slot').draggable().resizable();
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
        // simply splitRight on the rigthtmost slot
        _this.splitRight(_this.slots[_this.slots.length - 1]);
      });

      _this.eventEmitter.subscribe('ADD_DRAG_HANDLE', function(event) {
        // create new snap group
        //   create new id
        //   push onto the snapGroups array
        //   use d3 to add the new div to the desktop
        //
        var snapGroup = 'snap-group-' + $.genUUID();
        _this.snapGroups.push(snapGroup);

        // call d3 function
        _this.renderDragHandles();
        //var dragHandles = d3.select('.drag-handle').data
      });

      _this.eventEmitter.subscribe('REMOVE_DRAG_HANDLE', function(event, id) {
        _this.snapGroups = _this.snapGroups.filter(function(e, i, a) {
          return e === id ? false : true;
        });
        _this.renderDragHandles();
        
        // call d3 function
      });

      _this.eventEmitter.subscribe('flex-slot-dragstop', $.debounce(function(event, ui) {
        // publish "flex-slot-drag" event
        var id = ui.helper[0].attributes['data-layout-slot-id'].value;
        _this.slotCoordinates[id].x = ui.position.left;
        _this.slotCoordinates[id].y = ui.position.top;

        // get all id's in the snap-group
        var ids = [id];//, snapGroup = jQuery('.' + ui.helper.hasClassRegEx('^snap-group-')[0]);
        /*
        jQuery.each(snapGroup, function(i, val) {
          var dlsi = val.attributes['data-layout-slot-id'].value;
          if (ids.indexOf(dlsi) === -1) {
            ids.push(dlsi);
            // write to slotCoordinates
            _this.slotCoordinates[dlsi].x = val.offsetLeft;
            _this.slotCoordinates[dlsi].y = val.offsetTop;
          }
        });

        */
        // pass to calculateLayout
        _this.calculateLayout(undefined, ids, undefined);

        var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];
        _this.eventEmitter.publish('layoutChanged', root);

      }, 100));

      _this.eventEmitter.subscribe('flex-slot-resizestop', $.debounce(function(event, ui) {
        // publish "flex-slot-resize" event
        var id = ui.helper[0].attributes['data-layout-slot-id'].value;
        _this.slotCoordinates[id].dx = ui.size.width;
        _this.slotCoordinates[id].dy = ui.size.height;

        var ids = [id];
        _this.calculateLayout(undefined, undefined, ids);

        var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];
        _this.eventEmitter.publish('layoutChanged', root);

      }, 100));

      _this.eventEmitter.subscribe('drag-handle-dragstop', $.debounce(function(event, ui) {
        var id = ui.helper[0].id;
        var ids = [];
        jQuery('.' + id).each(function(i, val) {
          var dlsi = val.attributes['data-layout-slot-id'].value;
          if (ids.indexOf(dlsi) === -1) {
            ids.push(dlsi);
            // write to slotCoordinates
            _this.slotCoordinates[dlsi].x = val.offsetLeft;
            _this.slotCoordinates[dlsi].y = val.offsetTop;
          }
        });
        _this.calculateLayout(undefined, ids, undefined);

        var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];
        _this.eventEmitter.publish('layoutChanged', root);

      }, 100));
    },

    bindEvents: function() {
      var _this = this;

      jQuery('.layout-slot')
      .click(function() {
        // Bring clicked slot to the top
        var elem = this, stack = '.layout-slot';
        var min, group = jQuery.makeArray(jQuery(stack)).sort(function(a, b) { return (parseInt(jQuery(a).css("zIndex"), 10) || 0) - (parseInt(jQuery(b).css("zIndex"), 10) || 0); });

        if (group.length < 1) return;
        min = parseInt(group[0].style.zIndex, 10) || 0;
        jQuery(group).each(function(i) {
          this.style.zIndex = min+i;
        });

        if (elem === undefined) return;
        jQuery(elem).css({'zIndex' : min+group.length});
      })
      .draggable({
        stack: '.layout-slot',
        snap: '.layout-slot, .drag-handle',
        //snapMode: 'outer',
        stop: _this.createSnapGroup 
      }).on('dragstop', $.debounce(function(event, ui) {
        console.log(ui);
        _this.eventEmitter.publish('flex-slot-dragstop', ui);
      }))
      .resizable().on('resizestop', $.debounce(function(event, ui) {
        _this.eventEmitter.publish('flex-slot-resizestop', ui);
      }));
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

    createSnapGroup: function() {

        /* Get the possible snap targets: */
        var snapped = jQuery(this).data('ui-draggable').snapElements; 
        /* Pull out only the snap targets that are "snapping": */
        var snappedTo = jQuery.map(snapped, function(element) {
          return element.snapping ? element.item : null;
        });
        var thissg, sg;

        if (snappedTo.length === 0) {
          // if it had a snap-group class, remove it
          thissg = jQuery(this).hasClassRegEx('^snap-group-');
          if (thissg) {
            jQuery(this).removeClass(thissg[0]);
          }
          return;
        }
        console.log(snappedTo);

        // if dragging a drag-handle, can only snap to layout-slots
        //
        // if dragging a layout-slot, can snap to either drag-handle or layout-slot
       
        if (jQuery(this).hasClass('layout-slot')) {

          // if snapping to drag-handle, add that drag-handle's id as a class
          // else, snapping to a layout slot
          if (jQuery(snappedTo).hasClass('drag-handle')) {
            jQuery(this).addClass(jQuery(snappedTo)[0].id);
          } else if (jQuery(snappedTo).hasClass('layout-slot')) {
            // check if it has a snap group
            sg = jQuery(snappedTo).hasClassRegEx('^snap-group-');
            thissg = jQuery(this).hasClassRegEx('^snap-group-');
            if (sg) {
              // adopt that snap-group
              if (thissg) {
                jQuery(this).removeClass(thissg[0]).addClass(sg[0]);
              } else {
                jQuery(this).addClass(sg[0]);
              }
            }
            // if it doesn't have a snap-group, don't do anything

          } else {
            // TODO: throw error
          }
        } else if (jQuery(this).hasClass('drag-handle')) {
          // give the snapped to element its id
          // if the snappedTo element doesn't have a snap-group class, add a new one

          sg = jQuery(snappedTo).hasClassRegEx('^snap-group-');
          if (!sg) {
            jQuery(snappedTo).addClass(jQuery(this)[0].id);
          }

        } else {
          // TODO: problem, throw exception
        }
/*
        // check to see if the dragged element has a snap-group
        // if so, use it as the snap group list
        // else, use empty list
        // then, append to that list the snap-group for each snapped to element (if the element has one)
        var snapGroupListOfDraggedElement = jQuery(this).hasClassRegEx('^snap-group-');
        var snapGroupList;
        var draggedElementHasSnapGroup;

        if (snapGroupListOfDraggedElement) {
          snapGroupList = snapGroupListOfDraggedElement; 
          draggedElementHasSnapGroup = true;
        } else {
          snapGroupList = [];
          draggedElementHasSnapGroup = false;
        }
        jQuery.each(snappedTo, function(idx, element) {
          // get the base class of the snapped to obj
          var snapGroup = jQuery(element).hasClassRegEx('^snap-group-')[0];
          if (snapGroup && snapGroupList.indexOf(snapGroup) === -1) {
            snapGroupList.push(snapGroup);
          }
        }); 

        var newSnapGroup;
        if (snapGroupList.length === 0) {
          newSnapGroup = 'snap-group-' + $.genUUID();
          // add the class to all the elems
          jQuery(snappedTo).addClass(newSnapGroup);
          jQuery(this).addClass(newSnapGroup);
        } else if (snapGroupList.length === 1) {
          // add this class to the elements
          if (draggedElementHasSnapGroup) {
            // add it to the others
            jQuery(snappedTo).addClass(snapGroupList[0]);
          } else {
            // add it to this
            jQuery(this).addClass(snapGroupList[0]);
          }
        } else {
          // use the first snap-group for all the elements
          newSnapGroup = snapGroupList[0];
          var deleteSnapGroups = snapGroupList.slice(1); 
          jQuery.each(deleteSnapGroups, function(idx, element) {

            // remove the old snap group class and add the new one
            jQuery('.' + element).removeClass('.' + element).addClass(newSnapGroup);
          });
        }
        
        // call draggable on the elems
        jQuery('.ui-draggable.' + newSnapGroup)
        .draggable({
          multiple: {
            items: function getSelectedItems() {
              return jQuery('.ui-draggable.' + newSnapGroup);
            },
            beforeStart: jQuery.noop,
            beforeStop: function beforeDragStop(jqEvent, ui) {
              console.log(this, jqEvent, ui);
            }
          },
          stack: '.layout-slot',
          snap: true,
          //snapMode: 'outer',
          stop: createSnapGroup
        });
        */
      },

    renderDragHandles: function() {
      var _this = this;
      var n = _this.snapGroups.length;
      var handles = d3.selectAll('.drag-handle').data(_this.snapGroups);
      handles.enter().append('div')
        .attr('id', function(d) { return d; })
        .attr('class', 'drag-handle')
        .style('left', 50*n + 'px')
        .style('top', 50*n + 'px')
        .style('width', '25px')
        .style('height', '25px')
        .style('background-color', 'red')
        .style('position', 'absolute')
        .style('border-top-left-radius', '8px')
        .style('border-top-right-radius', '8px')
        .call(function(d) {
          console.log('this is what we"re attaching the handler to:', d[0][d[0].length - 1]);
          var getSnapGroup = function() { return jQuery(d[0][d[0].length - 1])[0].id; };
          jQuery(d[0][d[0].length - 1]).draggable({
            multiple: {
              items: function getSelectedItems() {
                console.log('getSelectedItems', d, getSnapGroup());
                return jQuery('.ui-draggable.' + getSnapGroup());
              },
              beforeStart: jQuery.noop,
              beforeStop: function beforeDragStop(jqEvent, ui) {
                console.log(this, jqEvent, ui);
              }
            },
            snap: '.layout-slot',
            snapMode: 'outer',
            stop: _this.createSnapGroup
          }).on('dragstop', $.debounce(function(event, ui) {
            console.log(ui);
            _this.eventEmitter.publish('drag-handle-dragstop', ui);
          }));
        });
      handles.exit().remove('div');
    },

    calculateLayout: function(resetting, draggedIDs, resizedIDs) {
      var _this = this,
      layout,
      divs;

      // if flexible layout is enabled, do not use isfahan
      // instead, use flexible layout settings for width, height, and offset

/*
      if ($.DEFAULT_SETTINGS.flexibleWorkspace === true) {
        // 
        console.log('hi');
    // create layout representation of the windows - a list of objects
    // with 5 properties: id, x, y, dx, dy
    layout = [];
        for (var i = 0; i < parseInt(_this.layoutDescription.nSlots); i++)
    {
      layout[i] = {
        id: $.genUUID(),
        x: 50 + 50 * i,
        y: 50 + 50 * i,
        dx: 500,
        dy: 500
      };

    }
    _this.layout = layout;

        divs = d3.select("#" + _this.element.attr('id')).selectAll(".layout-slot")
        .data(layout, function(d) { return d.id; });

        divs.enter().append("div")
        .attr("class", "layout-slot")
        .attr("data-layout-slot-id", function(d) { return d.id; })
        .call(cell)
        .each(function(d) {
          var appendTo = _this.element.children('div').filter('[data-layout-slot-id="'+ d.id+'"]')[0];
          _this.slots.push(new $.Slot({
            slotID: d.id,
            focused: true,
            appendTo: appendTo,
            state: _this.state
          }));
        });

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
        });
        _this.eventEmitter.publish("layoutChanged", layout);
        _this.eventEmitter.publish('slotsUpdated', {slots: _this.slots});

        return;
      }
      */

      // save layout description
      //
      
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




/*

            if (keyy) {
              if (!_this.slotCoordinates[keyy]) {
                _this.slotCoordinates[keyy] = {};
                // use default vals.
              _this.slotCoordinates[keyy].x = slotX * (p + 1);
              _this.slotCoordinates[keyy].y = slotY * (p + 1);
              _this.slotCoordinates[keyy].dx = slotDX;
              _this.slotCoordinates[keyy].dy = slotDY;
              }





          // save layout description
          //
          // iterate over _this.layoutDescription.children and store in _this.slotCoordinates
       


            else {
              // save only if key is not the dragged id
              }
            }
            }
          }
        //}
        
      }
*/
      _this.layout = layout = new Isfahan({
        containerId: _this.element.attr('id'),
        layoutDescription: _this.layoutDescription,
        configuration: null,
        padding: 3 
      });

      // if felx workspace is enabled
      //   go thru _this.layout and load the coords into the children attr

      if ($.DEFAULT_SETTINGS.flexibleWorkspace === true) {

        var children = _this.layout[0].children;
        /*
        _this.nSlots = children.length;
        if (!_this.slotCoordinates) {
          // if we are initializing the workspace, then cascade windows
          // TODO: try to stop this function from executing more than once
          console.log('FLEXIBLE_DESKTOP_ENABLED');
    
          _this.slotCoordinates = {};
          for (var i = 0; i < children.length; i++) {

            children[i].x = slotX * (i + 1);
            children[i].y = slotY * (i + 1);
            children[i].dx = slotDX;
            children[i].dy = slotDY;
    
            // save the coordinates
            _this.slotCoordinates[children[i].id] = {};
            _this.slotCoordinates[children[i].id].x = children[i].x;
            _this.slotCoordinates[children[i].id].y = children[i].y;
            _this.slotCoordinates[children[i].id].dx = children[i].dx;
            _this.slotCoordinates[children[i].id].dy = children[i].dy;
          }

        } else {
        */
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
          /*
        }
        */
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
      _this.bindEvents();

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
