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
        prefixUrl:        'images/openseadragon/',
        showNavigationControl: false,
        id: undefined,
        infoJson: undefined,
        uniqueID: undefined,
        toolbarID: undefined,
        immediateRender: true,
        gestureSettingsMouse: {
          dblClickToZoom: true,
          clickToZoom: false
        }
      }, options)

    );

    var ts;
    var pixelsPerMeter;
    var metersPerPhysicalUnit = {
      'mm': 0.001,
      'cm': 0.01,
      'in': 0.0254
    };

    // check if a valid IIIF physical dimension service exists
    // TODO: may need to make sure that ts is an object
    if (options.hasOwnProperty('infoJson')) {

      ts = options.infoJson;
      
      var checkForPhysdimData = function(obj) {
        return obj.hasOwnProperty('data') &&
          obj.data.hasOwnProperty('service') &&
          obj.data.service.profile === 'http://iiif.io/api/annex/services/physdim' &&
          obj.data.service['@context'] === 'http://iiif.io/api/annex/services/physdim/1/context.json' &&
          obj.data.service.hasOwnProperty('physicalScale') &&
          obj.data.service.hasOwnProperty('physicalUnits') &&
          metersPerPhysicalUnit.hasOwnProperty(obj.data.service.physicalUnits);
      };

      // if image choice, use default image
      if (ts.hasOwnProperty('default')) {
        ts = ts.default;
      }

      if (checkForPhysdimData(ts)) {
  
        // openseadragon-scalebar needs to know pixels per meter to render ruler
        pixelsPerMeter = 1 / (metersPerPhysicalUnit[ts.data.service.physicalUnits] * ts.data.service.physicalScale);
   
        // set pixels per meter
        jQuery.extend(true, this, {
          'scalebar': $.DEFAULT_SETTINGS.scalebar
        }, {
          'scalebar': { 'pixelsPerMeter': pixelsPerMeter }
        });
  
        // setup the scalebar
        osd.scalebar(this.scalebar);

        osd.hasPhysicalDimensionData = true;
        return osd;
      }
    }

    osd.hasPhysicalDimensionData = false;
    return osd;

  };

}(Mirador));
