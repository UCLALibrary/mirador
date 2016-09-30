(function($) {

    $.MainMenu = function(options) {

        jQuery.extend(true, this, {
            element:                    null,
            mainMenuHeight:             null,
            mainMenuWidth:              null,
            windowOptionsMenu:          null,
            loadWindow:                 null,
            clearLocalStorage:          '',
            viewerCls:                  'mirador-viewer',
            mainMenuBarCls:             'mirador-main-menu-bar',
            mainMenuCls:                'mirador-main-menu',
            windowOptionsMenuCls:       'mirador-window-options-menu',
            clearLocalStorageCls:       'clear-local-storage',
            clearLocalStorageDialogCls: 'mirador-main-menu-clear-local-storage',
            collectionsListingCls:      'mirador-listing-collections',
            state:                      null,
            eventEmitter:               null
        }, options);

        this.element  = this.element || jQuery('<div/>');

        this.init();

    };


    $.MainMenu.prototype = {

        init: function() {
            //this.mainMenuHeight = this.parent.mainMenuSettings.height;
            //this.mainMenuWidth = this.parent.mainMenuSettings.width;
            this.element
            .addClass(this.mainMenuBarCls)
            //.height(this.mainMenuHeight)
            //.width(this.mainMenuWidth)
            .appendTo(this.appendTo);

            this.element.append(this.template({
                mainMenuCls: this.mainMenuCls,
                showBookmark : this.state.getStateProperty('mainMenuSettings').buttons.bookmark,
                showLayout : this.state.getStateProperty('mainMenuSettings').buttons.layout && !this.state.getStateProperty('flexibleWorkspace'),
		        showAddWindow : this.state.getStateProperty('flexibleWorkspace'),
		        showAddDragHandle : this.state.getStateProperty('flexibleWorkspace'),
		        showWorkspaceDownload: this.state.getStateProperty('workspaceDownload'),
                // TODO: showLockGroup
                showOptions: this.state.getStateProperty('mainMenuSettings').buttons.options,
                showFullScreenViewer : this.state.getStateProperty('mainMenuSettings').buttons.fullScreenViewer,
                userButtons: this.state.getStateProperty('mainMenuSettings').userButtons,
                userLogo:    this.state.getStateProperty('mainMenuSettings').userLogo
            }));

            this.element.find('.mainmenu-button').each(function() {
              jQuery(this).qtip({
                content: {
                  text: jQuery(this).attr('title'),
                },
                position: {
                  my: 'top center',
                  at: 'bottom center'
                },
                style: {
                  classes: 'qtip-dark qtip-shadow qtip-rounded'
                },
              });
            });

            this.listenForActions();
            this.bindEvents();
        },

        listenForActions: function() {
          var _this = this;

          _this.eventEmitter.subscribe('MAINMENU_FULLSCREEN_BUTTON', function(event) {
            var fullScreenButton = _this.element.find('.fullscreen-viewer span');
            if (fullScreenButton.hasClass('fa-expand')) {
              fullScreenButton.removeClass('fa-expand').addClass('fa-compress');
            } else {
              fullScreenButton.removeClass('fa-compress').addClass('fa-expand');
            }
          });
          
          /*
           * Receives the current overlay state object from the viewer object and sets and unsets the
           * active class.
           *
           * @param {Object} state The overlay state object.
           */
          _this.eventEmitter.subscribe('OVERLAY_STATES_STEADY', function(event, state) {
            
            // map from state-key to class of mainmenu button
            var stateToSelector = {
              'workspacePanelVisible': '.change-layout',
              'bookmarkPanelVisible': '.bookmark-workspace',
              'workspaceUploadPanelVisible': '.workspace-upload',
              'workspaceDownloadPanelVisible': '.workspace-download',
              'lockGroupsPanelVisible': '.toggle-lock-groups'
            };

            // set the class of each panel. only one will be active at any given time
            jQuery.each(state, function(k, v) {
              if (v === true) {
                jQuery(stateToSelector[k]).addClass('active');
              } else {
                jQuery(stateToSelector[k]).removeClass('active');
              } 
            });
          });
        },

        bindEvents: function() {
            var _this = this;

            // map from class of mainmenu button to eventEmitter-event
            var selectorEvent = {
              '.change-layout': 'TOGGLE_WORKSPACE_PANEL',
              '.bookmark-workspace': 'TOGGLE_BOOKMARK_PANEL',
              '.workspace-upload': 'TOGGLE_WORKSPACE_UPLOAD_PANEL',
              '.workspace-download': 'TOGGLE_WORKSPACE_DOWNLOAD_PANEL',
              '.toggle-lock-groups': 'TOGGLE_LOCK_GROUPS_PANEL',
              '.fullscreen-viewer': 'TOGGLE_FULLSCREEN',
              '.add-flexible-slot': 'ADD_FLEXIBLE_SLOT',
              '.add-drag-handle': 'ADD_DRAG_HANDLE'
            };

            // set onclick events that publish to eventEmitter, according to selectorEvent
            jQuery.each(selectorEvent, function(k, v) {

              _this.element.find(k).on('click', function() {
                _this.eventEmitter.publish(v);
              });
            });
        },

        template: Handlebars.compile([
        '{{#if userLogo}}',
          '<ul class="user-logo {{mainMenuCls}}">',
            '{{userlogo userLogo}}',
          '</ul>',
        '{{/if}}',
        '<ul class="{{mainMenuCls}}">',
        '{{#if showBookmark}}',
          '<li>',
            '<a href="javascript:;" class="bookmark-workspace mainmenu-button" title="{{t "bookmarkTooltip"}}" aria-label="{{t "bookmarkTooltip"}}">',
              '<span class="fa fa-bookmark fa-lg fa-fw"></span> {{t "bookmark"}}',
            '</a>',
          '</li>',
        '{{/if}}',
        /*'{{#if showOptions}}',
          '<li>',
            '<a href="javascript:;" class="window-options" title="Window Options">',
              '<span class=""></span>Options',
            '</a>',
          '</li>',
        '{{/if}}',*/
        '{{#if showLayout}}',
          '<li>',
            '<a href="javascript:;" class="change-layout mainmenu-button" title="{{t "changeLayoutTooltip"}}" aria-label="{{t "changeLayoutTooltip"}}">',
              '<span class="fa fa-th-large fa-lg fa-fw"></span> {{t "changeLayout"}}',
            '</a>',
          '</li>',
        '{{/if}}',
        '{{#if showAddWindow}}',
          '<li>',
            '<a href="javascript:;" class="add-flexible-slot mainmenu-button" title="Add a blank window to the workspace">',
              '<span class="fa fa-th-large fa-lg fa-fw"></span> Add Window',
            '</a>',
          '</li>',
        '{{/if}}',
        '{{#if showAddDragHandle}}',
          '<li>',
            '<a href="javascript:;" class="add-drag-handle mainmenu-button" title="Add a new drag handle to the workspace">',
              '<span class="fa fa-suitcase fa-lg fa-fw"></span> Add Drag Handle',
            '</a>',
          '</li>',
        '{{/if}}',
        // lockController
          '<li>',
            '<a href="javascript:;" class="toggle-lock-groups mainmenu-button" title="Create, delete, and manage settings of &quot;synchronized window groups&quot;">',
              '<span class="fa fa-lock fa-lg fa-fw"></span> Synchronized Windows',
            '</a>',
          '</li>',
        // end lockController
        '{{#if showWorkspaceDownload}}',
          '<li>',
            '<a href="javascript:;" class="workspace-download mainmenu-button" title="Save this workspace to your desktop">',
              '<span class="fa fa-download fa-lg fa-fw"></span> Download Workspace',
            '</a>',
          '</li>',
          '<li>',
            '<a href="javascript:;" class="workspace-upload mainmenu-button" title="Restore a previously downloaded workspace">',
              '<span class="fa fa-upload fa-lg fa-fw"></span> Upload Workspace',
            '</a>',
          '</li>',
        '{{/if}}',
        '{{#if showFullScreenViewer}}',
          '<li>',
            '<a href="javascript:;" class="fullscreen-viewer mainmenu-button" title="{{t "fullScreenTooltip"}}" aria-label="{{t "fullScreenTooltip"}}">',
              '<span class="fa fa-expand fa-lg fa-fw"></span> {{t "fullScreen"}}',
            '</a>',
          '</li>',
        '{{/if}}',
        '</ul>',
        '{{#if userButtons}}',
          '{{userbtns userButtons}}',
        '{{/if}}'
        ].join(''))
    };

    /* Helper methods for processing userButtons provided in configuration */

    /*    Processes userButtons configuration setting   *
     ****************************************************
     * userButtons, if present, should be an array      *
     *                                                  *
     * Its elements should be objects, which can        *
     * have the following attributes:                   *
     *                                                  *
     *   label: text label assigned to the link         *
     *          created. (required)                     *
     *   attributes: HTML attributes to add to the      *
     *          button.  If there is a "callback"       *
     *          attribute for the button, this MUST     *
     *          exist and MUST contain an "id" value    *
     *   li_attributes: HTML attributes to add to the   *
     *          list item containing the button.        *
     *   iconClass: class or space-separated list of    *
     *          classes. If present, an empty span with *
     *          these classes will be prepended to the  *
     *          content of the link element
     *   sublist: Sublist of buttons, to be implemented *
     *          as a dropdown via CSS/JS                *
     *   ul_attributes: HTML attributes to add to the   *
     *          sublist UL contained in the button.     *
     *          Ignored if button isn't representing    *
     *          a sublist.                              *
     *                                                  *
     * NOTE: sublist dropdown functionality is not yet  *
     *       implemented                                *
     ****************************************************/
    var processUserButtons = function (btns) {
        var output = [];
        var btn;
        var btns_len = btns.length;

        for (var i = 0; i < btns_len; i++){
            output.push(processUserBtn(btns[i]));
        }
        return output;
    };

    var processUserBtn = function (btn) {
        var $li = jQuery('<li>');
        var $a = jQuery('<a>');
        var $sub_ul;

        try {
            /* Enclosing <li> for button */
            if (btn.li_attributes){
                $li.attr(btn.li_attributes);
            }

            /* Link for button. */
            if (!btn.label) {
                throw "userButtons must have labels";
            }

            $a.text(btn.label);

            if (btn.iconClass) {
                $a.prepend('<span class="' + btn.iconClass + '"></span> ');
            }

            if (btn.attributes){
                $a.attr(btn.attributes);
            }

            $li.append($a);

            /* Sublist if present */
            if (btn.sublist) {
                $sub_ul = jQuery('<ul>');
                if (btn.ul_attributes){
                    $sub_ul.attr(btn.ul_attributes);
                }
                /* Recurse! */
                $sub_ul.append(processUserButtons(btn.sublist));

                $li.append($sub_ul);
            }

            return $li;
        }
        catch (err) {
            console && console.log && console.log(err);
            return jQuery();
        }
    };

    Handlebars.registerHelper('userbtns', function (userButtons) {
        return new Handlebars.SafeString(
            jQuery('<ul class="user-buttons ' + this.mainMenuCls +'"></ul>').append(processUserButtons(userButtons)).get(0).outerHTML
        );
    });

    Handlebars.registerHelper('userlogo', function (userLogo) {
        return new Handlebars.SafeString(
            processUserBtn(userLogo).get(0).outerHTML
        );
    });

}(Mirador));
