(function($) {

  $.OpenSeadragon = function(options) {

    var osd = OpenSeadragon(

      jQuery.extend({
        preserveViewport: true,
        visibilityRatio:  1,
        minZoomLevel:     0,
        defaultZoomLevel: 0,
        blendTime:        0.1,
        alwaysBlend:      false,
        showNavigationControl: false,

        // UCLA Library-specific options
        immediateRender: true,
        gestureSettingsMouse: {
          dblClickToZoom: true,
          clickToZoom: false
        },
        zoomPerClick: 1.1,
        zoomPerScroll: 1.1,
        timeout: 300000
      }, options)

    );
    
    return osd;

  };

}(Mirador));
