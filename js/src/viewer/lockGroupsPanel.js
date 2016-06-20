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
        out = out + "<li>" + items[i] + "</li>";
      }

      //return out + "</ul>";
      return out;
    });
    this.init([]);
  };

  $.LockGroupsPanel.prototype = {
    init: function (data) {

      this.element = jQuery(this.template({lockGroups: data})).appendTo(this.appendTo);
      
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

      _this.eventEmitter.subscribe('updateLockGroupMenus', function(event, data) {
        // data is a list of the lock group names
        // remove the old element
        _this.element.remove();
        _this.init(data);
        // add new one
      });
    },

    bindEvents: function() {
      var _this = this;

      _this.element.find('.mirador-icon-create-lock-group').on('click', function(event) {
         _this.eventEmitter.publish('createLockGroup', jQuery('#new-lock-group-name').val());
      });

      _this.element.find('.mirador-icon-delete-lock-group').on('click', function(event) {
         _this.eventEmitter.publish('deleteLockGroup', /**/'REPLACEME');
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
