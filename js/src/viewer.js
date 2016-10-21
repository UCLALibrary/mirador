(function($) {

  $.Viewer = function(options) {
    jQuery.extend(true, this, {
      id:                     null,
      data:                   null,
      element:                null,
      canvas:                 null,
      workspaceType:          null,
      layout:                 null,
      workspace:              null,
      mainMenu:               null,
      workspaceAutoSave:      null,
      windowSize:             {},
      resizeRatio:            {},
      currentWorkspaceVisible: true,
      state:                  null,
      eventEmitter:           null,
      overlayStates:          {
        'workspacePanelVisible': false,
        'manifestsPanelVisible': false,
        'optionsPanelVisible': false,
        'bookmarkPanelVisible': false,
        'workspaceUploadPanelVisible': false,
        'workspaceDownloadPanelVisible': false,
        'lockGroupsPanelVisible': false
      },
      manifests:             []
    }, options);

    this.id = this.state.getStateProperty('id');
    this.data = this.state.getStateProperty('data');
    // get initial manifests
    this.element = this.element || jQuery('#' + this.id);
    if (options.availableAnnotationDrawingTools && options.availableAnnotationDrawingTools.length > 0) {
      this.availableAnnotationDrawingTools = options.availableAnnotationDrawingTools;
    }

    if (this.data) {
      this.init();
    }
  };

  $.Viewer.prototype = {

    init: function() {
      var _this = this;

      //initialize i18next
      i18n.init({
        fallbackLng: 'en',
        load: 'unspecific',
        debug: false,
        getAsync: true,
        resGetPath: _this.state.getStateProperty('buildPath') + _this.state.getStateProperty('i18nPath')+'__lng__/__ns__.json'
      }, _this.setupViewer.bind(_this));
      // because this is a callback, we need to bind "_this" to explicitly retain the calling context of this function (the viewer object instance));
    },

    setupViewer: function() {
      var _this = this;
      //add background and positioning information on the root element that is provided in config
      var backgroundImage = _this.state.getStateProperty('buildPath') + _this.state.getStateProperty('imagesPath') + 'debut_dark.png';
      this.element.css('background-color', '#333').css('background-image','url('+backgroundImage+')').css('background-position','left top')
      .css('background-repeat','repeat');

      //register Handlebars helper
      Handlebars.registerHelper('t', function(i18n_key) {
        var result = i18n.t(i18n_key);
        return new Handlebars.SafeString(result);
      });

      //check all buttons in mainMenu.  If they are all set to false, then don't show mainMenu
      var showMainMenu = false;
      jQuery.each(this.state.getStateProperty('mainMenuSettings').buttons, function(key, value) {
        if (value) { showMainMenu = true; }
      });
      // but, mainMenu should be displayed if we have userButtons and/or userLogo defined
      if (this.state.getStateProperty('mainMenuSettings').userButtons && this.state.getStateProperty('mainMenuSettings').userButtons.length > 0) {
        showMainMenu = true;
      }
      if (this.state.getStateProperty('mainMenuSettings').userLogo && !jQuery.isEmptyObject(this.state.getStateProperty('mainMenuSettings').userLogo)) {
        showMainMenu = true;
      }

      //even if all these buttons are available, developer can override and set show to false,
      //in which case, don't show mainMenu at all
      if (this.state.getStateProperty('mainMenuSettings').show === false) {
        showMainMenu = false;
      }

      // add main menu
      if (showMainMenu) {
        this.mainMenu = new $.MainMenu({ appendTo: this.element, state: this.state, eventEmitter: this.eventEmitter });
      }

      // add viewer area
      this.canvas = jQuery('<div/>')
      .addClass('mirador-viewer')
      .appendTo(this.element);

      if (!showMainMenu) {
        this.canvas.css("top", "0px");
      }

      // add workspace configuration
      this.layout = this.state.getStateProperty('layout');

      this.workspace = new $.Workspace({
        layoutDescription: this.layout.charAt(0) === '{' ?
                             JSON.parse(this.layout) :
                             isNaN(this.layout) ?
                               $.layoutDescriptionFromGridString(this.layout) :
                               $.layoutDescriptionFromGridString('1x' + this.layout),
        appendTo: this.element.find('.mirador-viewer'),
        state: this.state,
        lockController: new $.LockController({
          state: this.state,
          eventEmitter: this.eventEmitter
        }),
        eventEmitter: this.eventEmitter
      });

      this.workspacePanel = new $.WorkspacePanel({
        appendTo: this.element.find('.mirador-viewer'),
        state: this.state,
        eventEmitter: this.eventEmitter
      });

      // for managing lock groups
      this.lockGroupsPanel = new $.LockGroupsPanel({
        appendTo: this.element.find('.mirador-viewer'),
        state: this.state,
        eventEmitter: this.eventEmitter
      });

      this.manifestsPanel = new $.ManifestsPanel({ appendTo: this.element.find('.mirador-viewer'), state: this.state, eventEmitter: this.eventEmitter });
      //only instatiate bookmarkPanel if we need it
      if (showMainMenu && this.state.getStateProperty('mainMenuSettings').buttons.bookmark) {
        this.bookmarkPanel = new $.BookmarkPanel({ appendTo: this.element.find('.mirador-viewer'), state: this.state, eventEmitter: this.eventEmitter });
      }

      // add file upload panel
      if (showMainMenu && this.state.getStateProperty('workspaceDownload')) {
        this.workspaceUploadPanel = new $.WorkspaceUploadPanel({ appendTo: this.element.find('.mirador-viewer'), state: this.state, eventEmitter: this.eventEmitter });
        this.workspaceDownloadPanel = new $.WorkspaceDownloadPanel({ appendTo: this.element.find('.mirador-viewer'), state: this.state, eventEmitter: this.eventEmitter });
      }

      // set this to be displayed
      this.set('currentWorkspaceVisible', true);

      this.bindEvents();
      this.listenForActions();
      // retrieve manifests
      this.getManifestsData();

      if (this.state.getStateProperty('windowObjects').length === 0 && this.state.getStateProperty('openManifestsPage')) {
        this.workspace.slots[0].addItem();
      }
    },

    listenForActions: function() {
      var _this = this;

      // check that windows are loading first to set state of slot?
      _this.eventEmitter.subscribe('manifestReceived', function(event, newManifest) {
        if (_this.state.getStateProperty('windowObjects')) {
          var check = jQuery.grep(_this.state.getStateProperty('windowObjects'), function(object, index) {

            // handle manifests whose URIs don't end in .json 
            // TODO: remove the second || operand
            return object.loadedManifest === newManifest.uri || -1 !== newManifest.uri.indexOf(object.loadedManifest);
          });
          jQuery.each(check, function(index, config) {
            _this.loadManifestFromConfig(config);
          });
        }
      });

      _this.eventEmitter.subscribe('TOGGLE_WORKSPACE_PANEL', function(event) {
        _this.toggleWorkspacePanel();
      });

      _this.eventEmitter.subscribe('TOGGLE_BOOKMARK_PANEL', function(event) {
        _this.toggleBookmarkPanel();
      });

      _this.eventEmitter.subscribe('TOGGLE_WORKSPACE_UPLOAD_PANEL', function(event) {
        _this.toggleWorkspaceUploadPanel();
      });

      _this.eventEmitter.subscribe('TOGGLE_WORKSPACE_DOWNLOAD_PANEL', function(event) {
        _this.toggleWorkspaceDownloadPanel();
      });

      _this.eventEmitter.subscribe('TOGGLE_LOCK_GROUPS_PANEL', function(event) {
        _this.toggleLockGroupsPanel();
      });

      _this.eventEmitter.subscribe('TOGGLE_FULLSCREEN', function(event) {
        if ($.fullscreenElement()) {
          $.exitFullscreen();
          //enable any window-specific fullscreen buttons
          _this.eventEmitter.publish('ENABLE_WINDOW_FULLSCREEN');
        } else {
          $.enterFullscreen(_this.element[0]);
          //disable any window-specific fullscreen buttons
          _this.eventEmitter.publish('DISABLE_WINDOW_FULLSCREEN');
        }
      });

      jQuery(document).on("webkitfullscreenchange mozfullscreenchange fullscreenchange", function() {
        _this.eventEmitter.publish('MAINMENU_FULLSCREEN_BUTTON');
        // in case the user clicked ESC instead of clicking on the toggle fullscreen button, reenable the window fullscreen button
        if (!$.fullscreenElement()) {
          _this.eventEmitter.publish('ENABLE_WINDOW_FULLSCREEN');
        }
      });

      _this.eventEmitter.subscribe('TOGGLE_LOAD_WINDOW', function(event) {
        _this.toggleLoadWindow();
      });

      _this.eventEmitter.subscribe('ADD_MANIFEST_FROM_URL', function(event, url, location) {
        _this.addManifestFromUrl(url, location);
      });

      _this.eventEmitter.subscribe('TOGGLE_OVERLAYS_FALSE', function(event) {
        jQuery.each(_this.overlayStates, function(oState, value) {
          // toggles the other top-level panels closed and focuses the
          // workspace. For instance, after selecting an object from the
          // manifestPanel.
          _this.set(oState, false, {parent: 'overlayStates'});
        });
      });

    },

    bindEvents: function() {
      var _this = this;
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

    // Sets state of overlays that layer over the UI state
    toggleOverlay: function(state) {
      var _this = this;
      // first confirm all others are off
      jQuery.each(this.overlayStates, function(oState, value) {
        if (state !== oState) {
          _this.set(oState, false, {parent: 'overlayStates'});
        }
      });
      var currentState = this.get(state, 'overlayStates');
      this.set(state, !currentState, {parent: 'overlayStates'});

      // let mainMenu know that it can set classes now
      _this.eventEmitter.publish('OVERLAY_STATES_STEADY', this.overlayStates);
    },

    toggleLoadWindow: function() {
      this.toggleOverlay('manifestsPanelVisible');
    },

    toggleWorkspacePanel: function() {
      this.toggleOverlay('workspacePanelVisible');
    },

    toggleBookmarkPanel: function() {
      this.toggleOverlay('bookmarkPanelVisible');
    },

    toggleWorkspaceUploadPanel: function() {
      this.toggleOverlay('workspaceUploadPanelVisible');
    },

    toggleWorkspaceDownloadPanel: function() {
      this.toggleOverlay('workspaceDownloadPanelVisible');
    },

    toggleLockGroupsPanel: function() {
      this.toggleOverlay('lockGroupsPanelVisible');
      // TODO: no need to do this everytime, very hacky since accordion menu is squished when
      // it is updated when hidden
      jQuery('#lock-groups').accordion('refresh');
    },

    getManifestsData: function() {
      var _this = this;

      _this.data.forEach(function(manifest) {
        if (manifest.hasOwnProperty('manifestContent')) {
          var content = manifest.manifestContent;
          _this.addManifestFromUrl(content['@id'], manifest.location ? manifest.location : '', content);
        } else if (manifest.hasOwnProperty('manifestUri')) {
          var url = manifest.manifestUri;
          _this.addManifestFromUrl(url, manifest.location ? manifest.location : '', null);
        } else if (manifest.hasOwnProperty('collectionUri')) {
          jQuery.getJSON(manifest.collectionUri).done(function (data, status, jqXHR) {
            if (data.hasOwnProperty('manifests')){
              jQuery.each(data.manifests, function (ci, mfst) {
                _this.addManifestFromUrl(mfst['@id'], '', null);
              });
            }
          }).fail(function(jqXHR, status, error) {
            console.log(jqXHR, status, error);
          });
        }
      });
    },

    hasWidgets: function(collection) {
      return (
        typeof collection.widgets !== 'undefined' &&
        collection.widgets &&
        !jQuery.isEmptyObject(collection.widgets) &&
        collection.widgets.length > 0
      );
    },

    addManifestFromUrl: function(url, location, content) {
      var _this = this,
        manifest;

      if (!_this.state.getStateProperty('manifests')[url]) {
        manifest = new $.Manifest(url, location, content);
        _this.eventEmitter.publish('manifestQueued', manifest, location);
        manifest.request.done(function() {
          _this.eventEmitter.publish('manifestReceived', manifest);
        });
      }
    },

    loadManifestFromConfig: function(options) {
      var _this = this;

      //make a copy of options and pass that so we don't get a circular reference
      var windowConfig = jQuery.extend(true, {}, options);
      //delete this old set of options (because they will be replaced by the actions from ADD_WINDOW)
      _this.eventEmitter.publish('DELETE_FROM_CONFIG', options);

      _this.eventEmitter.publish('ADD_WINDOW', windowConfig);
    }
  };

}(Mirador));
