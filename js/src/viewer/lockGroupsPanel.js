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
    },

    listenForActions: function() {
      var _this = this;
      // handle subscribed events
      _this.eventEmitter.subscribe('lockGroupsPanelVisible.set', function(_, stateValue) {
        if (stateValue) { _this.show(); return; }
        _this.hide();
      });

      _this.eventEmitter.subscribe('updateLockGroupMenus', function(event, lg) {
        var lockGroups = d3.select('#lock-groups').selectAll('li').data(lg, function(d) { return d; });
        lockGroups.enter().append('li')
          .text(function(d) { return d; })
          .insert('a')
          .attr('href', 'javascript:;')
          .classed({'mirador-btn': true, 'mirador-icon-delete-lock-group': true})
          .insert('i')
          .classed({'fa': true, 'fa-minus': true, 'fa-lg': true});
        lockGroups.exit().remove();

        _this.bindEvents();
      });
    },

    bindEvents: function() {
      var _this = this;

      _this.element.find('.mirador-icon-create-lock-group').off('click').on('click', function(event) {
         _this.eventEmitter.publish('createLockGroup', jQuery('#new-lock-group-name').val());
      });

      _this.element.find('.mirador-icon-delete-lock-group').off('click').on('click', function(event) {
         _this.eventEmitter.publish('deleteLockGroup', jQuery(this).parent().text());
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
