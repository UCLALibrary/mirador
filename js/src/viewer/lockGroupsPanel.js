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

    // TODO: remove? handled by D3 automatically I think
    /*
    Handlebars.registerHelper('listitems', function(items) {
      console.log(items);
      var out = '';
      for(var i=0, l=items.length; i<l; i++) {
        out = out + "<li>" + items[i] + '<a href="javascript:;" class="mirador-btn mirador-icon-delete-lock-group"><i class="fa fa-minus fa-lg"></i></a>' + '</li>';
      }

      return out;
    });
    */
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

        lockGroupsLi = d3.select('#lock-groups')
          .selectAll('li')
          .data(keys, function(d) { return d; });

        // TODO: DRY this up
        lockGroupsLi.enter()
          .append('li')
          .append('h4')
            .text(function(d) { return d; })
            .select(function() { return this.parentNode; })
          .append('form')
          // zoompan
          .append('input')
            .property('type', 'checkbox')
            .property('name', 'zoompan')
            .property('checked', function(d) { return lg.byGroup[d].settings.zoompan ? 'checked' : '';})
            .select(function() { return this.parentNode; })
          .append('label')
            .text('sync zoom/pan')
            .select(function() { return this.parentNode; })
          .append('br')
            .select(function() { return this.parentNode; })
          // dimensionalLockMirror
          .append('input')
            .property('type', 'radio')
            .property('name', 'dimensionalLockMirror')
            .property('checked', function(d) { return lg.byGroup[d].settings.profile === 'dimensionalLockMirror' ? 'checked' : '';})
            .property('disabled', 'disabled')
            .style('margin-left', '1em')
            .select(function() { return this.parentNode; })
          .append('label')
            .text('mirror')
            .style('color', '#AFAFAF')
            .select(function() { return this.parentNode; })
          .append('br')
            .select(function() { return this.parentNode; })
          // dimensionalLockOffset
          .append('input')
            .property('type', 'radio')
            .property('name', 'dimensionalLockOffset')
            .property('checked', function(d) { return lg.byGroup[d].settings.profile === 'dimensionalLockOffset' ? 'checked' : '';})
            .property('disabled', 'disabled')
            .style('margin-left', '1em')
            .select(function() { return this.parentNode; })
          .append('label')
            .text('offset')
            .style('color', '#AFAFAF')
            .select(function() { return this.parentNode; })
          .append('br')
            .select(function() { return this.parentNode; })
          // rotation
          .append('input')
            .property('type', 'checkbox')
            .property('name', 'rotation')
            .property('checked', function(d) { return lg.byGroup[d].settings.rotation? 'checked' : '';})
            .select(function() { return this.parentNode; })
          .append('label')
            .text('sync rotation')
            .select(function() { return this.parentNode; })
          .append('br')
            .select(function() { return this.parentNode; })
          // brightness
          .append('input')
            .property('type', 'checkbox')
            .property('name', 'brightness')
            .property('checked', function(d) { return lg.byGroup[d].settings.brightness? 'checked' : '';})
            .property('disabled', 'disabled')
            .select(function() { return this.parentNode; })
          .append('label')
            .text('sync brightness')
            .style('color', '#AFAFAF')
            .select(function() { return this.parentNode; })
          .append('br')
            .select(function() { return this.parentNode; })
          // contrast
          .append('input')
            .property('type', 'checkbox')
            .property('name', 'contrast')
            .property('checked', function(d) { return lg.byGroup[d].settings.contrast? 'checked' : '';})
            .property('disabled', 'disabled')
            .select(function() { return this.parentNode; })
          .append('label')
            .text('sync contrast')
            .style('color', '#AFAFAF')
            .select(function() { return this.parentNode; })
          .append('br')
            .select(function() { return this.parentNode; })
          // invert
          .append('input')
            .property('type', 'checkbox')
            .property('name', 'invert')
            .property('checked', function(d) { return lg.byGroup[d].settings.invert ? 'checked' : '';})
            .select(function() { return this.parentNode; })
          .append('label')
            .text('sync invert')
            .select(function() { return this.parentNode; })
          .append('br')
            .select(function() { return this.parentNode; })
          .append('input')
            .property('type', 'checkbox')
            .property('name', 'grayscale')
            .property('checked', function(d) { return lg.byGroup[d].settings.grayscale ? 'checked' : '';})
            .select(function() { return this.parentNode; })
          .append('label')
            .text('sync grayscale')
            .select(function() { return this.parentNode; })
          .append('br')
            .select(function() { return this.parentNode; })
          .append('input')
            .property('type', 'checkbox')
            .property('name', 'reset')
            .property('checked', function(d) { return lg.byGroup[d].settings.reset ? 'checked' : '';})
            .select(function() { return this.parentNode; })
          .append('label')
            .text('sync reset')
            .select(function() { return this.parentNode; })
          .append('br')
            .select(function() { return this.parentNode; })
          .append('a')
            .attr('href', 'javascript:;')
            .classed({'mirador-btn': true, 'mirador-icon-delete-lock-group': true})
          .append('i')
            .classed({'fa': true, 'fa-trash-o': true, 'fa-lg': true});

        lockGroupsLi.exit().remove();

        jQuery('#lock-groups').accordion('refresh');
        _this.bindEvents();
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

      // onclick event for deleting a lock group
      _this.element.find('.mirador-icon-delete-lock-group').off('click').on('click', function(event) {
        _this.eventEmitter.publish('deleteLockGroup', jQuery(this).parent().parent().find('h4').text());
      });

      // onchange event for changes to form inputs
      _this.element.find('#lock-groups form input').off('change').change(function() {
        _this.eventEmitter.publish('toggleLockGroupSettings', {groupID: jQuery(this).parent().parent().find('h4').text(), key: jQuery(this).attr('name')});
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
         '<h3>Manage Lock Groups</h3>',
         '<span>Lock Group Name: ',
           '<input id="new-lock-group-name" type="text">',
           '<a href="javascript:;" class="mirador-btn mirador-icon-create-lock-group">',
             '<i class="fa fa-plus fa-lg"></i>',
           '</a>',
         '</span>',
         '<ul id="lock-groups">',
           // TODO: remove?
           //'{{#listitems lockGroups}}{{/listitems}',
         '</ul>',
       '</div>'
    ].join(''))
  };

}(Mirador));
