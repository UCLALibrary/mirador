(function($) {

  $.Window = function(options) {

    jQuery.extend(this, {
      state:             null,
      eventEmitter:      null,
      element:           null,
      scrollImageRatio:  0.9,
      canvasID:          null,
      // key-value store of canvasIDs to choiceImageIDs
      choiceImageIDs:    {},
      focusImages:       [],
      imagesList:        null,
      annotationsList:   [],
      endpoint:          null,
      lockController:    null,
      currentImageMode:  'ImageView',
      imageModes:        ['ImageView', 'BookView'],
      originalImageModes:['ImageView', 'BookView'],
      focuses:           ['ThumbnailsView', 'ImageView', 'ScrollView', 'BookView'],
      focusModules:           {'ThumbnailsView': null, 'ImageView': null, 'ScrollView': null, 'BookView': null},
      focusOverlaysAvailable: {
        'ThumbnailsView': {
          'overlay' : {'MetadataView' : false},
          'bottomPanel' : {'' : false}
        },
        'ImageView': {
          'overlay' : {'MetadataView' : false},
          'bottomPanel' : {'ThumbnailsView' : true}
        },
        'ScrollView': {
          'overlay' : {'MetadataView' : false},
          'bottomPanel' : {'' : false}
        },
        'BookView': {
          'overlay' : {'MetadataView' : false},
          'bottomPanel' : {'ThumbnailsView' : true}
        }
      },
      windowOptions: null,
      sidePanel: null, //the actual module for the side panel
      annotationsAvailable: {
        'ThumbnailsView' : false,
        'ImageView' : true,
        'ScrollView' : false,
        'BookView' : false
      },
      bottomPanel: null, //the actual module for the bottom panel
      overlay: null,
      annoEndpointAvailable : false,
      iconClasses: {
        "ImageView" : "fa fa-photo fa-lg fa-fw",
        "BookView" : "fa fa-columns fa-lg fa-fw",
        "ScrollView" : "fa fa-ellipsis-h fa-lg fa-fw",
        "ThumbnailsView" : "fa fa-th fa-lg fa-rotate-90 fa-fw"
      }
    }, options);


    /*
     * Creates a string of HTML list items to add to each window menu for the lock groups.
     *
     * @param {Array} items An array of names of lock groups
     */
    // TODO: is this needed?
    /*
    Handlebars.registerHelper('list2', function(items) {
      var out = ''; 
      for(var i=0, l=items.length; i<l; i++) {
        out = out + "<li class='lock-options-list-item add-to-lock-group'>" + items[i] + "</li>";
      }   
      return out;
    });
    */

    this.init();
    this.bindAnnotationEvents();
  };

  $.Window.prototype = {
    init: function () {
      var _this = this,
      manifest = _this.manifest.jsonLd,
      focusState = _this.viewType,
      templateData = {};

      //make sure annotations list is cleared out when changing objects within window
      while(_this.annotationsList.length > 0) {
        _this.annotationsList.pop();
      }
      //unsubscribe from stale events as they will be updated with new module calls
      _this.eventEmitter.unsubscribe(('currentCanvasIDUpdated.' + _this.id));

      _this.removeBookView();

      //reset imagemodes and then remove any imageModes that are not available as a focus
      this.imageModes = this.originalImageModes;
      this.imageModes = jQuery.map(this.imageModes, function(value, index) {
        if (jQuery.inArray(value, _this.focuses) === -1) return null;
        return value;
      });

      _this.imagesList = _this.manifest.getCanvases();

      // if no canvasID, use the first canvas
      if (!_this.canvasID) {
        _this.canvasID = _this.imagesList[0]['@id'];
      }

      this.annoEndpointAvailable = !jQuery.isEmptyObject(_this.state.getStateProperty('annotationEndpoint'));
      if (!this.canvasControls.annotations.annotationLayer) {
        this.canvasControls.annotations.annotationCreation = false;
        this.annoEndpointAvailable = false;
        this.canvasControls.annotations.annotationState = 'annoOff';
      }
      _this.getAnnotations();

      // if manipulationLayer is true,  but all individual options are set to false, set manipulationLayer to false
      if (this.canvasControls.imageManipulation.manipulationLayer) {
        this.canvasControls.imageManipulation.manipulationLayer = !Object.keys(this.canvasControls.imageManipulation.controls).every(function(element, index, array) {
          return _this.canvasControls.imageManipulation.controls[element] === false;
        });
      }

      //for use by SidePanel, which needs to know if the current view can have the annotations tab
      _this.eventEmitter.publish(('windowUpdated'), {
        id: _this.id,
        annotationsAvailable: this.annotationsAvailable
      });

      //check config
      if (typeof this.bottomPanelAvailable !== 'undefined' && !this.bottomPanelAvailable) {
        jQuery.each(this.focusOverlaysAvailable, function(key, value) {
          _this.focusOverlaysAvailable[key].bottomPanel = {'' : false};
        });
      }

      templateData.sidePanel = this.sidePanelAvailable;
      if (this.sidePanelAvailable) {
        templateData.sidePanel = !Object.keys(this.sidePanelOptions).every(function(element, index, array) {
          return _this.sidePanelOptions[element] === false;
        });
      }
      if (typeof this.overlayAvailable !== 'undefined' && !this.overlayAvailable) {
        jQuery.each(this.focusOverlaysAvailable, function(key, value) {
          _this.focusOverlaysAvailable[key].overlay = {'' : false};
        });
      } else {
        templateData.MetadataView = true;
      }

      //determine if any buttons should be hidden in template
      templateData.iconClasses = {};
      jQuery.each(this.focuses, function(index, value) {
        templateData[value] = true;
        templateData.iconClasses[value] = _this.iconClasses[value];
      });
      templateData.title = $.JsonLd.getTextValue(manifest.label);
      templateData.displayLayout = this.displayLayout;
      templateData.layoutOptions = this.layoutOptions;
      // if displayLayout is true,  but all individual options are set to false, set displayLayout to false
      if (this.displayLayout) {
        templateData.displayLayout = !Object.keys(this.layoutOptions).every(function(element, index, array) {
          return _this.layoutOptions[element] === false;
        });
      }
      templateData.currentFocusClass = _this.iconClasses[_this.viewType];
      templateData.showFullScreen = _this.fullScreen;

      // get info about lockGroups
      templateData.lockGroups = Object.keys(this.lockController.getLockGroupData());

      _this.element = jQuery(this.template(templateData)).appendTo(_this.appendTo);
      this.element.find('.manifest-info .mirador-tooltip.mirador-icon-view-type').each(function() {
        _this.createOrUpdateTooltip(this, 'left');
      });
      this.element.find('.manifest-info .mirador-tooltip.mirador-icon-ruler, .manifest-info .mirador-tooltip.mirador-icon-lock-window, .manifest-info .mirador-tooltip.mirador-icon-multi-image').each(function() {
        _this.createOrUpdateTooltip(this, 'right');
      });
      //TODO: this needs to switch the postion when it is a right to left manifest
      this.element.find('.manifest-info .contained-tooltip').qtip({
        content: {
          text: jQuery(this).attr('title'),
        },
        position: {
          my: 'top center',
          at: 'bottom center',
          adjust: {
            method: 'shift',
            y: -11
          },
          container: _this.element,
          viewport: true
        },
        style: {
          classes: 'qtip-dark qtip-shadow qtip-rounded'
        }
      });
      this.element.find('.manifest-info .window-manifest-title').qtip({
        content: {
          text: jQuery(this).attr('title'),
        },
        position: {
          my: 'top center',
          at: 'bottom left',
          adjust: {
            method: 'shift',
            x: 20,
            y: 1
          },
          container: _this.element,
          viewport: true
        },
        style: {
          classes: 'qtip-dark qtip-shadow qtip-rounded'
        }
      });
      _this.eventEmitter.publish('WINDOW_ELEMENT_UPDATED', {windowId: _this.id, element: _this.element});

      //clear any existing objects
      _this.clearViews();
      _this.clearPanelsAndOverlay();

      //window needs to listen for any events before it finishes building out the widgets, in case they publish anything
      this.listenForActions();

      //attach view and toggle view, which triggers the attachment of panels or overlays
      _this.bindNavigation();
      switch(focusState) {
        case 'ThumbnailsView':
          _this.toggleThumbnails(_this.canvasID);
        break;
        case 'ImageView':
          _this.toggleImageView(_this.canvasID);
        break;
        case 'BookView':
          _this.toggleBookView(_this.canvasID);
        break;
        case 'ScrollView':
          _this.toggleScrollView(_this.canvasID);
        break;
        default:
          break;
      }

      if (_this.state.getSlots().length <= 1) {
        _this.element.find('.remove-object-option').hide();
      }

      this.bindEvents();

      if (this.imagesList.length === 1) {
        this.bottomPanelVisibility(false);
      } else {
        this.bottomPanelVisibility(this.bottomPanelVisible);
      }
      this.sidePanelVisibility(this.sidePanelVisible, '0s');

      // get initial lock group data
      this.eventEmitter.publish('windowReadyForLockGroups');

      // restore lock group stuff for this window, if we are restoring it
      // sends message to lockController
      if (_this.focusModules[_this.currentImageMode] !== null) {
        _this.eventEmitter.publish('restoreWindowToLockController', _this.focusModules[_this.currentImageMode]);
      }
    },

    createOrUpdateTooltip: function(selector, horizontalPosition) {
      var _this = this;
      jQuery(selector).qtip({
        content: {
          text: jQuery(this).attr('title'),
        },
        position: {
          my: 'top ' + (horizontalPosition === 'left' ? 'right': 'left'),
          at: 'bottom ' + horizontalPosition,
          container: _this.element
        },
        style: {
          classes: 'qtip-dark qtip-shadow qtip-rounded'
        },
        hide: {
          distance: 5
        }
      });
    },

    update: function(options) {
      jQuery.extend(this, options);
      if (this.windowOptions) {
        this.windowOptions.osdBounds = null;
        this.windowOptions.zoomLevel = null;
      }
      this.init();
    },

    // reset whether BookView is available every time as a user might switch between paged and non-paged objects within a single slot/window
    removeBookView: function() {
      var _this = this;
      this.focuses = this.availableViews;
      var manifest = this.manifest.jsonLd;
      if (manifest.sequences[0].viewingHint) {
        if (manifest.sequences[0].viewingHint.toLowerCase() !== 'paged') {
          //disable bookview for this object because it's not a paged object
          this.focuses = jQuery.grep(this.focuses, function(value) {
            return value !== 'BookView';
          });
        }
      }
    },

    listenForActions: function() {
      var _this = this;
      _this.eventEmitter.subscribe('bottomPanelSet.' + _this.id, function(event, visible) {
        var panel = _this.element.find('.bottomPanel');
        if (visible === true) {
          panel.css({transform: 'translateY(0)'});
        } else {
          panel.css({transform: 'translateY(100%)'});
        }
      });

      _this.eventEmitter.subscribe('HIDE_REMOVE_OBJECT.' + _this.id, function(event) {
        _this.element.find('.remove-object-option').hide();
      });

      _this.eventEmitter.subscribe('SHOW_REMOVE_OBJECT.' + _this.id, function(event) {
        _this.element.find('.remove-object-option').show();
      });

      _this.eventEmitter.subscribe('sidePanelStateUpdated.' + this.id, function(event, state) {
        if (state.open) {
            _this.element.find('.mirador-icon-toc').addClass('selected');
            _this.element.find('.view-container').removeClass('maximised');
        } else {
            _this.element.find('.mirador-icon-toc').removeClass('selected');
            _this.element.find('.view-container').addClass('maximised');
        }
      });

      // TODO: temporary logic to minimize side panel if only tab is toc and toc is empty
      _this.eventEmitter.subscribe('sidePanelVisibilityByTab.' + this.id, function(event, visible) {
        _this.sidePanelVisibility(visible, '0s');
      });

      _this.eventEmitter.subscribe('SET_CURRENT_CANVAS_ID.' + this.id, function(event, canvasID) {
        _this.setCurrentCanvasID(canvasID);

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeNavigationControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: canvasID
          });
        }
      });

      _this.eventEmitter.subscribe('REMOVE_CLASS.' + this.id, function(event, className) {
        _this.element.find('.view-container').removeClass(className);
      });

      _this.eventEmitter.subscribe('ADD_CLASS.' + this.id, function(event, className) {
        _this.element.find('.view-container').addClass(className);
      });

      _this.eventEmitter.subscribe('UPDATE_FOCUS_IMAGES.' + this.id, function(event, images) {
        _this.updateFocusImages(images.array);
      });

      _this.eventEmitter.subscribe('HIDE_ICON_TOC.' + this.id, function(event) {
        _this.element.find('.mirador-icon-toc').hide();
      });

      _this.eventEmitter.subscribe('SHOW_ICON_TOC.' + this.id, function(event) {
        _this.element.find('.mirador-icon-toc').show();
      });

      _this.eventEmitter.subscribe('SET_BOTTOM_PANEL_VISIBILITY.' + this.id, function(event, visibility) {
        if (typeof visibility !== 'undefined' && visibility !== null) {
          _this.bottomPanelVisibility(visibility);
        } else {
          _this.bottomPanelVisibility(_this.bottomPanelVisible);
        }
      });

      _this.eventEmitter.subscribe('TOGGLE_BOTTOM_PANEL_VISIBILITY.' + this.id, function(event) {
        var visible = !_this.bottomPanelVisible;
        _this.bottomPanelVisibility(visible);
      });

      _this.eventEmitter.subscribe('DISABLE_WINDOW_FULLSCREEN', function(event) {
        _this.element.find('.mirador-osd-fullscreen').hide();
      });

      _this.eventEmitter.subscribe('ENABLE_WINDOW_FULLSCREEN', function(event) {
        _this.element.find('.mirador-osd-fullscreen').show();
      });

      /*
       * Calls the D3 rendering method to dynamically add li's.
       */
      // TODO: delete parameter from Handlebars template (not needed)
      _this.eventEmitter.subscribe('updateLockGroupMenus', function(event, data) {
        _this.renderLockGroupMenu(data.keys);
        _this.createOrUpdateTooltip('.mirador-tooltip.mirador-icon-lock-window', 'right');
      });

      /*
       * Activates the li with innerHTML that matches the given lockGroup, inside of the window whose
       * viewobject has the given windowId
       *
       * @param {Object} data Contains:
       *     groupId {string} The name of the window group
       */
      _this.eventEmitter.subscribe('activateLockGroupMenuItem.' + _this.id, function(event, groupId) {
        // check if this window has the window id
        // if so, set the li with the innerHTML that has groupId
        _this.element.find('.add-to-lock-group').each(function(i, e) {
          if (e.innerHTML === groupId) {
            jQuery(this).parent().children('.add-to-lock-group').removeClass('current-lg');
            jQuery(this).addClass('current-lg');
          }
        });
      });

      /*
       * From ImageView.createOpenSeadragon.
       *
       * @param {Object} data
       */
      _this.eventEmitter.subscribe('imageChoiceReady.' + _this.id, function(event, data) {
        _this.renderImageChoiceMenu(data.data);
        _this.createOrUpdateTooltip('.mirador-tooltip.mirador-icon-multi-image', 'right');
      });

      /*
       * Fits the image choice menu vertically to the window. Called during resizestop.
       */
      _this.eventEmitter.subscribe('fitImageChoiceMenu', function(event) {
        _this.fitImageChoiceMenu();
      });

      /*
       * Received from lockController.
       */
      _this.eventEmitter.subscribe('DISABLE_ZOOMING.' + _this.id, function(event) {
        _this.toggleZoomLock(_this.element.find('.mirador-icon-zoom-lock'), true);
      });

      /*
       * Received from lockController.
       */
      _this.eventEmitter.subscribe('ENABLE_ZOOMING.' + _this.id, function(event) {
        _this.toggleZoomLock(_this.element.find('.mirador-icon-zoom-lock'), false);
      });
    },

    bindEvents: function() {
      var _this = this;

      // prevent infinite looping with coordinated zoom
      this.element.on({
        mouseenter: function() {
          _this.leading = true;
        },
        mouseleave: function() {
          _this.leading = false;
        }
      });

      // onclick event to add the window to the selected lock group
      this.element.find('.add-to-lock-group').on('click', function(event) {
        _this.addToLockGroup(this);
      });

      //this event should trigger from layout
      jQuery(window).resize($.debounce(function(){
        if (_this.focusModules.ScrollView) {
          var containerHeight = _this.element.find('.view-container').height();
          var triggerShow = false;
          if (_this.viewType === "ScrollView") {
            triggerShow = true;
          }
          _this.focusModules.ScrollView.reloadImages(Math.floor(containerHeight * _this.scrollImageRatio), triggerShow);
        }
      }, 300));

      this.element.find('.mirador-osd-fullscreen').on('click', function() {
        if ($.fullscreenElement()) {
          $.exitFullscreen();
        } else {
          $.enterFullscreen(_this.element[0]);
        }
      });

      jQuery(document).on("webkitfullscreenchange mozfullscreenchange fullscreenchange", function() {
        _this.toggleFullScreen();
      });

      // show/hide lock group menu (window-level)
      this.element.find('.mirador-icon-lock-window').off('mouseenter').on('mouseenter',
        function() {
        _this.element.find('.lock-options-list').stop().slideFadeToggle(300);
      }).off('mouseleave').on('mouseleave',
      function() {
        _this.element.find('.lock-options-list').stop().slideFadeToggle(300);
      });

      // show/hide multi-image menu (window-level)
      this.element.find('.mirador-icon-multi-image').off('mouseenter').on('mouseenter',
        function() {
        _this.element.find('.multi-image-list').stop().slideFadeToggle(300);
      }).off('mouseleave').on('mouseleave',
      function() {
        _this.element.find('.multi-image-list').stop().slideFadeToggle(300);
      });

      /*
      this.element.find('.lock-options-list-item').on('click', function() {
        console.log('click lock list item');
      });
      */
      // TODO: remove the above

      // onclick event to remove the window from its lock group
      this.element.find('.remove-from-lock-group').on('click', function(event) {
        _this.removeFromLockGroup(this);
      });

      this.element.find('.mirador-icon-duplicate-window').on('click', function(event) {
        // get info of the current window to duplicate
        var windowConfig = {
          canvasID: _this.canvasID,
          manifest: _this.manifest,
          viewType: _this.currentImageMode,
          choiceImageIDs: _this.choiceImageIDs,
          slotAddress: null
        };

        // to workspace
        _this.eventEmitter.publish('ADD_DUPLICATE_WINDOW', windowConfig);
      });

      // onclick event to toggle zoom enabled/disabled
      this.element.find('.mirador-icon-zoom-lock').on('click', function(event) {
        // flips the current value
        _this.toggleZoomLock(this, !_this.zoomLock);
      });
    },

    /*
     * Sets this window's zoom-lockedness.
     *
     * @param {Object} thisObj
     *   The element with class '.mirador-icon-zoom-lock' to add/remove class from.
     * @param {Boolean} locked
     *   Whether to set this window's zoom to enabled (false) or disabled (true),
     */
    toggleZoomLock: function(thisObj, locked) {
      var _this = this;
      (function(l) {
        if (l === true) {
          _this.eventEmitter.publish("DISABLE_OSD_ZOOM." + _this.id);
          jQuery(this).addClass('selected');
        } else {
          _this.eventEmitter.publish("ENABLE_OSD_ZOOM." + _this.id);
          jQuery(this).removeClass('selected');
        }
        _this.zoomLock = !!l;
      }).call(thisObj, locked);
    },

    addToLockGroup: function(elt, replacing) {
      var lg;
      if (replacing === true) {
        lg = jQuery(elt).parent().children('.add-to-lock-group.current-lg').text();

        // if no lg, do nothing
        if (lg === '') {
          return;
        }
      }
      else {
        lg = jQuery(elt).text();
      }
      this.eventEmitter.publish('addToLockGroup', {viewObj: this.focusModules[this.currentImageMode], lockGroup: lg});
      jQuery(elt).parent().children('.add-to-lock-group').removeClass('current-lg');
      jQuery(elt).addClass('current-lg');
    },

    removeFromLockGroup: function(elt) {
      var viewObj = this.focusModules[this.currentImageMode];
      if (viewObj !== null) {
        this.eventEmitter.publish('removeFromLockGroup', {'viewObj': viewObj});
        jQuery(elt).parent().children('.add-to-lock-group').removeClass('current-lg');
      }
    },

    bindAnnotationEvents: function() {
      var _this = this;
      _this.eventEmitter.subscribe('annotationCreated.'+_this.id, function(event, oaAnno, osdOverlay) {
        var annoID;
        //first function is success callback, second is error callback
        _this.endpoint.create(oaAnno, function(data) {
          //the success callback expects the OA annotation be returned
          annoID = String(data['@id']); //just in case it returns a number
          _this.annotationsList.push(data);
          //update overlay so it can be a part of the annotationList rendering
          jQuery(osdOverlay).removeClass('osd-select-rectangle').addClass('annotation').attr('id', annoID);
          _this.eventEmitter.publish('ANNOTATIONS_LIST_UPDATED', {windowId: _this.id, annotationsList: _this.annotationsList});
        },
        function() {
          //provide useful feedback to user
          console.log("There was an error saving this new annotation");
          //remove this overlay because we couldn't save annotation
          jQuery(osdOverlay).remove();
        });
      });

      _this.eventEmitter.subscribe('annotationUpdated.'+_this.id, function(event, oaAnno) {
        //first function is success callback, second is error callback
        _this.endpoint.update(oaAnno, function() {
          jQuery.each(_this.annotationsList, function(index, value) {
            if (value['@id'] === oaAnno['@id']) {
              _this.annotationsList[index] = oaAnno;
              return false;
            }
          });
          _this.eventEmitter.publish('ANNOTATIONS_LIST_UPDATED', {windowId: _this.id, annotationsList: _this.annotationsList});
        },
        function() {
          console.log("There was an error updating this annotation");
        });
      });

      _this.eventEmitter.subscribe('annotationDeleted.'+_this.id, function(event, annoId) {
        //remove from endpoint
        //first function is success callback, second is error callback
        _this.endpoint.deleteAnnotation(annoId, function() {
          _this.annotationsList = jQuery.grep(_this.annotationsList, function(e){ return e['@id'] !== annoId; });
          _this.eventEmitter.publish(('removeOverlay.' + _this.id), annoId);
          _this.eventEmitter.publish('ANNOTATIONS_LIST_UPDATED', {windowId: _this.id, annotationsList: _this.annotationsList});
        },
        function() {
          // console.log("There was an error deleting this annotation");
        });
      });

      _this.eventEmitter.subscribe('updateAnnotationList.'+_this.id, function(event) {
        while(_this.annotationsList.length > 0) {
          _this.annotationsList.pop();
        }
        _this.getAnnotations();
      });
    },

    clearViews: function() {
      var _this = this;
      jQuery.each(_this.focusModules, function(key, value) {
        _this.focusModules[key] = null;
      });
    },

    clearPanelsAndOverlay: function() {
      this.sidePanel = null;
      this.bottomPanel = null;
      this.overlay = null;
    },

    // only panels and overlay available to this view, make rest hidden while on this view
    updatePanelsAndOverlay: function(state) {
      var _this = this;

      jQuery.each(this.focusOverlaysAvailable[state], function(panelType, viewOptions) {
        jQuery.each(viewOptions, function(view, displayed) {
          //instantiate any panels that exist for this view but are still null
          if (view !== '' && _this[panelType] === null) {
            _this[panelType] = new $[view]({
              manifest: _this.manifest,
              appendTo: _this.element.find('.'+panelType),
              state:  _this.state,
              eventEmitter: _this.eventEmitter,
              windowId: _this.id,
              panel: true,
              canvasID: _this.canvasID,
              imagesList: _this.imagesList,
              thumbInfo: {thumbsHeight: 80, listingCssCls: 'panel-listing-thumbs', thumbnailCls: 'panel-thumbnail-view'}
            });
          }

          //refresh displayed in case TableOfContents module changed it
          displayed = _this.focusOverlaysAvailable[state][panelType][view];

          //toggle any valid panels
          if (view !== '' && displayed) {
            _this.togglePanels(panelType, displayed, view, state);
          }

          //hide any panels instantiated but not available to this view
          if (view === '' && _this[panelType]) {
            _this.togglePanels(panelType, displayed, view, state);
          }

          //lastly, adjust height for non-existent panels
          if (view === '') {
            _this.adjustFocusSize(panelType, displayed);
          }

          //update current image for all valid panels
        });
      });

      //update panels with current image
      //console.log(this.focusImages);
      //if (this.bottomPanel) { this.bottomPanel.updateFocusImages(this.focusImages); }
    },

    updateSidePanel: function() {
      if (!this.sidePanelAvailable) {
        return;
      }
      var _this = this,
      tocAvailable = _this.sidePanelOptions.toc,
      annotationsTabAvailable = _this.sidePanelOptions.annotations,
      layersTabAvailable = _this.sidePanelOptions.layers,
      hasStructures = true;

      var structures = _this.manifest.getStructures();
      if (!structures || structures.length === 0) {
        hasStructures = false;
      }

      if (this.sidePanel === null) {
        this.sidePanel = new $.SidePanel({
              windowId: _this.id,
              state: _this.state,
              eventEmitter: _this.eventEmitter,
              appendTo: _this.element.find('.sidePanel'),
              manifest: _this.manifest,
              canvasID: _this.canvasID,
              layersTabAvailable: layersTabAvailable,
              tocTabAvailable: tocAvailable,
              annotationsTabAvailable: annotationsTabAvailable,
              hasStructures: hasStructures
        });
      } else {
        this.sidePanel.update('annotations', annotationsTabAvailable);
      }
    },

    get: function(prop, parent) {
      if (parent) {
        return this[parent][prop];
      }
      return this[prop];
    },

    set: function(prop, value, options) {
      if (options) {
        this[options.parent][prop] = value;
      } else {
        this[prop] = value;
      }
    },

    /*setTOCBoolean: function(boolValue) {
      var _this = this;
      jQuery.each(this.focusOverlaysAvailable, function(key, value) {
        _this.focusOverlaysAvailable[key].sidePanel.TableOfContents = boolValue;
      });
      //remove thumbnail icon if not available for this object
      if (!boolValue) {
        this.element.find('.mirador-icon-toc').hide();
      }
    },*/

    togglePanels: function(panelType, panelState, viewType, focusState) {
      //update state in focusOverlaysAvailable
      this.focusOverlaysAvailable[focusState][panelType][viewType] = panelState;
      this[panelType].toggle(panelState);
      this.adjustFocusSize(panelType, panelState);
    },

    sidePanelVisibility: function(visible, transitionDuration) {
      var _this = this;
      _this.sidePanelVisible = visible,
      tocIconElement = this.element.find('.mirador-icon-toc'),
      sidePanelElement = this.element.find('.sidePanel'),
      viewContainerElement = this.element.find('.view-container');

      sidePanelElement.css('transition-duration', transitionDuration);
      viewContainerElement.css('transition', transitionDuration);
      if (visible && sidePanelElement.hasClass('minimized')) {
        tocIconElement.addClass('selected');
        sidePanelElement.removeClass('minimized').width(280).css('border-right', '1px solid lightgray');
        viewContainerElement.css('margin-left', 280);
      } else if (!visible && !sidePanelElement.hasClass('minimized')) {
        tocIconElement.removeClass('selected');
        viewContainerElement.css('margin-left', 0);
        sidePanelElement.addClass('minimized').css('border', 'none').width(0);
      }
      _this.eventEmitter.publish(('windowUpdated'), {
        id: _this.id,
        sidePanelVisible: visible
      });
    },

    bottomPanelVisibility: function(visible) {
      var _this = this;
      _this.bottomPanelVisible = visible;
      _this.eventEmitter.publish(('bottomPanelSet.' + _this.id), visible);
      _this.eventEmitter.publish(('windowUpdated'), {
        id: _this.id,
        bottomPanelVisible: visible
      });
    },

    adjustFocusSize: function(panelType, panelState) {
      if (panelType === 'bottomPanel') {
        this.focusModules[this.viewType].adjustHeight('focus-max-height', panelState);
      } else if (panelType === 'sidePanel') {
        this.focusModules[this.viewType].adjustWidth('focus-max-width', panelState);
      } else {}
    },

    toggleMetadataOverlay: function(focusState) {
      var _this = this;
      var currentState = this.focusOverlaysAvailable[focusState].overlay.MetadataView;
      if (currentState) {
        this.element.find('.mirador-icon-metadata-view').removeClass('selected');
      } else {
        this.element.find('.mirador-icon-metadata-view').addClass('selected');
      }
      //set overlay for all focus types to same value
      jQuery.each(this.focusOverlaysAvailable, function(focusType, options) {
        if (focusState !== focusType) {
          this.overlay.MetadataView = !currentState;
        }
      });
      //and then do toggling for current focus
      this.togglePanels('overlay', !currentState, 'MetadataView', focusState);
    },

    toggleFocus: function(focusState, imageMode) {
      var _this = this;

      this.viewType = focusState;
      if (imageMode && jQuery.inArray(imageMode, this.imageModes) > -1) {
        this.currentImageMode = imageMode;
      }
      //set other focusStates to false (toggle to display none)
      jQuery.each(this.focusModules, function(focusKey, module) {
        if (module && focusState !== focusKey) {
          module.toggle(false);
        }
      });
      this.focusModules[focusState].toggle(true);
      this.updateManifestInfo();
      this.updatePanelsAndOverlay(focusState);
      this.updateSidePanel();
      _this.eventEmitter.publish("focusUpdated");
      _this.eventEmitter.publish("windowUpdated", {
        id: _this.id,
        viewType: _this.viewType,
        canvasID: _this.canvasID,
        imageMode: _this.currentImageMode,
        loadedManifest: _this.manifest.jsonLd['@id'],
        slotAddress: _this.slotAddress
      });
    },

    toggleThumbnails: function(canvasID) {
      this.canvasID = canvasID;
      if (this.focusModules.ThumbnailsView === null) {
        this.focusModules.ThumbnailsView = new $.ThumbnailsView({
          manifest: this.manifest,
          appendTo: this.element.find('.view-container'),
          state:  this.state,
          eventEmitter: this.eventEmitter,
          windowId: this.id,
          canvasID: this.canvasID,
          imagesList: this.imagesList
        });
      } else {
        var view = this.focusModules.ThumbnailsView;
        view.updateImage(canvasID);
      }
      this.toggleFocus('ThumbnailsView', '');
    },

    toggleImageView: function(canvasID) {
      this.canvasID = canvasID;
      if (this.focusModules.ImageView === null) {
        this.focusModules.ImageView = new $.ImageView({
          manifest: this.manifest,
          appendTo: this.element.find('.view-container'),
          windowId: this.id,
          windowObj: this,
          state:  this.state,
          eventEmitter: this.eventEmitter,
          canvasID: canvasID,
          choiceImageIDs: this.choiceImageIDs,
          imagesList: this.imagesList,
          osdOptions: this.windowOptions,
          bottomPanelAvailable: this.bottomPanelAvailable,
          annoEndpointAvailable: this.annoEndpointAvailable,
          canvasControls: this.canvasControls,
          annotationState : this.canvasControls.annotations.annotationState
        });
      } else {
        var view = this.focusModules.ImageView;
        view.updateImage(canvasID);
      }
      this.toggleFocus('ImageView', 'ImageView');
    },

    /*
     * @param {Array} data Array of objects that contains label and thumbnail url
     */
    renderImageChoiceMenu: function(data) {

      // first remove inline style attr
      this.element.find('.multi-image-list').css('height', '');
      
      // get d3 selection of ul
      var _this = this;
      var lis;
      
      lis = d3.select(_this.element[0]).select('.multi-image-list').selectAll('li').data(data, function(d) { return d.label; });
      lis.enter().append('li')
        .append('img')
          .attr('src', function(d) { return d.thumbnail;})
          .attr('alt', function(d) { return d.label; })
          .classed({'choice-img-thumbnail': true})
          .select(function() {
              return this.parentNode; })
        .append('span')
          .classed({'choice-img-label': true})
          .text(function(d) {
            return d.label; })
          .select(function() {
              return this.parentNode; })
        .classed({'multi-image-list-item': true})
        .call(function(curSel) {
          // get label of choice image for this selection
          var label = _this.choiceImageIDs[_this.canvasID],
          elt,
          currentSelection = jQuery(curSel[0]);

          if (label !== undefined) {
            elt = currentSelection.filter(function() {
              return jQuery(this).find('.choice-img-label').text() === label ? true : false;
            });
          } else {
            elt = currentSelection.first();
          }
          elt.addClass('current-choice-img');
        })
        .on('click', function(d) {
          // switch the choice id in the data model and save to localstorage
          // window is subscribed
          _this.eventEmitter.publish('showChoiceImage', {
            id: _this.id,
            choiceImageID: d.label
          });
          
          // update dom
          jQuery(this).parent().children('li').removeClass('current-choice-img');
          jQuery(this).addClass('current-choice-img');
        });
      lis.exit().remove();

      _this.fitImageChoiceMenu();
    },

    fitImageChoiceMenu: function() {
      var ul = this.element.find('.multi-image-list'),
      height = ul.closest('.window').find('.content-container').css('height');
      ul.css('max-height', height);
    },

    toggleBookView: function(canvasID) {
      this.canvasID = canvasID;
      if (this.focusModules.BookView === null) {
        this.focusModules.BookView = new $.BookView({
          manifest: this.manifest,
          appendTo: this.element.find('.view-container'),
          windowId: this.id,
          state:  this.state,
          eventEmitter: this.eventEmitter,
          canvasID: canvasID,
          imagesList: this.imagesList,
          osdOptions: this.windowOptions,
          bottomPanelAvailable: this.bottomPanelAvailable
        });
      } else {
        var view = this.focusModules.BookView;
        view.updateImage(canvasID);
      }
      this.toggleFocus('BookView', 'BookView');
    },

    toggleScrollView: function(canvasID) {
      this.canvasID = canvasID;
      if (this.focusModules.ScrollView === null) {
        var containerHeight = this.element.find('.view-container').height();
        this.focusModules.ScrollView = new $.ScrollView({
          manifest: this.manifest,
          appendTo: this.element.find('.view-container'),
          state:  this.state,
          eventEmitter: this.eventEmitter,
          windowId: this.id,
          canvasID: this.canvasID,
          imagesList: this.imagesList,
          thumbInfo: {thumbsHeight: Math.floor(containerHeight * this.scrollImageRatio), listingCssCls: 'scroll-listing-thumbs', thumbnailCls: 'scroll-view'}
        });
      } else {
        var view = this.focusModules.ScrollView;
        view.updateImage(canvasID);
      }
      this.toggleFocus('ScrollView', '');
    },

    /** If physical dimensions are available, then set the ruler visibility to 'v'.
     * @param {string} v - ['invisible', 'visible']
     */
    setRulerVisibility: function(v) {
      var osdInstance = this.focusModules.ImageView.osd;
      if (!osdInstance.hasPhysicalDimensionData) {
        return;
      }

      var type;
      if (v === 'invisible') {
        type = OpenSeadragon.ScalebarType.NONE;
      }
      else if (v === 'visible') {
        type = OpenSeadragon.ScalebarType.RULER;
      }
      osdInstance.scalebar({'type': type});
    },

    /** If physical dimensions are available, then set the ruler orientation to 'o'.
     * @param {string} o - ['horizontal', 'vertical']
     */
    setRulerOrientation: function(o) {
      var osdInstance = this.focusModules.ImageView.osd;
      if (!osdInstance.hasPhysicalDimensionData) {
        return;
      }

      var orientation;
      switch (o) {
        case 'horizontal':
	  orientation = OpenSeadragon.ScalebarOrientation.HORIZONTAL;
	  break;
	case 'vertical':
	  orientation = OpenSeadragon.ScalebarOrientation.VERTICAL;
	  break;
      }
      this.setRulerVisibility('visible');
      osdInstance.scalebar({'orientation': orientation});
    },

    /** If physical dimensions are available, then set the ruler color to 'c'.
     * @param {string} c - Any valid CSS color string.
     */
    setRulerColor: function(c) {
      var osdInstance = this.focusModules.ImageView.osd;
      if (!osdInstance.hasPhysicalDimensionData) {
        return;
      }

      this.setRulerVisibility('visible');
      osdInstance.scalebar({'color': c});
    },

    /** If physical dimensions are available, then set the ruler position to 'p'.
     * @param {string} p - ['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br']
     */
    setRulerPosition: function(p) {
      var osdInstance = this.focusModules.ImageView.osd;
      if (!osdInstance.hasPhysicalDimensionData) {
        return;
      }

      var position;
      switch (p) {
        case 'tl':
	  position = OpenSeadragon.ScalebarLocation.TOP_LEFT;
	  break;
        case 'tm':
	  position = OpenSeadragon.ScalebarLocation.TOP_MIDDLE;
	  break;
        case 'tr':
	  position = OpenSeadragon.ScalebarLocation.TOP_RIGHT;
	  break;
        case 'ml':
	  position = OpenSeadragon.ScalebarLocation.MIDDLE_LEFT;
	  break;
        case 'mr':
	  position = OpenSeadragon.ScalebarLocation.MIDDLE_RIGHT;
	  break;
        case 'bl':
	  position = OpenSeadragon.ScalebarLocation.BOTTOM_LEFT;
	  break;
        case 'bm':
	  position = OpenSeadragon.ScalebarLocation.BOTTOM_MIDDLE;
	  break;
        case 'br':
	  position = OpenSeadragon.ScalebarLocation.BOTTOM_RIGHT;
	  break;
      }
      this.setRulerVisibility('visible');
      osdInstance.scalebar({'location': position});
    },

    updateFocusImages: function(imageList) {
      this.focusImages = imageList;
      if (this.bottomPanel) { this.bottomPanel.updateFocusImages(this.focusImages); }
    },

    setCurrentCanvasID: function(canvasID) {
      var _this = this;
      this.canvasID = canvasID;
      _this.eventEmitter.publish('removeTooltips.' + _this.id);
      _this.eventEmitter.unsubscribe(('annotationListLoaded.' + _this.id));
      while(_this.annotationsList.length > 0) {
        _this.annotationsList.pop();
      }
      this.getAnnotations();
      switch(this.currentImageMode) {
        case 'ImageView':
          // choiceImageID is undefined
          this.toggleImageView(this.canvasID);
        break;
        case 'BookView':
          this.toggleBookView(this.canvasID);
        break;
        default:
          break;
      }
      _this.eventEmitter.publish(('currentCanvasIDUpdated.' + _this.id), canvasID);
    },

    replaceWindow: function(newSlotAddress, newElement) {
      this.slotAddress = newSlotAddress;
      this.appendTo = newElement;
      this.update();
    },

    setCursorFrameStart: function(canvasID) {
    },

    updateManifestInfo: function() {
      var _this = this;
      _this.element.find('.mirador-icon-view-type > i:first').removeClass().addClass(_this.iconClasses[_this.viewType]);

      if (this.focusOverlaysAvailable[this.viewType].overlay.MetadataView) {
        this.element.find('.mirador-icon-metadata-view').addClass('selected');
      }
    },

    /*
       Merge all annotations for current image/canvas from various sources
       Pass to any widgets that will use this list
       */
    getAnnotations: function() {
      //first look for manifest annotations
      var _this = this,
      url = _this.manifest.getAnnotationsListUrl(_this.canvasID);

      if (url !== false) {
        jQuery.get(url, function(list) {
          _this.annotationsList = _this.annotationsList.concat(list.resources);
          jQuery.each(_this.annotationsList, function(index, value) {
            //if there is no ID for this annotation, set a random one
            if (typeof value['@id'] === 'undefined') {
              value['@id'] = $.genUUID();
            }
            //indicate this is a manifest annotation - which affects the UI
            value.endpoint = "manifest";
          });
          _this.eventEmitter.publish('ANNOTATIONS_LIST_UPDATED', {windowId: _this.id, annotationsList: _this.annotationsList});
        });
      }

      // next check endpoint
      if (this.annoEndpointAvailable) {
        var dfd = jQuery.Deferred(),
        module = _this.state.getStateProperty('annotationEndpoint').module,
        options = _this.state.getStateProperty('annotationEndpoint').options || {}; //grab anything from the config that should be passed directly to the endpoint
        options.name = _this.state.getStateProperty('annotationEndpoint').name;
        // One annotation endpoint per window, the endpoint
        // is a property of the instance.
        if ( _this.endpoint && _this.endpoint !== null ) {
          _this.endpoint.set('dfd', dfd);
        } else {
          options.dfd = dfd;
          options.windowID = _this.id;
          options.imagesList = _this.imagesList;
          options.eventEmitter = _this.eventEmitter;
          _this.endpoint = new $[module](options);
        }
        _this.endpoint.search({ "uri" : _this.canvasID});

        dfd.done(function(loaded) {
          _this.annotationsList = _this.annotationsList.concat(_this.endpoint.annotationsList);
          // clear out some bad data
          _this.annotationsList = jQuery.grep(_this.annotationsList, function (value, index) {
            if (typeof value.on === "undefined") {
              return false;
            }
            return true;
          });
          _this.eventEmitter.publish('ANNOTATIONS_LIST_UPDATED', {windowId: _this.id, annotationsList: _this.annotationsList});
        });
      }
    },

    toggleFullScreen: function() {
      var _this = this;
      if (!OpenSeadragon.isFullScreen()) {
        this.element.find('.mirador-osd-fullscreen i').removeClass('fa-compress').addClass('fa-expand');
        this.element.find('.mirador-osd-toggle-bottom-panel').show();
        _this.eventEmitter.publish('SET_BOTTOM_PANEL_VISIBILITY.' + this.id, true);
      } else {
        this.element.find('.mirador-osd-fullscreen i').removeClass('fa-expand').addClass('fa-compress');
        this.element.find('.mirador-osd-toggle-bottom-panel').hide();
        _this.eventEmitter.publish('SET_BOTTOM_PANEL_VISIBILITY.' + this.id, false);
      }
    },

    // based on currentFocus
    bindNavigation: function() {
      var _this = this;

      this.element.find('.mirador-icon-view-type').on('mouseenter',
        function() {
        _this.element.find('.image-list').stop().slideFadeToggle(300);
      }).on('mouseleave',
      function() {
        _this.element.find('.image-list').stop().slideFadeToggle(300);
      });

      this.element.find('.mirador-icon-window-menu').on('mouseenter',
        function() {
        _this.element.find('.slot-controls').stop().slideFadeToggle(300);
      }).on('mouseleave',
      function() {
        _this.element.find('.slot-controls').stop().slideFadeToggle(300);
      });

      this.element.find('.single-image-option').on('click', function() {
        _this.toggleImageView(_this.canvasID);
      });

      this.element.find('.book-option').on('click', function() {
        _this.toggleBookView(_this.canvasID);
      });

      this.element.find('.scroll-option').on('click', function() {
        _this.toggleScrollView(_this.canvasID);
      });

      this.element.find('.thumbnails-option').on('click', function() {
        _this.toggleThumbnails(_this.canvasID);
      });

      this.element.find('.mirador-icon-metadata-view').on('click', function() {
        _this.toggleMetadataOverlay(_this.viewType);
      });

      this.element.find('.mirador-icon-toc').on('click', function() {
        _this.sidePanelVisibility(!_this.sidePanelVisible, '0.3s');
      });

      this.element.find('.new-object-option, .mirador-icon-new-object').on('click', function() {
        _this.eventEmitter.publish('ADD_ITEM_FROM_WINDOW', _this.id);
      });

      this.element.find('.remove-object-option').on('click', function() {
        _this.eventEmitter.publish('REMOVE_SLOT_FROM_WINDOW', _this.id);
      });

      this.element.find('.add-slot-right').on('click', function() {
        _this.eventEmitter.publish('SPLIT_RIGHT_FROM_WINDOW', _this.id);
      });

      this.element.find('.add-slot-left').on('click', function() {
        _this.eventEmitter.publish('SPLIT_LEFT_FROM_WINDOW', _this.id);
      });

      this.element.find('.add-slot-below').on('click', function() {
        _this.eventEmitter.publish('SPLIT_DOWN_FROM_WINDOW', _this.id);
      });

      this.element.find('.add-slot-above').on('click', function() {
        _this.eventEmitter.publish('SPLIT_UP_FROM_WINDOW', _this.id);
      });
      
      // TODO: disable these ruler methods if no physical dimension data is available
      this.element.find('.mirador-icon-ruler').on('mouseenter',
        function() {
        _this.element.find('.ruler-options-list').stop().slideFadeToggle(300);
        _this.element.find('.ruler-icon-grey').hide();
        _this.element.find('.ruler-icon').show();
      }).on('mouseleave',
      function() {
        _this.element.find('.ruler-options-list').stop().slideFadeToggle(300);
        _this.element.find('.ruler-icon').hide();
        _this.element.find('.ruler-icon-grey').show();
      });
      _this.element.find('.ruler-icon').hide();
      
      this.element.find('.ruler-hide').on('click', function() {
        _this.setRulerVisibility('invisible');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerVisibility',
              arg: 'invisible'
            }
          });
        }
      });
      
      this.element.find('.ruler-horizontal').on('click', function() {
        _this.setRulerOrientation('horizontal');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerOrientation',
              arg: 'horizontal'
            }
          });
        }
      });
      
      this.element.find('.ruler-vertical').on('click', function() {
        _this.setRulerOrientation('vertical');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerOrientation',
              arg: 'vertical'
            }
          });
        }
      });

      this.element.find('.ruler-black').on('click', function() {
        _this.setRulerColor('black');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerColor',
              arg: 'black'
            }
          });
        }
      });

      this.element.find('.ruler-white').on('click', function() {
        _this.setRulerColor('white');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerColor',
              arg: 'white'
            }
          });
        }
      });

      this.element.find('.ruler-top-left').on('click', function() {
        _this.setRulerPosition('tl');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerPosition',
              arg: 'tl'
            }
          });
        }
      });

      this.element.find('.ruler-top-middle').on('click', function() {
        _this.setRulerPosition('tm');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerPosition',
              arg: 'tm'
            }
          });
        }
      });

      this.element.find('.ruler-top-right').on('click', function() {
        _this.setRulerPosition('tr');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerPosition',
              arg: 'tr'
            }
          });
        }
      });

      this.element.find('.ruler-middle-left').on('click', function() {
        _this.setRulerPosition('ml');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerPosition',
              arg: 'ml'
            }
          });
        }
      });

      this.element.find('.ruler-middle-right').on('click', function() {
        _this.setRulerPosition('mr');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerPosition',
              arg: 'mr'
            }
          });
        }
      });

      this.element.find('.ruler-bottom-left').on('click', function() {
        _this.setRulerPosition('bl');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerPosition',
              arg: 'bl'
            }
          });
        }
      });

      this.element.find('.ruler-bottom-middle').on('click', function() {
        _this.setRulerPosition('bm');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerPosition',
              arg: 'bm'
            }
          });
        }
      });

      this.element.find('.ruler-bottom-right').on('click', function() {
        _this.setRulerPosition('br');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeRulerControls', {
            viewObj: _this.focusModules[_this.currentImageMode],
            value: {
              fn: 'setRulerPosition',
              arg: 'br'
            }
          });
        }
      });
    },

    /*
     * Use D3 to dynamically render the window-level lock group menu.
     *
     * @param {Array} lockGroupNames An array of strings that represent the lock group names
     */
    renderLockGroupMenu: function(lockGroupNames) {
      // each menu in the window should get a dropdown with items in the 'data' array
      var _this = this,
      lockGroups = d3.select(this.element[0]).select('.lock-options-list').selectAll('.lock-options-list-item')
        .data(lockGroupNames, function(d) { return d; });
      lockGroups.enter().append('li')
        .classed({'lock-options-list-item': true, 'add-to-lock-group': true})
        .text(function(d) { return d; })
        .on('click', function() {
          _this.addToLockGroup(this);
        });
      lockGroups.exit().remove();
    },

    // template should be based on workspace type
    template: Handlebars.compile([
                                 '<div class="window">',
                                 '<div class="manifest-info">',
                                 '<div class="window-manifest-navigation">',
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-view-type mirador-tooltip" role="button" title="{{t "viewTypeTooltip"}}" aria-label="{{t "viewTypeTooltip"}}">',
                                 '<i class="{{currentFocusClass}}"></i>',
                                 '<i class="fa fa-caret-down"></i>',
                                 '<ul class="dropdown image-list">',
                                 '{{#if ImageView}}',
                                 '<li class="single-image-option"><i class="{{iconClasses.ImageView}}"></i> {{t "imageView"}}</li>',
                                 '{{/if}}',
                                 '{{#if BookView}}',
                                 '<li class="book-option"><i class="{{iconClasses.BookView}}"></i> {{t "bookView"}}</li>',
                                 '{{/if}}',
                                 '{{#if ScrollView}}',
                                 '<li class="scroll-option"><i class="{{iconClasses.ScrollView}}"></i> {{t "scrollView"}}</li>',
                                 '{{/if}}',
                                 '{{#if ThumbnailsView}}',
                                 '<li class="thumbnails-option"><i class="{{iconClasses.ThumbnailsView}}"></i> {{t "thumbnailsView"}}</li>',
                                 '{{/if}}',
                                 '</ul>',
                                 '</a>',
                                 '{{#if MetadataView}}',
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-metadata-view contained-tooltip" role="button" title="{{t "metadataTooltip"}}" aria-label="{{t "metadataTooltip"}}">',
                                 '<i class="fa fa-info-circle fa-lg fa-fw"></i>',
                                 '</a>',
                                 '{{/if}}',
                                 '{{#if showFullScreen}}',
                                 '<a class="mirador-btn mirador-osd-fullscreen contained-tooltip" role="button" title="{{t "fullScreenWindowTooltip"}}" aria-label="{{t "fullScreenWindowTooltip"}}">',
                                 '<i class="fa fa-lg fa-fw fa-expand"></i>',
                                 '</a>',
                                 '{{/if}}',
                                 '</div>',
                                 '{{#if layoutOptions.close}}',
                                 '<a href="javascript:;" class="mirador-btn mirador-close-window remove-object-option contained-tooltip" title="{{t "closeTooltip"}}" aria-label="{{t "closeTooltip"}}"><i class="fa fa-times fa-lg fa-fw"></i></a>',
                                 '{{/if}}',
                                 '{{#if displayLayout}}',
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-window-menu mirador-tooltip" title="{{t "changeLayoutTooltip"}}" aria-label="{{t "changeLayoutTooltip"}}"><i class="fa fa-th-large fa-lg fa-fw"></i><i class="fa fa-caret-down"></i>',
                                 '<ul class="dropdown slot-controls">',
                                 '{{#if layoutOptions.newObject}}',
                                 '<li class="new-object-option"><i class="fa fa-refresh fa-lg fa-fw"></i> {{t "newObject"}}</li>',
                                 '<hr class="menu-divider"/>',
                                 '{{/if}}',
                                 '{{#if layoutOptions.slotRight}}',
                                 '<li class="add-slot-right"><i class="fa fa-arrow-circle-right fa-lg fa-fw"></i> {{t "addSlotRight"}}</li>',
                                 '{{/if}}',
                                 '{{#if layoutOptions.slotLeft}}',
                                 '<li class="add-slot-left"><i class="fa fa-arrow-circle-left fa-lg fa-fw"></i> {{t "addSlotLeft"}}</li>',
                                 '{{/if}}',
                                 '{{#if layoutOptions.slotAbove}}',
                                 '<li class="add-slot-above"><i class="fa fa-arrow-circle-up fa-lg fa-fw"></i> {{t "addSlotAbove"}}</li>',
                                 '{{/if}}',
                                 '{{#if layoutOptions.slotBelow}}',
                                 '<li class="add-slot-below"><i class="fa fa-arrow-circle-down fa-lg fa-fw"></i> {{t "addSlotBelow"}}</li>',
                                 '{{/if}}',
                                 '</ul>',
                                 '</a>',
                                 '{{else}}',
                                 // just have regen object
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-new-object contained-tooltip" title="Choose a new manuscript to load"><i class="fa fa-refresh fa-lg fa-fw"></i></a>',
                                 '{{/if}}',
                                 '{{#if sidePanel}}',
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-toc selected mirador-tooltip" title="{{t "sidePanelTooltip"}}" aria-label="{{t "sidePanelTooltip"}}"><i class="fa fa-bars fa-lg fa-fw"></i></a>',
                                 '{{/if}}',

                                 // TODO: hide this ruler UI html if no physical dimensions are available
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-ruler mirador-tooltip" title="Manage this window&#39;s ruler settings">',
                                 '<i class="fa fa-lg fa-fw ruler-icon-grey"></i>',
                                 '<i class="fa fa-lg fa-fw ruler-icon"></i>',
                                 '<i class="fa fa-caret-down"></i>',
                                 '<ul class="dropdown ruler-options-list">',
                                 '<li class="ruler-hide"><i class="fa fa-ban fa-lg fa-fw"></i> (hide ruler)</li>',
                                 '<li class="ruler-horizontal"><i class="fa fa-text-width fa-lg fa-fw"></i> Horizontal Ruler</li>',
                                 '<li class="ruler-vertical"><i class="fa fa-text-height fa-lg fa-fw"></i> Vertical Ruler</li>',
                                 '<li class="ruler-black"><i class="fa fa-square fa-lg fa-fw"></i> Black Lines</li>',
                                 '<li class="ruler-white"><i class="fa fa-square-o fa-lg fa-fw"></i> White Lines</li>',
                                 '<li class="ruler-top-left"><i class="fa fa- fa-lg fa-fw"></i> Top Left</li>',
                                 '<li class="ruler-top-middle"><i class="fa fa- fa-lg fa-fw"></i> Top Middle</li>',
                                 '<li class="ruler-top-right"><i class="fa fa- fa-lg fa-fw"></i> Top Right</li>',
                                 '<li class="ruler-middle-left"><i class="fa fa- fa-lg fa-fw"></i> Middle Left</li>',
                                 '<li class="ruler-middle-right"><i class="fa fa- fa-lg fa-fw"></i> Middle Right</li>',
                                 '<li class="ruler-bottom-left"><i class="fa fa- fa-lg fa-fw"></i> Bottom Left</li>',
                                 '<li class="ruler-bottom-middle"><i class="fa fa- fa-lg fa-fw"></i> Bottom Middle</li>',
                                 '<li class="ruler-bottom-right"><i class="fa fa- fa-lg fa-fw"></i> Bottom Right</li>',
                                 '</ul>',
                                 '</a>',
                                 // end of ruler UI html
 
                                 // lockController
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-lock-window mirador-tooltip" title="Manage this window&#39;s &quot;synchronized window group&quot; assignment">',
                                 '<i class="fa fa-lock fa-lg fa-fw"></i>',
                                 '<i class="fa fa-caret-down"></i>',
                                 '<ul class="dropdown lock-options-list">',
                                 '<li class="no-lock remove-from-lock-group"><i class="fa fa-ban fa-lg fa-fw"></i> (no group)</li>',
                                 //'{{#list2 lockGroups}}{{/list2}}',
                                 '</ul>',
                                 '</a>',
                                 // end lockController

                                 //'{{#if isMultiImageView}}',
                                 // dropdown list for multi
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-multi-image mirador-tooltip" title="Choose between the available spectral images">',
                                 '<i class="fa fa-th-list fa-lg fa-fw"></i>',
                                 '<i class="fa fa-caret-down"></i>',
                                 '<ul class="dropdown multi-image-list"></ul>',
                                 '</a>',
                                 //'{{/#if}}',

                                 // duplicate
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-duplicate-window contained-tooltip" title="Duplicate this window">',
                                 '<i class="fa fa-copy fa-lg fa-fw"></i>',
                                 '</a>',

                                 // zoom lock
                                 '<a href="javascript:;" class="mirador-btn mirador-icon-zoom-lock contained-tooltip" title="Toggle zoom lock on this window">',
                                 '<i class="fa fa-search fa-lg fa-fw"></i>',
                                 '<i class="fa fa-lock" style="position:relative;left:-4px;"></i>',
                                 '</a>',

                                 '<h3 class="window-manifest-title" title="{{title}}" aria-label="{{title}}">{{title}}</h3>',
                                 '</div>',
                                 '<div class="content-container">',
                                 '{{#if sidePanel}}',
                                 '<div class="sidePanel">',
                                 '</div>',
                                 '{{/if}}',
                                 '<div class="overlay"></div>',
                                 '<div class="view-container {{#unless sidePanel}}focus-max-width{{/unless}}">',
                                 '<div class="bottomPanel">',
                                 '</div>',
                                 '</div>',
                                 '</div>',
                                 '</div>'
    ].join(''))
  };

}(Mirador));
