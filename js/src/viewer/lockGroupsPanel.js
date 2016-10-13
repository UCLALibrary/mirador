/*jshint scripturl:true*/
(function($) {

  /*
   * Class that responds to actions performed on the DOM element. A member of $.Viewer.
   *
   * @param {Object} options Configuration options.
   *     appendTo: element to append the panel to
   *     state: global state object
   *     eventEmitter: event message queue
   */
  $.LockGroupsPanel = function(options) {

    jQuery.extend(true, this, {
      element: null,
      appendTo: null,
    }, options);

    /*
     * options for each lock group settings form
     *
     * name: input name attribute
     * label: input element label
     * type: input type attribute
     * disabled: whether or not is disabled
     * test: test to see if input is checked or not
     * options: nested inputs
     */
    this.formOptions = [
      {
        name: 'zoompan',
        label: 'zoom/pan',
        type: 'checkbox',
        disabled: false,
        test: function(lg) { return function(d) { return lg.byGroup[d].settings.zoompan ? 'checked' : ''; };},
        options: [
          {
            name: 'dimensionalLockMirror',
            label: 'mirror',
            type: 'radio',
            disabled: true,
            test: function(lg) { return function(d) { return lg.byGroup[d].settings.profile === 'dimensionalLockMirror' ? 'checked' : ''; };}
          },
          {
            name: 'dimensionalLockOffset',
            label: 'offset',
            type: 'radio',
            disabled: true,
            test: function(lg) { return function(d) { return lg.byGroup[d].settings.profile === 'dimensionalLockOffset' ? 'checked' : ''; };}
          }
        ]
      },
      {
        name: 'rotation',
        label: 'rotation',
        type: 'checkbox',
        disabled: false,
        test:function(lg) { return function(d) { return lg.byGroup[d].settings.rotation? 'checked' : '';};}
      },
      {
        name: 'brightness',
        label: 'brightness',
        type: 'checkbox',
        disabled: false,
        test:function(lg) { return function(d) { return lg.byGroup[d].settings.brightness ? 'checked' : '';};}
      },
      {
        name: 'contrast',
        label: 'contrast',
        type: 'checkbox',
        disabled: false,
        test:function(lg) { return function(d) { return lg.byGroup[d].settings.contrast ? 'checked' : '';};}
      },
      {
        name: 'saturation',
        label: 'saturation',
        type: 'checkbox',
        disabled: false,
        test:function(lg) { return function(d) { return lg.byGroup[d].settings.saturation ? 'checked' : '';};}
      },
      {
        name: 'invert',
        label: 'invert',
        type: 'checkbox',
        disabled: false,
        test:function(lg) { return function(d) { return lg.byGroup[d].settings.invert ? 'checked' : '';};}
      },
      {
        name: 'grayscale',
        label: 'grayscale',
        type: 'checkbox',
        disabled: false,
        test:function(lg) { return function(d) { return lg.byGroup[d].settings.grayscale ? 'checked' : '';};}
      },
      {
        name: 'reset',
        label: 'reset',
        type: 'checkbox',
        disabled: false,
        test:function(lg) { return function(d) { return lg.byGroup[d].settings.reset ? 'checked' : '';};}
      },
      {
        name: 'rulerControls',
        label: 'ruler controls',
        type: 'checkbox',
        disabled: false,
        test:function(lg) { return function(d) { return lg.byGroup[d].settings.rulerControls ? 'checked' : '';};}
      },
      {
        name: 'navigationControls',
        label: 'navigation controls',
        type: 'checkbox',
        disabled: false,
        test:function(lg) { return function(d) { return lg.byGroup[d].settings.navigationControls ? 'checked' : '';};}
      }
    ];

    this.init();
  };

  $.LockGroupsPanel.prototype = {
    init: function () {

      // TODO: remove object from call to template
      this.element = jQuery(this.template(/*{lockGroups: []}*/)).appendTo(this.appendTo);
      
      this.bindEvents();
      this.listenForActions();

      // initialize accordion
      jQuery('#lock-groups').accordion({collapsible: true});

      // tell lockController that the panel is ready to receive info about the lockGroups
      this.eventEmitter.publish('lockGroupsPanelReady');
    },

    listenForActions: function() {
      var _this = this;

      _this.eventEmitter.subscribe('lockGroupsPanelVisible.set', function(_, stateValue) {
        if (stateValue) { _this.show(); return; }
        _this.hide();
      });

      // dynamically add or remove list items to/from the accordion menu
      _this.eventEmitter.subscribe('updateLockGroupMenus', function(event, lg) {
        var keys,
        lockGroupsLi,
        lockGroupsLiForm;
      
        keys = lg.keys;

        lockGroupsLi = d3.select(_this.element[0]).select('#lock-groups')
          .selectAll('li')
          .data(keys, function(d) { return d; });

        // TODO: DRY this up
        lockGroupsLi.enter()
          .append('li')
          .append('h4')
            .text(function(d) { return d; })
            .select(function() { return this.parentNode; })
          .append('form')
          .each(function(d, i) {

            // this is the selection we will chain d3 appends on
            var ret = d3.select(this);

            /*
             * Append an input element to the form.
             *
             * @param {Object} sel The current d3 selection object in the chain.
             * @param {int} indentLevel How many 'em's to indent the input element.
             * @param {Object} option An item of this.formOptions.
             */
            var appendInputElement = function(sel, indentLevel, option) {
              sel
                .append('input')
                  .property('type', option.type)
                  .property('name', option.name)
                  .property('checked', option.test(lg))
                  .call(function() {
                    if (indentLevel > 0) {
                      this.style('margin-left', indentLevel + 'em');
                    }
                    if (option.disabled) {
                      this.property('disabled', 'disabled');
                    }
                  })
                  .on('change', function() {
                    _this.eventEmitter.publish('toggleLockGroupSettings', {
                      groupID: jQuery(this).parent().parent().find('h4').text(),
                      key: jQuery(this).attr('name')
                    });
                  })
                  .select(function() { return this.parentNode; })
                .append('label')
                  .text(option.label)
                  .call(function() {
                    if (option.disabled) {
                      this.style('color', '#AFAFAF');
                    }
                  })
                  .select(function() { return this.parentNode; })
                .append('br')
                  .select(function() { return this.parentNode; });
            };

            _this.formOptions.forEach(function(e) {
              appendInputElement(ret, 0, e);

              // check for nested options
              if (e.hasOwnProperty('options')) {
                e.options.forEach(function(f) {
                  appendInputElement(ret, 1, f);
                });
              }
            });

            // add disable/enable zoom buttons and a delete button
            ret
              .append('button')
                .attr('type', 'button')
                .text('Disable Zoom')
                .on('click', function() {
                  _this.eventEmitter.publish('TOGGLE_ZOOM_LOCK_ALL', {
                    enable: false,
                    groupID: jQuery(this).parent().parent().find('h4').text()
                  });
                })
                .select(function() { return this.parentNode; })
              .append('button')
                .attr('type', 'button')
                .text('Enable Zoom')
                .on('click', function() {
                  _this.eventEmitter.publish('TOGGLE_ZOOM_LOCK_ALL', {
                    enable: true,
                    groupID: jQuery(this).parent().parent().find('h4').text()
                  });
                })
                .select(function() { return this.parentNode; })
              .append('br')
                .select(function() { return this.parentNode; })
              .append('a')
                .attr('href', 'javascript:;')
                .classed({'mirador-btn': true, 'mirador-icon-delete-lock-group': true})
                .on('click', function(event) {
                  _this.eventEmitter.publish('deleteLockGroup', jQuery(this).parent().parent().find('h4').text());
                })
              .append('i')
                .classed({'fa': true, 'fa-trash-o': true, 'fa-lg': true});

          });

        lockGroupsLi.exit().remove();

        jQuery('#lock-groups').accordion('refresh');
      });
    },

    bindEvents: function() {
      var _this = this;

      // onclick event for adding a lock group
      _this.element.find('.mirador-icon-create-lock-group').off('click').on('click', function(event) {
         var input = jQuery('#new-lock-group-name').val();

         // TODO: do better input validation?
         if (input.length > 0) {
           // make the text field blank and submit the saved value to the lockController
           jQuery('#new-lock-group-name').val('');
           _this.eventEmitter.publish('createLockGroup', input);
         }
         else {
           alert('Please choose a name with non-zero length.');
         }
      });
    },

    hide: function() {
      jQuery(this.element).hide({effect: "slide", direction: "up", duration: 300, easing: "swing"});
    },

    show: function() {
      jQuery(this.element).show({effect: "slide", direction: "up", duration: 300, easing: "swing"});
    },

    template: Handlebars.compile([
       '<div id="lock-groups-panel">',
         '<h3>Manage Synchronized Windows</h3>',
         '<span>Window Group Name: ',
           '<input id="new-lock-group-name" type="text">',
           '<a href="javascript:;" class="mirador-btn mirador-icon-create-lock-group">',
             '<i class="fa fa-plus fa-lg"></i>',
           '</a>',
         '</span>',
         '<ul id="lock-groups"></ul>',
       '</div>'
    ].join(''))
  };

}(Mirador));
