/*jshint scripturl:true*/
(function($) {

  $.Workspace = function(options) {

    jQuery.extend(true, this, {
      workspaceSlotCls: 'slot',
      focusedSlot:      null,
      slots:            [],
      snapGroups:       { groups: [], byWindow: {}, windowGraph: new $.Graph() },
      windows:          [],
      appendTo:         null,
      layoutDescription:    null,
      state:            null,
      lockController:   null,
      eventEmitter:     null
    }, options);

    var uid = $.genUUID();
    this.element  = this.element || jQuery('<div class="workspace-container" id="workspace-'+uid+'">');
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

      this.restoreSnapGroups();
      this.renderDragHandles();

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

      /*
       * Adds a flexible slot to the workspace when flexible desktop is enabled.
       */
      _this.eventEmitter.subscribe('ADD_FLEXIBLE_SLOT', function(event) {
        // splitRight on the rigthtmost slot
        _this.splitRight(_this.slots[_this.slots.length - 1]);
      });

      /*
       * Adds a draghandle DOM element (for moving multiple snapped windows) to the workspace,
       * and a new snapgroup under the covers.
       */
      _this.eventEmitter.subscribe('ADD_DRAG_HANDLE', function(event) {
        _this.createSnapGroup();
        _this.renderDragHandles();
        _this.saveSnapGroupState();
      });

      _this.eventEmitter.subscribe('BROWSER_VIEWPORT_RESIZED', function(event) {
        _this.resizeDraggableBoundingBoxes();
      });

      _this.eventEmitter.subscribe('ADD_DUPLICATE_WINDOW', function(event, config) {
        // add blank slot
        _this.eventEmitter.publish('ADD_FLEXIBLE_SLOT');
        config.slotAddress = _this.getAvailableSlot().layoutAddress;
        // instantiate the blank slot
        _this.eventEmitter.publish('ADD_WINDOW', config);
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

    // reset the draggable area bounding boxes when the browser viewport is resized
    resizeDraggableBoundingBoxes: function() {
      ['layout-slot.ui-draggable', 'drag-handle.ui-draggable'].forEach(function(i) {
        jQuery('.' + i).draggable('option', 'containment', $.getWorkspaceBoundingBox(i));
      });
    },

    /*
     * Get the number of snapgroups.
     */
    countSnapGroups: function() {
      return this.snapGroups.groups.length;
    },

    /*
     * Creates a new snapGroup and returns its UUID.
     */
    createSnapGroup: function() {
      var id = $.genUUID();
      this.snapGroups.groups.push({
        'name': 'snap-group-' + id,
        'windows': [],
        'left': undefined,
        'top': undefined
      });
      return id;
    },

    /*
     * Deletes the snapGroup with the given name.
     *
     * @param {string} sgname Name of the snapGroup to remove.
     */
    deleteSnapGroup: function(sgname) {
      var _this = this;
      
      // remove from byWindow all key-value pairs that have sgname
      jQuery.each(_this.snapGroups.byWindow, function(k, v) {
        if (v === sgname) {
          delete _this.snapGroups.byWindow[k];
        }
      });

      // remove from groups
      this.snapGroups.groups = this.snapGroups.groups.filter(function(e) {
        return e.name === sgname ? false : true;
      });
    },

    /*
     * Add a window to the snapGroup.
     *
     * @param {Array} windowNamesList A list of the data-layout-slot-id strings of windows to add
     * @param {string} sgname Name of snapGroup
     */
    addToSnapGroup: function(windowNamesList, sgname) {
      // add to windows array of the snapGroup object
      var _this = this;
      windowNamesList.forEach(function(f) {
        if (_this.snapGroups.byWindow[f] === undefined) {
          _this.getSnapGroupObject(sgname).windows.push(f);

          // add to byWindow
          _this.snapGroups.byWindow[f] = sgname;
        }
      });
    },

    /* 
     * Remove a window from its snapGroup.
     *
     * @param {Array} windowNamesList A list of the data-layout-slot-id strings of windows to remove
     */
    removeFromSnapGroup: function(windowNamesList) {
      // remove from windows array of the snapGroup object
      var _this = this;
      windowNamesList.forEach(function(f) {
        var sg = _this.getSnapGroupNameOfWindow(f);
        if (sg) {
          sg = _this.getSnapGroupObject(sg);
          sg.windows = sg.windows.filter(function(e) {
            return e !== f;
          });
          // remove from byWindow
          delete _this.snapGroups.byWindow[f];
        }
      });

    },

    /*
     * Get the name of the snapGroup that the window with given name belongs to.
     *
     * @param {string} windowName The data-layout-slot-id of the window to find the snapGroup of
     * @return {string}
     */
    getSnapGroupNameOfWindow: function(windowName) {
      return this.snapGroups.byWindow[windowName];
    },

    /*
     * Gets the snapGroup object that has the given name, or undefined if there is none.
     *
     * @param {string} sgname Name of snapGroup to find.
     * @return {Array | undefined}
     */
    getSnapGroupObject: function(sgname) {
      var sglist = this.snapGroups.groups.filter(function(elt) {
        return elt.name === sgname;
      });
      if (sglist.length === 1) {
        return sglist[0];
      }
      else {
        return undefined;
      }
    },

    /*
     * Saves the snapGroup state to localStorage.
     */
    saveSnapGroupState: function() {
      this.eventEmitter.publish('snapGroupStateChanged', this.snapGroups);
    },

    /*
     * Restores the snapGroup state from localStorage.
     */
    restoreSnapGroups: function() {
      var reviver = function(k, v) {
        if (k === 'windowGraph') {
          // value is a $.Graph object
          return new $.Graph(v.node_list);
        }
        else { return v; }
      };

      var savedSettings = this.state.getStateProperty('snapGroupState');
      if (savedSettings !== undefined) {
        this.snapGroups = JSON.parse(savedSettings, reviver);
        jQuery.each(this.snapGroups.byWindow, function(k, v) {
          jQuery('[data-layout-slot-id="'+ k +'"]').addClass(v);
        });
      }
    },

    isInSnapGroup: function(windowName, sgname) {
      return this.snapGroups.byWindow[windowName] === sgname;
    },

    updateDragHandlePosition: function(sgname, pos) {
      var sg = this.getSnapGroupObject(sgname);
      sg.left = pos.left + 'px';
      sg.top = pos.top + 'px';
    },

    /*
     * returns:
     *
     * {
     *   thisElt
     *   targetElts (can be heterogeneous!) {
     *     windows:
     *     dragHangle:
     * }
     */
    getSnapTargets: function(that) {

      /**
       * Get the name of the snap group that corresponds to a give jQuery selection.
       *
       * @param {jQuery selection} selection A jQuery selection that can contain layout-slots
       *     and drag-handles.
       * @return {false | Array} This returns either false or a one-element array.
       */
      function extractSnapGroupName(selection) {
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
        return selection.filter('.layout-slot').toArray().reduce(function(p, c) {
          if (p !== false) {
            return p;
          } else {
            return jQuery(c).hasClassRegEx(re);
          }
        }, false) || getDragHandleId(selection.filter('.drag-handle'));
      }
  
      // Get the possible snap targets, then pull out only the snap targets that are "snapping"
      // thisSnapGroup and targetSnapGroup will either be single-element lists, or false
      var snapTargets = jQuery(this).data('ui-draggable').snapElements,
      snappedTargets = jQuery.map(snapTargets, function(element) {
        return element.snapping ? element.item : null;
      }),
      thisElt = jQuery(this),
      thisSlotID = thisElt.attr('data-layout-slot-id'),
      thisSnapGroup = extractSnapGroupName(thisElt),

      targetElts = jQuery(snappedTargets),
      targetSlotIDs = targetElts.filter('.layout-slot').map(function(i, e) {
        return jQuery(e).attr('data-layout-slot-id');
      }).toArray(),
      targetHandleID = targetElts.filter('.drag-handle').attr('id');

      return {
        thisSlotID: thisSlotID,
        thisSnapGroup: thisSnapGroup !== false ? thisSnapGroup[0] : undefined,
        targetSlotIDs: targetSlotIDs,
        targetHandleID: targetHandleID,
      };
    },

    /**
     * Updates the snap-group classes on the DOM elements,
     * and updates the data model to reflect the DOM state.
     *
     * Called by the drag-stop events on elements with classes drag-handle and layout-slot.
     *
     * @param {Object} that Reference to a Workspace object
     * NOTE: this function is called so that {this} refers to the DOM element that has stopped dragging
     */
    updateConnectivityGraphAndClasses: function(st) {

      var _this = this,
      wg = _this.snapGroups.windowGraph,
      oldConnectedSlots,
      newConnectedSlots,
      oldSnapGroup,
      newSnapGroup,
      enteringSlots,
      exitingSlots;

      switch (st.option) {
        case 'addWindow':
          wg.addNode(st.eltName, []);
          break;
        case 'dragWindow':
          // get list of nodes that were connected to the window before dragging
          oldConnectedSlots = wg.getConnectedNodeNames(st.thisSlotID, []);
          // update the graph
          wg.updateNodeEdges(st.thisSlotID, st.targetSlotIDs);
          // get new list of connected windows
          newConnectedSlots = wg.getConnectedNodeNames(st.thisSlotID, []);

          // if thisElement was connected to a drag handle before the move, remove it
          if (st.thisSnapGroup !== undefined) {
            // remove old handle if it exists on thisSlot
            wg.removeDragHandle(st.thisSnapGroup, [st.thisSlotID]);

            // remove the class if the windows are no longer connected to that old drag handle
            // so, either connected to 1) a different handle, or 2) none at all
            exitingSlots = oldConnectedSlots.filter(function(e) {
              return wg.getDragHandle(e) !== st.thisSnapGroup;
            });
            // update date model and DOM
            this.removeFromSnapGroup(exitingSlots);
            this.reassignClasses(st.thisSnapGroup, [], exitingSlots);
          }

          // if this window is now adjacent to the drag handle, add it to the node
          if (st.targetHandleID !== undefined) {
            wg.addDragHandle(st.targetHandleID, [st.thisSlotID]);
          }
          newSnapGroup = wg.getDragHandle(st.thisSlotID);

          // if targetElts contains a drag handle, add it to the node
          if (newSnapGroup !== undefined) {
            // update date model and DOM
            this.addToSnapGroup(newConnectedSlots, newSnapGroup);
            this.reassignClasses(newSnapGroup, newConnectedSlots, []);
          }
          break;
        case 'dragHandle':
          // make sure that there aren't any drag handles already connected
          if (wg.getDragHandle(st.targetSlotIDs[0]) !== undefined && wg.getDragHandle(st.targetSlotIDs[0]) !== st.thisSnapGroup) {
            alert('Only one drag handle per group!');
            // TODO: move handle to previous position
            return;
          }
          enteringSlots = st.targetSlotIDs.reduce(function(p, c) {
            return _.union(p, wg.getConnectedNodeNames(c, []));
          }, []);
          wg.addDragHandle(st.thisSnapGroup, st.targetSlotIDs);

          // for each window connected to the target elements, update data model and DOM
          this.addToSnapGroup(enteringSlots, st.thisSnapGroup);
          this.reassignClasses(st.thisSnapGroup, enteringSlots, []);
          break;
        case 'removeWindow':
          // get list of windows connected to the window that is being removed
          oldConnectedSlots = wg.getConnectedNodeNames(st.eltName, []);
          // all windows connected to st.eltName will have same drag handle
          oldSnapGroup = wg.getDragHandle(st.eltName);
          // delete window from the graph
          wg.removeNode(st.eltName);
          newConnectedSlots = _.difference(oldConnectedSlots, [st.eltName]);

          // remove the slots that are no longer connected to the drag handle
          exitingSlots = newConnectedSlots.filter(function(e) {
            return wg.getDragHandle(e) !== oldSnapGroup;
          });
          // update data model and DOM
          this.removeFromSnapGroup(exitingSlots);
          this.reassignClasses(oldSnapGroup, [], exitingSlots);
          break;
        case 'removeHandle':
          // remove drag handle from graph, and update DOM (data model was updated by caller)
          wg.removeDragHandle(st.eltName);
          this.reassignClasses(st.eltName, [], jQuery('.' + st.eltName));
          break;
      }
    },

    /* Add or remove classes based on graph
     * @param {string} name Name of class
     * @param {Array | jQuery} enter Nodes to add to that class. Can be either a list of ids or jQuery selection
     * @param {Array | jQuery} exit Nodes to remove from that class. Can be either a list of ids or jQuery selection
     */
    reassignClasses: function(name, enter, exit) {

      var reduceFn = function(p, c) {
        return p.add(jQuery('[data-layout-slot-id="'+ c +'"]'));
      };
      
      var a = enter instanceof jQuery ? enter : enter.reduce(reduceFn, jQuery());
      var b = exit instanceof jQuery ? exit : exit.reduce(reduceFn, jQuery());

      a.addClass(name);
      b.removeClass(name);
    },

    /**
     * Use d3 to render the dragHandles.
     */
    renderDragHandles: function() {
      // TODO: change the d3.select to use '#workspace-XXX-XX-XXXX'
      var _this = this,
      n = _this.countSnapGroups(),
      assocSnapGroup;

      handles = d3.select('.workspace-container').selectAll('.drag-handle').data(_this.snapGroups.groups, function(d) { 
        // binds data to element by id, so that when an item is removed from _this.snapGroups,
        // the DOM element with corresponding #id is removed, instead of the most recently added element
        return d.name;
      }),
      handlesDiv = handles.enter().append('div')
        .attr('id', function(d) { return d.name; })
        .classed({'drag-handle': true})
        .style({
          'background-color': 'red',
          'border-top-left-radius': '8px',
          'border-top-right-radius': '8px',
          'height': '25px',
          'position': 'absolute',
          'width': '100px'
        })
        .on('click', function() {
          // Bring clicked window to the top
          $.bringEltToTop.call(this, '.layout-slot, .drag-handle');
          d3.event.stopPropagation();
        })
        .each(function(d) {
          // make this a draggable element that can drag multiple other draggable elements
          jQuery(this).draggable({
            containment: $.getWorkspaceBoundingBox('drag-handle.ui-draggable'),
            multiple: {
              items: function getSelectedItems() {
                return jQuery('.ui-draggable.' + d.name);
              },
              beforeStart: jQuery.noop,
            },
            snap: '.layout-slot',
            snapMode: 'outer',
            stop: function(event, ui) {
              // save coordinates of associated slots before calculating layout
              var dragHandle = ui.helper[0];
              var slotIDs = [];
              jQuery('.' + dragHandle.id).each(function(i, val) {
                var dlsi = val.attributes['data-layout-slot-id'].value;
                slotIDs.push(dlsi);
                // write to slotCoordinates
                _this.slotCoordinates[dlsi].x = val.offsetLeft;
                _this.slotCoordinates[dlsi].y = val.offsetTop;
              });

              _this.calculateLayout(undefined, slotIDs, undefined);
      
              // TODO:
              // if there are any snappedTargets
              //   update the connectivity graph
              //   re-assign snapGroup class (remove or add) for each affected node
              var st = _this.getSnapTargets.call(this, _this);
              if (st.targetSlotIDs.length > 0) {
                _this.updateConnectivityGraphAndClasses(jQuery.extend({option: 'dragHandle'}, st));
              }
              _this.updateDragHandlePosition(dragHandle.id, jQuery(dragHandle).position());
              _this.saveSnapGroupState();
            }
          });

          // set the position of the new dragHandle
          assocSnapGroup = _this.getSnapGroupObject(d.name);
          if (assocSnapGroup.left === undefined && assocSnapGroup.top === undefined) {
            // new dragHandle, so give it the defaults and update the data model
            var windowDims = $.getBrowserViewportDimensions(),
                ll = Math.floor((windowDims.x - 100)/2),
                tt = Math.floor((windowDims.y - 25)/2);
            d3.select(this).style({'left': ll + 'px', 'top': tt + 'px'});
            _this.updateDragHandlePosition(d.name, {'left': ll, 'top': tt});

            // bring it to front
            $.bringEltToTop.call(this, '.layout-slot, .drag-handle');
          }
          else {
            // restoring a dragHandle, so set only the style
            d3.select(this).style({'left': assocSnapGroup.left, 'top': assocSnapGroup.top});
          }
        }),
      handlesDivA = handlesDiv.append('a')
        .attr('href', 'javascript:;')
        .classed({'drag-handle-remove': true})
        .on('click', function(d) {
          _this.deleteSnapGroup(d.name);
          _this.renderDragHandles();
          d3.event.stopPropagation();
        });

      handlesDivA.append('i')
        .attr('float', 'left')
        .classed({'fa fa-times': true})
        .style('padding', '4px');

      handles.exit().remove('div')
        .each(function(d) {
          _this.updateConnectivityGraphAndClasses({option: 'removeHandle', eltName: d.name});
          _this.saveSnapGroupState();

          // de-register the removed dragHandle's layout-slots
          //jQuery('.layout-slot.' + d.name).removeClass(d.name);
        });
    },

    /*
     * Calculates and sets the layout of the workspace.
     *
     * This method is made much more complicated due to the requirements of the flexible workspace.
     * Mirador uses a package called Isfahan (also developed by Stanford University Libraries) to
     * manage the slot (window) layout of the workspace. In the original code that ships with Mirador,
     * the workspace slots are laid out in a grid so that each of them always have identical dimensions.
     *
     * For the flexible workspace, there is no such requirement of uniformity of dimensions or conformance
     * to a grid layout. However, Isfahan describes the layout in a way that is expected by many other
     * parts of the code, so instead of ripping it out completely, I've "sidestepped" the part of it that 
     * I don't want (specifically, it's setting of position and dimensions of the windows).
     *
     * Basically, each time this function is called:
     *
     * 1) the subset of nodes in the layoutDescription object whose position and dimensions that we want to
     * save are saved in the _this.slotCoordinates object
     * 2) Isfahan is called to alter the layoutDescription object
     * 3) the subset of nodes in the layoutDescription object whose data we saved in step 1 are restored
     * using said data
     *
     * To make things more complicated, this is not the only function that writes to _this.slotCoordinates (the resizestop and dragstop callbacks for '.layout-slot's also do). The rule is this:
     *
     * Whatever is stored in _this.slotCoordinates before Isfahan is called represents what will be the 
     * end state of the workspace when this function returns.
     *
     * @param {boolean} resetting
     *   Passed in from Workspace.resetLayout (not used with flex workspace)
     * @param {Array} draggedIDs
     *   List of slot IDs that have just finished dragging
     * @param {Array} resizedIDs
     *   List of slot IDs that have just finished resizing
     */
    calculateLayout: function(resetting, draggedIDs, resizedIDs) {
      var _this = this,
      layout,
      divs,

      // default slot window dimensions, in pixels
      slotX = 50,
      slotY = 50,
      slotDX = 750,
      slotDY = 750,

      children,
      child,
      tscKey,
      
      // will call $.bringToFront() on these
      newNodesBringToFront = [];

      /*
       * Saves the slotCoordinates from the given layout node,
       * called before Isfahan resets everything.
       *
       * @param {Object} node A layout node to save the settings of.
       */
      function saveToSlotCoordinates(node) {
        var tscKey = node.id,
        areDragging = draggedIDs !== undefined && draggedIDs.indexOf(tscKey) !== -1,
        areNotDragging = draggedIDs === undefined || draggedIDs.indexOf(tscKey) === -1,
        areNotResizing = resizedIDs === undefined || resizedIDs.indexOf(tscKey) === -1;

        if (node.x && node.y && node.dx && node.dy) {
            
          // tscKey is the key to use for _this.slotCoordinates (tsc)
          if (!_this.slotCoordinates[tscKey]) {
            _this.slotCoordinates[tscKey] = {};
          }

          // if we are dragging, the width and height of the window have not changed,
          // so save what we already have in the current node of _this.layoutDescription
          if (areDragging) {
            _this.slotCoordinates[tscKey].dx = node.dx;
            _this.slotCoordinates[tscKey].dy = node.dy;
          }

          // if we are neither resizing or dragging the current node,
          // _this.layoutDescription already contains the correct data for the current node,
          // so save all of it
          if (areNotDragging && areNotResizing) {
            _this.slotCoordinates[tscKey].x = node.x;
            _this.slotCoordinates[tscKey].y = node.y;
            _this.slotCoordinates[tscKey].dx = node.dx;
            _this.slotCoordinates[tscKey].dy = node.dy;
          }
        }
      }

      // Step 1
      // if we have already generated a layout, either restoring from localStorage or using the one from
      // this session
      if ($.DEFAULT_SETTINGS.flexibleWorkspace === true && typeof _this.layoutDescription === 'object') {
        if (!_this.slotCoordinates) {
          // need to initialize in case we are restoring a saved workspace
          _this.slotCoordinates = {};
        }

        // this means we've initialized the workspace already, and need to save what we've got
        if (_this.layoutDescription.id) { 
          children = _this.layoutDescription.children;
          if (children !== undefined) { // then it is array
            children.forEach(saveToSlotCoordinates);
          }
          else {
            // one window
            saveToSlotCoordinates(_this.layoutDescription);
          }
        }
      }

      // Step 2
      // use Isfahan for everything but the slot window dimensions. Will restore them from _this.slotCoordinates
      _this.layout = layout = new Isfahan({
        containerId: _this.element.attr('id'),
        layoutDescription: _this.layoutDescription,
        configuration: null,
        padding: 3
      });

      // Step 3
      // if flex workspace is enabled, go through the layout obj and restore the saved coordinates
      if ($.DEFAULT_SETTINGS.flexibleWorkspace === true) {

        children = _this.layout[0].children !== undefined ? _this.layout[0].children : _this.layout;
        children.forEach(function(child, j) {
          tscKey = child.id;

          // if _this.slotCoordinates doesnt have anything for this children item, new window
          if (!_this.slotCoordinates[tscKey]) {
            var windowDims = $.getBrowserViewportDimensions();
            _this.slotCoordinates[tscKey] = {};
            _this.slotCoordinates[tscKey].x = Math.floor((windowDims.x - slotDX)/2);
            _this.slotCoordinates[tscKey].y = slotY;
            _this.slotCoordinates[tscKey].dx = slotDX;
            _this.slotCoordinates[tscKey].dy = slotDY;

            newNodesBringToFront.push(tscKey);
          }

          // restore the layout object
          child.x = _this.slotCoordinates[tscKey].x;
          child.y = _this.slotCoordinates[tscKey].y;
          child.dx = _this.slotCoordinates[tscKey].dx;
          child.dy = _this.slotCoordinates[tscKey].dy;
        });
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

        // bring to front
        if (newNodesBringToFront.indexOf(d.id) !== -1) {
          $.bringEltToTop.call(this, '.layout-slot, .drag-handle');
        }

        _this.updateConnectivityGraphAndClasses({option: 'addWindow', eltName: d.id});

        jQuery(this)
        .draggable({
          containment: $.getWorkspaceBoundingBox('layout-slot.ui-draggable'),
          handle: '.manifest-info',
          stack: '.layout-slot',
          snap: '.layout-slot, .drag-handle',
          //snapMode: 'outer',
          stop: function(event, ui) {
            // save slot left/top to localstorage, so that they aren't overwritten by calculateLayout
            var id = ui.helper[0].attributes['data-layout-slot-id'].value;
            _this.slotCoordinates[id].x = ui.position.left;
            _this.slotCoordinates[id].y = ui.position.top;
    
            var slotIDs = [id];
            _this.calculateLayout(undefined, slotIDs, undefined);
    
            // TODO: implement
              // update the connectivity graph based on the snappedTargets
              // re-assign snapGroup class (remove or add) for each affected node
            var st = _this.getSnapTargets.call(this, _this);
            _this.updateConnectivityGraphAndClasses(jQuery.extend({option: 'dragWindow'}, st));
            _this.saveSnapGroupState();
          }
        })
        .resizable({
          handles: "n, e, s, w, ne, nw, se, sw"
        })
        .on('resizestop', function(event, ui) {
          // save slot height/width to localstorage, so that they aren't overwritten by calculateLayout
          var id = ui.helper[0].attributes['data-layout-slot-id'].value;
          _this.slotCoordinates[id].dx = ui.size.width;
          _this.slotCoordinates[id].dy = ui.size.height;
          // save position too since we might be changing the top/left value
          _this.slotCoordinates[id].x = ui.position.left;
          _this.slotCoordinates[id].y = ui.position.top;

          var slotIDs = [id];
          _this.calculateLayout(undefined, undefined, slotIDs);

          // fit image choice menu to the new window size
          _this.eventEmitter.publish('fitImageChoiceMenu');
        });
      })
      .on('click', function() {
        // Bring clicked window to the top
        $.bringEltToTop.call(this, '.layout-slot, .drag-handle');
        d3.event.stopPropagation();
      });

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

        _this.updateConnectivityGraphAndClasses({option: 'removeWindow', eltName: d.id});
        _this.saveSnapGroupState();
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
      nodeList = jQuery.grep(_this.layout, function(node) { return node.id === targetSlot.slotID; }),
      node = ($.DEFAULT_SETTINGS.flexibleWorkspace && _this.slots.length === 1 && nodeList.length === 2) ? nodeList[1] : nodeList[0],
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
          canvasID: window.canvasID,
          viewType: window.viewType
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

        //extend the windowConfig with the default settings
        var mergedConfig = jQuery.extend(true, {}, _this.state.getStateProperty('windowSettings'), windowConfig);

        //"rename" some keys in the merged object to align settings parameters with window parameters
        if (mergedConfig.loadedManifest) {
          // TODO: remove the second || operand, after our manifests are not named with a trailing .json
          mergedConfig.manifest = _this.state.getStateProperty('manifests')[mergedConfig.loadedManifest] || _this.state.getStateProperty('manifests')[mergedConfig.loadedManifest + '.json'];
          delete mergedConfig.loadedManifest;
        }

        if (mergedConfig.bottomPanel) {
          mergedConfig.bottomPanelAvailable = mergedConfig.bottomPanel;
          delete mergedConfig.bottomPanel;
        }

        if (mergedConfig.sidePanel) {
          mergedConfig.sidePanelAvailable = mergedConfig.sidePanel;
          delete mergedConfig.sidePanel;
        }

        if (mergedConfig.overlay) {
          mergedConfig.overlayAvailable = mergedConfig.overlay;
          delete mergedConfig.overlay;
        }

        // add lockGroups
        mergedConfig.lockController = _this.lockController;

        newWindow = new $.Window(mergedConfig);
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
