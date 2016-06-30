/*jshint scripturl:true*/
(function($) {

  $.LockGroupsPanel = function(options) {

    jQuery.extend(true, this, {
      element: null,
      appendTo: null,
    }, options);

    Handlebars.registerHelper('list', function(items) {
      //var out = "<ul>";
      console.log(items);
      var out = '';
      for(var i=0, l=items.length; i<l; i++) {
        out = out + "<li>" + items[i] + '<a href="javascript:;" class="mirador-btn mirador-icon-delete-lock-group"><i class="fa fa-minus fa-lg"></i></a>' + '</li>';
      }

      //return out + "</ul>";
      return out;
    });
    this.init();
  };

  $.LockGroupsPanel.prototype = {
    init: function () {

      this.element = jQuery(this.template({lockGroups: []})).appendTo(this.appendTo);
      
      this.bindEvents();
      this.listenForActions();

      jQuery('#lock-groups').accordion({collapsible: true});
    },

    listenForActions: function() {
      var _this = this;
      // handle subscribed events
      _this.eventEmitter.subscribe('lockGroupsPanelVisible.set', function(_, stateValue) {
        if (stateValue) { _this.show(); return; }
        _this.hide();
      });

      _this.eventEmitter.subscribe('updateLockGroupMenus', function(event, lg) {
        var keys,
        lockGroupsLi,
        lockGroupsLiForm;
      
        keys = lg.keys;
        console.log(keys);

        lockGroupsLi = d3.select('#lock-groups')
          .selectAll('li')
          .data(keys, function(d) { return d; });

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
            .property('disabled', 'disabled')
            .select(function() { return this.parentNode; })
          .append('label')
            .text('sync zoom/pan')
            .style('color', '#AFAFAF')
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
            .property('disabled', 'disabled')
            .select(function() { return this.parentNode; })
          .append('label')
            .text('sync rotation')
            .style('color', '#AFAFAF')
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

      _this.element.find('.mirador-icon-create-lock-group').off('click').on('click', function(event) {
         var input = jQuery('#new-lock-group-name').val();
         if (input.length > 0) {
           jQuery('#new-lock-group-name').val('');
           _this.eventEmitter.publish('createLockGroup', input);
         }
         else {
           alert('Please choose a name with non-zero length.');
         }
      });

      _this.element.find('.mirador-icon-delete-lock-group').off('click').on('click', function(event) {
        _this.eventEmitter.publish('deleteLockGroup', jQuery(this).parent().parent().find('h4').text());
      });

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
           '{{#list lockGroups}}{{/list}}',
         '</ul>',
       '</div>'
    ].join(''))
  };

}(Mirador));
