(function($) {

  $.ImageView = function(options) {

    jQuery.extend(this, {
      currentImg:       null,
      windowId:         null,
      windowObj:        null,
      currentImgIndex:  0,
      canvasID:          null,
      // key-value map of canvasIDs to choiceImageIDs
      choiceImageIDs:   {},
      imagesList:       [],
      element:          null,
      elemOsd:          null,
      manifest:         null,
      osd:              null,
      osdOptions: {
        osdBounds:        null,
        zoomLevel:        null
      },
      osdCls: 'mirador-osd',
      elemAnno:         null,
      annoCls:          'annotation-canvas',
      annotationsLayer: null,
      forceShowControls: false,
      eventEmitter:     null
    }, options);

    this.init();
  };

  $.ImageView.prototype = {

    init: function() {
      var _this = this;
      // check (for thumbnail view) if the canvasID is set.
      // If not, make it page/item 1.
      if (this.canvasID !== null) {
        this.currentImgIndex = $.getImageIndexById(this.imagesList, this.canvasID);
      }

      if (!this.osdOptions) {
        this.osdOptions = {
          osdBounds:        null,
          zoomLevel:        null
        };
      }
      this.currentImg = this.imagesList[this.currentImgIndex];

      this.element = jQuery(this.template()).appendTo(this.appendTo);
      this.elemAnno = jQuery('<div/>')
      .addClass(this.annoCls)
      .appendTo(this.element);

      // if currentImg has choice, then display the menu in the Window obj (eventEmit)
      // TODO: get labels and label the dropdown menu accordingly
      if ($.Iiif.imageHasAlternateResources(this.currentImg)) {
        this.createOpenSeadragonInstance($.Iiif.getImageResourceLabelsIdsAndThumbnails(this.currentImg));
      } else {
        this.createOpenSeadragonInstance($.Iiif.getImageUrl(this.currentImg));
      }
      _this.eventEmitter.publish('UPDATE_FOCUS_IMAGES.' + this.windowId, {array: [this.canvasID]});

      var allTools = $.getTools(this.state.getStateProperty('drawingToolsSettings'));
      this.availableAnnotationTools = [];
      for ( var i = 0; i < this.state.getStateProperty('availableAnnotationDrawingTools').length; i++) {
        for ( var j = 0; j < allTools.length; j++) {
          if (this.state.getStateProperty('availableAnnotationDrawingTools')[i] == allTools[j].name) {
            var values = {};
            values.logoClass = allTools[j].logoClass;
            values.tooltip = allTools[j].tooltip;
            this.availableAnnotationTools.push(values);
          }
        }
      }
      // The hud controls are consistent
      // throughout any updates to the osd canvas.
      this.hud = new $.Hud({
        appendTo: this.element,
        bottomPanelAvailable: this.bottomPanelAvailable,
        windowId: this.windowId,
        canvasControls: this.canvasControls,
        annoEndpointAvailable: this.annoEndpointAvailable,
        showNextPrev : this.imagesList.length !== 1,
        availableAnnotationTools: this.availableAnnotationTools,
        eventEmitter: this.eventEmitter
      });

      this.bindEvents();
      this.listenForActions();

      if (typeof this.bottomPanelAvailable !== 'undefined' && !this.bottomPanelAvailable) {
        _this.eventEmitter.publish('SET_BOTTOM_PANEL_VISIBILITY.' + this.windowId, false);
      } else {
        _this.eventEmitter.publish('SET_BOTTOM_PANEL_VISIBILITY.' + this.windowId, null);
      }

      // start with the image manip controls showing
      this.element.find('.mirador-manipulation-toggle').click();
    },

    template: Handlebars.compile([
                                 '<div class="image-view">',
                                 '</div>'
    ].join('')),

    listenForActions: function() {
      var _this = this,
      firstCanvasId = _this.imagesList[0]['@id'],
      lastCanvasId = _this.imagesList[_this.imagesList.length-1]['@id'];

      _this.eventEmitter.subscribe('bottomPanelSet.' + _this.windowId, function(event, visible) {
        // TODO: mirror this in bookview
        var dodgers = _this.element.find('.mirador-osd-toggle-bottom-panel, .mirador-pan-zoom-controls');
        var arrows = _this.element.find('.mirador-osd-next, .mirador-osd-previous');
        if (visible === true) {
          dodgers.css({transform: 'translateY(-130px)'});
          arrows.css({transform: 'translateY(-65px)'});
        } else {
          dodgers.css({transform: 'translateY(0)'});
          arrows.css({transform: 'translateY(0)'});
        }
      });

      _this.eventEmitter.subscribe('fitBounds.' + _this.windowId, function(event, bounds) {
        var rect = _this.osd.viewport.imageToViewportRectangle(Number(bounds.x), Number(bounds.y), Number(bounds.width), Number(bounds.height));
        _this.osd.viewport.fitBoundsWithConstraints(rect, false);
      });

      _this.eventEmitter.subscribe('currentCanvasIDUpdated.' + _this.windowId, function(event, canvasId) {
        // If it is the first canvas, hide the "go to previous" button, otherwise show it.
        if (canvasId === firstCanvasId) {
          _this.element.find('.mirador-osd-previous').hide();
          _this.element.find('.mirador-osd-next').show();
        } else if (canvasId === lastCanvasId) {
          _this.element.find('.mirador-osd-next').hide();
          _this.element.find('.mirador-osd-previous').show();
        } else {
          _this.element.find('.mirador-osd-next').show();
          _this.element.find('.mirador-osd-previous').show();
        }
        // If it is the last canvas, hide the "go to previous" button, otherwise show it.
      });

      //Related to Annotations HUD
      _this.eventEmitter.subscribe('HUD_REMOVE_CLASS.' + _this.windowId, function(event, elementSelector, className) {
        _this.element.find(elementSelector).removeClass(className);
      });

      _this.eventEmitter.subscribe('HUD_ADD_CLASS.' + _this.windowId, function(event, elementSelector, className) {
        _this.element.find(elementSelector).addClass(className);
      });

      _this.eventEmitter.subscribe('HUD_FADE_IN.' + _this.windowId, function(event, elementSelector, duration) {
        _this.element.find(elementSelector).fadeIn(duration);
      });

      _this.eventEmitter.subscribe('HUD_FADE_OUT.' + _this.windowId, function(event, elementSelector, duration, complete) {
        _this.element.find(elementSelector).fadeOut(duration, complete);
      });

      _this.eventEmitter.subscribe('initBorderColor.' + _this.windowId, function(event, color) {
        _this.element.find('.borderColorPicker').spectrum('set', color);
      });
      _this.eventEmitter.subscribe('initFillColor.' + _this.windowId, function(event, color, alpha) {
        var colorObj = tinycolor(color);
        colorObj.setAlpha(alpha);
        _this.element.find('.fillColorPicker').spectrum('set', colorObj);
      });
      _this.eventEmitter.subscribe('disableBorderColorPicker.'+_this.windowId, function(event, disablePicker) {
        if(disablePicker) {
          _this.element.find('.borderColorPicker').spectrum("disable");
        }else{
          _this.element.find('.borderColorPicker').spectrum("enable");
        }
      });
      _this.eventEmitter.subscribe('disableFillColorPicker.'+_this.windowId, function(event, disablePicker) {
        if(disablePicker) {
          _this.element.find('.fillColorPicker').spectrum("disable");
        }else{
          _this.element.find('.fillColorPicker').spectrum("enable");
        }
      });
      _this.eventEmitter.subscribe('showDrawTools.'+_this.windowId, function(event) {
        _this.element.find('.draw-tool').show();
      });
      _this.eventEmitter.subscribe('hideDrawTools.'+_this.windowId, function(event) {
        _this.element.find('.draw-tool').hide();
      });
      //Related to Annotations HUD
      
      /*
       * Switches the given window to the given choiceImageID, and updates the viewer state.
       *
       * @param {Object} data Contains the id of the window to update, and the choiceImageID to switch to
       */
      _this.eventEmitter.subscribe('showChoiceImage', function(event, data) {
        if (_this.windowId === data.id) {
          _this.selectChoiceImage(data.choiceImageID);

          // goes to SaveController
          _this.eventEmitter.publish('windowUpdated', {
            id: data.id,
            choiceImageIDs: _this.choiceImageIDs
          });
        }
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

      this.element.find('.mirador-osd-next').on('click', function() {
        _this.next();
      });

      this.element.find('.mirador-osd-previous').on('click', function() {
        _this.previous();
      });

      this.element.find('.mirador-osd-annotations-layer').on('click', function() {
        if (_this.hud.annoState.current === 'none') {
          _this.hud.annoState.startup(this);
        }
        if (_this.hud.annoState.current === 'annoOff') {
          _this.hud.annoState.displayOn(this);
        } else {
          //make sure to force the controls back to auto fade
          _this.forceShowControls = false;
          _this.hud.annoState.displayOff(this);
        }
      });

      this.element.find('.mirador-manipulation-toggle').on('click', function() {
        if (_this.hud.manipulationState.current === 'none') {
          _this.hud.manipulationState.startup(this);
        }
        if (_this.hud.manipulationState.current === 'manipulationOff') {
          _this.hud.manipulationState.displayOn(this);
        } else {
          _this.hud.manipulationState.displayOff(this);
        }
      });

      this.element.find('.mirador-osd-go-home').on('click', function() {
        _this.osd.viewport.goHome();
      });

      this.element.find('.mirador-osd-up').on('click', function() {
        var panBy = _this.getPanByValue();
        _this.osd.viewport.panBy(new OpenSeadragon.Point(0, -panBy.y));
        _this.osd.viewport.applyConstraints();
      });
      this.element.find('.mirador-osd-right').on('click', function() {
        var panBy = _this.getPanByValue();
        _this.osd.viewport.panBy(new OpenSeadragon.Point(panBy.x, 0));
        _this.osd.viewport.applyConstraints();
      });
      this.element.find('.mirador-osd-down').on('click', function() {
        var panBy = _this.getPanByValue();
        _this.osd.viewport.panBy(new OpenSeadragon.Point(0, panBy.y));
        _this.osd.viewport.applyConstraints();
      });
      this.element.find('.mirador-osd-left').on('click', function() {
        var panBy = _this.getPanByValue();
        _this.osd.viewport.panBy(new OpenSeadragon.Point(-panBy.x, 0));
        _this.osd.viewport.applyConstraints();
      });

      this.element.find('.mirador-osd-zoom-in').on('click', function() {
        var osd = _this.osd;
        if ( osd.viewport ) {
          osd.viewport.zoomBy(
            osd.zoomPerClick / 1.0
          );
          osd.viewport.applyConstraints();
        }
      });
      this.element.find('.mirador-osd-zoom-out').on('click', function() {
        var osd = _this.osd;
        if ( osd.viewport ) {
          osd.viewport.zoomBy(
            1.0 / osd.zoomPerClick
          );
          osd.viewport.applyConstraints();
        }
      });

      this.element.find('.mirador-osd-toggle-bottom-panel').on('click', function() {
        _this.eventEmitter.publish('TOGGLE_BOTTOM_PANEL_VISIBILITY.' + _this.windowId);
      });

      //Annotation specific controls
      this.element.find('.mirador-osd-edit-mode').on('click', function() {
        if (_this.hud.annoState.current === 'annoOnCreateOff') {
          _this.hud.annoState.createOn();
          //when a user is in Create mode, don't let the controls auto fade as it could be distracting to the user
          _this.forceShowControls = true;
          _this.element.find(".hud-control").stop(true, true).removeClass('hidden', _this.state.getStateProperty('fadeDuration'));
        } else if (_this.hud.annoState.current === 'annoOnCreateOn') {
          _this.hud.annoState.createOff();
          //go back to allowing the controls to auto fade
          _this.forceShowControls = false;
        }
      });

      this.element.find('.mirador-osd-refresh-mode').on('click', function() {
        //update annotation list from endpoint
        _this.eventEmitter.publish('updateAnnotationList.'+_this.windowId);
        _this.eventEmitter.publish('refreshOverlay.'+_this.windowId, '');
      });
      this.element.find('.mirador-osd-delete-mode').on('click', function() {
        _this.eventEmitter.publish('deleteShape.'+_this.windowId, '');
      });
      this.element.find('.mirador-osd-save-mode').on('click', function() {
        _this.eventEmitter.publish('updateEditedShape.'+_this.windowId, '');
      });
      this.element.find('.mirador-osd-edit-mode').on('click', function() {
        _this.eventEmitter.publish('toggleDefaultDrawingTool.'+_this.windowId);
      });

      function make_handler(shapeMode) {
        return function () {
          _this.eventEmitter.publish('toggleDrawingTool.'+_this.windowId, shapeMode);
        };
      }
      jQuery.each(_this.availableAnnotationTools, function(index, value) {
        var shape = value.logoClass;
        _this.element.find('.material-icons:contains(\'' + shape + '\')').on('click', make_handler(shape));
      });
      //Annotation specific controls

      //Image manipulation controls

      //related the ContextControls

      _this.bindImageManipulationEvents();
    },

    //set the original values for all of the CSS filter options
    filterValues: {
      "brightness" : "brightness(100%)",
      "contrast" : "contrast(100%)",
      "saturate" : "saturate(100%)",
      "grayscale" : "grayscale(0%)",
      "invert" : "invert(0%)"
    },

    setFilterCSS: function() {
      var filterCSS = jQuery.map(this.filterValues, function(value, key) { return value; }).join(" "),
      osdCanvas = jQuery(this.osd.canvas);
      osdCanvas.css({
        'filter'         : filterCSS,
        '-webkit-filter' : filterCSS,
        '-moz-filter'    : filterCSS,
        '-o-filter'      : filterCSS,
        '-ms-filter'     : filterCSS
      });
    },

    /*
     * Rotates the current osd canvas.
     *
     * @param {int} degrees Magnitude and direction (+/-) of rotation
     */
    imageRotate: function(degrees) {
      var osd = this.osd;
      if (osd) {
        var currentRotation = osd.viewport.getRotation();
        osd.viewport.setRotation(currentRotation + degrees);
      }
    },

    /*
     * Applies a CSS filter according to specified behavior of current osd canvas.
     */
    applyCSSFilter: function(elt, behavior, val) {
      // in this code we call it saturation, but CSS calls it saturate
      var key = behavior === 'saturation' ? 'saturate' : behavior;
      switch(key) {

        // toggle button controls
        case 'grayscale':
        case 'invert':
          if (jQuery(elt).hasClass('selected')) {
            this.filterValues[key] = key+"(0%)";
            jQuery(elt).removeClass('selected');
          } else {
            this.filterValues[key] = key+"(100%)";
            jQuery(elt).addClass('selected');
          }
          break;

        // slider controls
        case 'brightness':
        case 'contrast':
        case 'saturate':
          this.filterValues[key] = key+"("+val+"%)";
          jQuery(elt).find('.percent').text(val + '%');
          break;

        default:
          // should never get here
          break;
      }
      this.setFilterCSS();
    },

    /*
     * Resets grayscale, invert, brightness, and contrast settings.
     */
    imageManipReset: function() {
      var osd = this.osd;

      //reset rotation
      if (osd) {
        osd.viewport.setRotation(0);
      }

      //reset brightness
      this.filterValues.brightness = "brightness(100%)";
      this.element.find('.mirador-osd-brightness-slider').slider('option','value',100);
      this.element.find('.mirador-osd-brightness-slider').find('.percent').text(100 + '%');

      //reset contrast
      this.filterValues.contrast = "contrast(100%)";
      this.element.find('.mirador-osd-contrast-slider').slider('option','value',100);
      this.element.find('.mirador-osd-contrast-slider').find('.percent').text(100 + '%');

      //reset saturation
      this.filterValues.saturate = "saturate(100%)";
      this.element.find('.mirador-osd-saturation-slider').slider('option','value',100);
      this.element.find('.mirador-osd-saturation-slider').find('.percent').text(100 + '%');

      //reset grayscale
      this.filterValues.grayscale = "grayscale(0%)";
      this.element.find('.mirador-osd-grayscale').removeClass('selected');

      //reset color inversion
      this.filterValues.invert = "invert(0%)";
      this.element.find('.mirador-osd-invert').removeClass('selected');

      this.setFilterCSS();
    },

    /**
     * Binds events related to image manipulation. If removing, be sure to remove the call to this function
     * in this.bindEvents
     */
    bindImageManipulationEvents: function() {
      var _this = this;

      this.element.find('.mirador-osd-rotate-right').on('click', function() {
        var rot = 90;
        _this.imageRotate(rot);

        if (_this.leading) {
          // received by lockController
          _this.eventEmitter.publish('synchronizeImgRotation', {viewObj: _this, value: rot});
        }

      });

      this.element.find('.mirador-osd-rotate-left').on('click', function() {
        var rot = -90;
        _this.imageRotate(rot);

        if (_this.leading) {
          // received by lockController
          _this.eventEmitter.publish('synchronizeImgRotation', {viewObj: _this, value: rot});
        }
      });

      this.element.find('.mirador-osd-brightness-slider').slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 200,
        value: 100,
        create: function(event, ui) {
          var v = jQuery(this).slider('value'),
              span = jQuery('<span class="percent">').text(v + '%');

          jQuery(this).find('.ui-slider-handle').append(span);
        },
        slide: function(event, ui) {
          _this.applyCSSFilter(this, 'brightness', ui.value);

          if (_this.leading) {
            _this.eventEmitter.publish('synchronizeImgBrightness', {viewObj: _this, value: ui.value});
          }
        }
      }).hide();

      this.element.find('.mirador-osd-brightness').on('mouseenter',
        function() {
          _this.element.find('.mirador-osd-brightness-slider').stop(true, true).show();
        }).on('mouseleave',
        function() {
          _this.element.find('.mirador-osd-brightness-slider').stop(true, true).hide();
      });

      this.element.find('.mirador-osd-contrast-slider').slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 200,
        value: 100,
        create: function(event, ui) {
          var v = jQuery(this).slider('value'),
              span = jQuery('<span class="percent">').text(v + '%');

          jQuery(this).find('.ui-slider-handle').append(span);
        },
        slide: function(event, ui) {
          _this.applyCSSFilter(this, 'contrast', ui.value);

          if (_this.leading) {
            _this.eventEmitter.publish('synchronizeImgContrast', {viewObj: _this, value: ui.value});
          }
        }
      }).hide();

      this.element.find('.mirador-osd-contrast').on('mouseenter',
        function() {
          _this.element.find('.mirador-osd-contrast-slider').stop(true, true).show();
        }).on('mouseleave',
        function() {
          _this.element.find('.mirador-osd-contrast-slider').stop(true, true).hide();
      });

      this.element.find('.mirador-osd-saturation-slider').slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 200,
        value: 100,
        create: function(event, ui) {
          var v = jQuery(this).slider('value'),
              span = jQuery('<span class="percent">').text(v + '%');

          jQuery(this).find('.ui-slider-handle').append(span);
        },
        slide: function(event, ui) {
          _this.applyCSSFilter(this, 'saturation', ui.value);

          if (_this.leading) {
            _this.eventEmitter.publish('synchronizeImgSaturation', {viewObj: _this, value: ui.value});
          }
        }
      }).hide();

      this.element.find('.mirador-osd-saturation').on('mouseenter',
        function() {
          _this.element.find('.mirador-osd-saturation-slider').stop(true, true).show();
        }).on('mouseleave',
        function() {
          _this.element.find('.mirador-osd-saturation-slider').stop(true, true).hide();
      });

      this.element.find('.mirador-osd-grayscale').on('click', function() {
        _this.applyCSSFilter(this, 'grayscale');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeImgGrayscale', _this);
        }

      });

      this.element.find('.mirador-osd-invert').on('click', function() {
        _this.applyCSSFilter(this, 'invert');

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeImgInvert', _this);
        }
      });

      this.element.find('.mirador-osd-reset').on('click', function() {
        _this.imageManipReset();

        if (_this.leading) {
          _this.eventEmitter.publish('synchronizeImgReset', _this);
        }
      });
    },

    getPanByValue: function() {
      var bounds = this.osd.viewport.getBounds(true);
      //for now, let's keep 50% of the image on the screen
      var panBy = {
        "x" : bounds.width * 0.5,
        "y" : bounds.height * 0.5
      };
      return panBy;
    },

    setBounds: function() {
      var _this = this;
      this.osdOptions.osdBounds = this.osd.viewport.getBounds(true);
      _this.eventEmitter.publish("imageBoundsUpdated", {
        id: _this.windowId,
          osdBounds: {
            x: _this.osdOptions.osdBounds.x,
            y: _this.osdOptions.osdBounds.y,
            width: _this.osdOptions.osdBounds.width,
            height: _this.osdOptions.osdBounds.height
          }
      });
      var rectangle = this.osd.viewport.viewportToImageRectangle(this.osdOptions.osdBounds);
      _this.eventEmitter.publish("imageRectangleUpdated", {
        id: _this.windowId,
        osdBounds: {
          x: Math.round(rectangle.x),
          y: Math.round(rectangle.y),
          width: Math.round(rectangle.width),
          height: Math.round(rectangle.height)
        }
      });
    },

    toggle: function(stateValue) {
      if (stateValue) {
        this.show();
      } else {
        this.hide();
      }
    },

    hide: function() {
      jQuery(this.element).hide({effect: "fade", duration: 300, easing: "easeOutCubic"});
    },

    show: function() {
      jQuery(this.element).show({
        effect: "fade", duration: 300, easing: "easeInCubic", complete: function () {
          // Under firefox $.show() used under display:none iframe does not change the display.
          // This is workaround for https://github.com/IIIF/mirador/issues/929
          jQuery(this).css('display', 'block');
        }
      });
    },

    adjustWidth: function(className, hasClass) {
      var _this = this;
      if (hasClass) {
        _this.eventEmitter.publish('REMOVE_CLASS.'+this.windowId, className);
      } else {
        _this.eventEmitter.publish('ADD_CLASS.'+this.windowId, className);
      }
    },

    adjustHeight: function(className, hasClass) {
      if (hasClass) {
        this.element.removeClass(className);
      } else {
        this.element.addClass(className);
      }
    },

    /*
     * Instantiates an OSD object.
     *
     * @param {String | Object} imageUrlData If {String}, no image choice. If {Object}, image choice.
     */
    createOpenSeadragonInstance: function(imageUrlData) {
      var infoJsonUrl,
      infoJsonUrlList,
      uniqueID = $.genUUID(),
      osdID = 'mirador-osd-' + uniqueID,
      _this = this,
      defaultImgObj,
      alternateImgObjList = [];

      if (typeof imageUrlData === 'string') {
        jQuery.when.apply(this, [
          jQuery.getJSON(imageUrlData, function(data) { 
            defaultImgObj = data;
          })]
        ).then(function() {
          initOSD(defaultImgObj);
        });

      } else if (typeof imageUrlData === 'object') {
        jQuery.when.apply(this, [
          jQuery.getJSON(imageUrlData['default']['@id'], function(data) { 
            imageUrlData['default'].data = data;
          })]
          .concat(imageUrlData.item.map(function(v) {
            return jQuery.getJSON(v['@id'], function(data) {
              v.data = data;
            });
          }))
        ).then(function() {
          _this.imageChoice = imageUrlData;
          initOSD(imageUrlData);
        });
      }



      this.element.find('.' + this.osdCls).remove();

      /*
       * @param {Object} infoJson An object that is the contents of info.json.
       */
      var initOSD = function(infoJson) {
        var isMultiImage = infoJson.hasOwnProperty('default') && infoJson.hasOwnProperty('item');

        _this.elemOsd =
          jQuery('<div/>')
        .addClass(_this.osdCls)
        .attr('id', osdID)
        .appendTo(_this.element);

        _this.osd = $.OpenSeadragon({
          'id':           osdID,
          'infoJson': infoJson,
          'uniqueID' : uniqueID
        });

        _this.osd.addHandler('zoom', $.debounce(function(){
          var point = {
            'x': -10000000,
            'y': -10000000
          };
          _this.eventEmitter.publish('updateTooltips.' + _this.windowId, [point, point]);

          // tell lock controller to move any synchronized views
          if (_this.leading) {
            _this.eventEmitter.publish('synchronizeZoom', _this);
          }
        }, 30));

        _this.osd.addHandler('pan', $.debounce(function(){
          var point = {
            'x': -10000000,
            'y': -10000000
          };
          _this.eventEmitter.publish('updateTooltips.' + _this.windowId, [point, point]);

          // tell lock controller to move any synchronized views
          if (_this.leading) {
            _this.eventEmitter.publish('synchronizePan', _this);
          }
        }, 30));


        if (_this.state.getStateProperty('autoHideControls')) {
          var timeoutID = null,
          fadeDuration = _this.state.getStateProperty('fadeDuration'),
          timeoutDuration = _this.state.getStateProperty('timeoutDuration');
          var hideHUD = function() {
            _this.element.find(".hud-control").stop(true, true).addClass('hidden', fadeDuration);
          };
          hideHUD();
          jQuery(_this.element).on('mousemove', function() {
            window.clearTimeout(timeoutID);
            // When a user is in annotation create mode, force show the controls so they don't disappear when in a qtip, so check for that
            if (!_this.forceShowControls) {
              _this.element.find(".hud-control").stop(true, true).removeClass('hidden', fadeDuration);
              timeoutID = window.setTimeout(hideHUD, timeoutDuration);
            }
          }).on('mouseleave', function() {
            if (!_this.forceShowControls) {
              window.clearTimeout(timeoutID);
              hideHUD();
            }
          });
        }

//        if (_this.state.getStateProperty('autoHideControls')) {
//          var timeoutID = null,
//          fadeDuration = _this.state.getStateProperty('fadeDuration'),
//          timeoutDuration = _this.state.getStateProperty('timeoutDuration');
//          var hideHUD = function() {
//            _this.element.find(".hud-control").stop(true, true).addClass('hidden', fadeDuration);
//          };
//          hideHUD();
//          jQuery(_this.element).on('mousemove', function() {
//            window.clearTimeout(timeoutID);
//            _this.element.find(".hud-control").stop(true, true).removeClass('hidden', fadeDuration);
//            // When a user is in annotation create mode, force show the controls so they don't disappear when in a qtip, so check for that
//            if (!_this.forceShowControls) {
//              timeoutID = window.setTimeout(hideHUD, timeoutDuration);
//            }
//          }).on('mouseleave', function() {
//            if (!_this.forceShowControls) {
//              window.clearTimeout(timeoutID);
//              hideHUD();
//            }
//          });
//        }

        _this.osd.addHandler('open', function(){
          // TODO: do we need the following line?
          _this.eventEmitter.publish('osdOpen.'+_this.windowId);

          if (_this.osdOptions.osdBounds) {
            var rect = new OpenSeadragon.Rect(_this.osdOptions.osdBounds.x, _this.osdOptions.osdBounds.y, _this.osdOptions.osdBounds.width, _this.osdOptions.osdBounds.height);
            _this.osd.viewport.fitBounds(rect, true);
          } else {
            _this.setBounds();
          }

          _this.addAnnotationsLayer(_this.elemAnno);

          // if current annoState is 'none' that means it has been initialized but not used
          // use annotationState to choose event
          if (_this.hud.annoState.current === 'none') {
              _this.hud.annoState.startup(null);
            if (_this.annotationState === 'annoOnCreateOff') {
              _this.hud.annoState.displayOn(null);
            } else if (_this.annotationState === 'annoOnCreateOn') {
              _this.hud.annoState.createOn(null);
            }
          } else {
            // if the current state is not 'none' then we need to update the annotations layer,
            // with the current state, for the new canvas
            if (_this.hud.annoState.current === 'annoOnCreateOff') {
              _this.hud.annoState.refreshCreateOff(null);
            } else if (_this.hud.annoState.current === 'annoOnCreateOn') {
              _this.hud.annoState.refreshCreateOn(null);
            }
          }

          // A hack. Pop the osd overlays layer after the canvas so
          // that annotations appear.
          jQuery(_this.osd.canvas).children().first().remove().appendTo(_this.osd.canvas);

          _this.osd.addHandler('zoom', $.debounce(function() {
            _this.setBounds();
          }, 500));

          _this.osd.addHandler('pan', $.debounce(function(){
            _this.setBounds();
          }, 500));

          // send message to window so that it can render dropdown menu and register events on it
          if (isMultiImage) {
            var choiceImgId = _this.choiceImageIDs[_this.canvasID];
            if (choiceImgId) {
              _this.selectChoiceImage(choiceImgId);
            }

            // tell window to render the dropdown menu
            _this.eventEmitter.publish('imageChoiceReady', {
              data: [infoJson['default']].concat(infoJson.item),
              id: _this.windowId
            });
          }
          else {
            // tell window to render the dropdown menu
            _this.eventEmitter.publish('noImageChoice', _this.windowId);
          }
        });

        if (isMultiImage) {
          _this.osd.open(infoJson['default'].data, {opacity:1, x:0, y:0, width:1});
        } else {
          _this.osd.open(infoJson, {opacity:1, x:0, y:0, width:1});
        }
      }; 
    },


    /*
     * Displays the choice image whose label matches the given id.
     *
     * @param {String} id Label of the image to select.
     */
    selectChoiceImage: function(id) {
      var _this = this;

      /*
       * Adds a new tiled image to OSD.
       *
       * @param {Array} tileSources Single-element array containing a tileSource object.
       */
      var addAlternateImages = function(tileSources) {
        jQuery.each(tileSources, function(index, value) {
          // assumes that images are all the same size
          var options = {
            tileSource: value,
            opacity: 1,
            x: 0,
            y: 0,
            width: 1
          };
          _this.osd.addTiledImage(options);
        });
      };

      if (_this.imageChoice['default'].label === id) {
        addAlternateImages([_this.imageChoice['default'].data]);
      }
      else
      {
        addAlternateImages(_this.imageChoice.item.filter(function(e) { return e.label === id ? true : false; }).map(function(v) { return v.data; }));
      }

      // remove the old canvas
      _this.osd.world.removeItem(_this.osd.world.getItemAt(0));

      // update data model
      _this.choiceImageIDs[_this.canvasID] = id;
    },

    addAnnotationsLayer: function(element) {
      var _this = this;
      _this.annotationsLayer = new $.AnnotationsLayer({
        state: _this.state,
        annotationsList: _this.state.getWindowAnnotationsList(_this.windowId) || [],
        viewer: _this.osd,
        windowId: _this.windowId,
        element: element,
        eventEmitter: _this.eventEmitter
      });
    },

    updateImage: function(canvasID) {
      var _this = this;
      if (this.canvasID !== canvasID) {
        this.canvasID = canvasID;
        this.currentImgIndex = $.getImageIndexById(this.imagesList, canvasID);
        this.currentImg = this.imagesList[this.currentImgIndex];
        this.osdOptions = {
          osdBounds:        null,
          zoomLevel:        null
        };
        this.osd.close();

        if ($.Iiif.imageHasAlternateResources(this.currentImg)) {
          this.createOpenSeadragonInstance($.Iiif.getImageResourceLabelsIdsAndThumbnails(this.currentImg));
        } else {
          this.createOpenSeadragonInstance($.Iiif.getImageUrl(this.currentImg));
        }
        _this.eventEmitter.publish('UPDATE_FOCUS_IMAGES.' + this.windowId, {array: [canvasID]});
      } else {
        _this.eventEmitter.publish('UPDATE_FOCUS_IMAGES.' + this.windowId, {array: [canvasID]});
      }
    },

    next: function() {
      var _this = this;
      var next = this.currentImgIndex + 1;

      if (next < this.imagesList.length) {
        _this.eventEmitter.publish('SET_CURRENT_CANVAS_ID.' + this.windowId, this.imagesList[next]['@id']);
      }
    },

    previous: function() {
      var _this = this;
      var prev = this.currentImgIndex - 1;

      if (prev >= 0) {
        _this.eventEmitter.publish('SET_CURRENT_CANVAS_ID.' + this.windowId, this.imagesList[prev]['@id']);
      }
    }
  };

}(Mirador));
