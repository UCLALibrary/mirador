
(function($) {

  $.Iiif = {

    getImageUrl: function(image) {

      if (!image.images[0].resource.service) {
        id = image.images[0].resource['default'].service['@id'];
        id = id.replace(/\/$/, "");
        return id;
      }
      var id = image.images[0].resource.service['@id'];
      id = id.replace(/\/$/, "");

      return id;
    },

    /*
     * Returns true if image has alternate resources, false otherwise.
     *
     * @param {Object} image JSON representation of image data from manifest
     * @return {Boolean}
     */
    imageHasAlternateResources: function(image) {

      if (image.images[0].resource['@type'] === 'oa:Choice') {
        return true;
      } else { return false; }
    },

    /*
     * Gets labels and URLs for all the alternate resources of an image.
     *
     * @param {Object} image JSON representation of image
     * @return {Object}
     */
    getImageResourceLabelsAndUrls: function(image) {
      var d = image.images[0].resource['default'];
      var i = image.images[0].resource.item;
      return {
        'default': {'label': d.label, 'url': d.service['@id'].replace(/\/$/, "")},
        'item': i.map(function(v) { return {'label': v.label, 'url': v.service['@id'].replace(/\/$/, "")}; })
      };
    },

    getVersionFromContext: function(context) {
      if (context == "http://iiif.io/api/image/2/context.json") {
        return "2.0";
      } else {
        return "1.1";
      }
    },

    makeUriWithWidth: function(uri, width, version) {
      uri = uri.replace(/\/$/, '');
      if (version[0] == '1') {
        return uri + '/full/' + width + ',/0/native.jpg';
      } else {
        return uri + '/full/' + width + ',/0/default.jpg';
      }
    },

    getImageHostUrl: function(json) {
      var regex,
          matches = [];

      if (!json.hasOwnProperty('image_host')) {

        json.image_host = json.tilesUrl || json['@id'] || '';

       if (json.hasOwnProperty('identifier')) {
          regex = new RegExp('/?' + json.identifier + '/?$', 'i');
          json.image_host = json.image_host.replace(regex, '');

        } else {
          regex = new RegExp('(.*)\/(.*)$');
          matches = regex.exec(json.image_host);

          if (matches.length > 1) {
            json.image_host = matches[1];
            json.identifier = matches[2];
          }
        }
      }

      return json.image_host;
    }

  };

}(Mirador));

