(function($) {

  $.WorkspaceDownloadPanel = function(options) {

    jQuery.extend(true, this, {
      state: null,
      element: null,
      appendTo: null,
      eventEmitter: null,
    }, options);

    this.init();

  };

  $.WorkspaceDownloadPanel.prototype = {
    init: function () {
      this.element = jQuery(this.template()).appendTo(this.appendTo);
      
      this.bindEvents();
      this.listenForActions();
    },

    listenForActions: function() {
      var _this = this;
      // handle subscribed events
      _this.eventEmitter.subscribe('workspaceDownloadPanelVisible.set', function(_, stateValue) {
        if (stateValue) { _this.show(); return; }
        _this.hide();
      });
    },

    bindEvents: function() {
      var _this = this;

      _this.element.find('.mirador-icon-workspace-download-file').off('click').on('click', function(event) {
        var input = jQuery('#workspace-download-file').val();
        var link;

        // TODO: do better input validation?
        if (input.length > 0) {

          // create a fake link and click it
          link = document.createElement('a');
          link.href = "data:text/json;charset=utf8," + encodeURIComponent(JSON.stringify(_this.state.get('currentConfig')));
          link.download = input + '.json';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
           
          // make the text field blank and submit the saved value to the lockController
          jQuery('#workspace-download-file').val('');
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
       '<div id="workspace-download-panel">',
         '<h3>Download Your Workspace</h3>',
         '<span>Save As: ',
           '<input id="workspace-download-file" type="text">',
           '<a href="javascript:;" class="mirador-btn mirador-icon-workspace-download-file">',
             '<i class="fa fa-download fa-lg"></i>',
           '</a>',
         '</span>',
         '<p>Please do not give the filename an extension. It will be in JSON format, and a .json extension is automatically appended to the filename.</p>',
       '</div>'
    ].join(''))
  };

}(Mirador));
