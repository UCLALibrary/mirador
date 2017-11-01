(function($) {

  $.trimString = function(str) {
    return str.replace(/^\s+|\s+$/g, '');
  };

  /* --------------------------------------------------------------------------
     Methods related to manifest data
     -------------------------------------------------------------------------- */

  $.getImageIndexById = function(imagesList, id) {
    var imgIndex = 0;

    jQuery.each(imagesList, function(index, img) {
      if ($.trimString(img['@id']) === $.trimString(id)) {
        imgIndex = index;
      }
    });

    return imgIndex;
  };

  $.getThumbnailForCanvas = function(canvas, width) {
    var version = "1.1",
    compliance = -1,
    service,
    thumbnailUrl;

    // Ensure width is an integer...
    width = parseInt(width, 10);

    // Respecting the Model...
    if (canvas.hasOwnProperty('thumbnail')) {
      // use the thumbnail image, prefer via a service
      if (typeof(canvas.thumbnail) == 'string') {
        thumbnailUrl = canvas.thumbnail;
      } else if (canvas.thumbnail.hasOwnProperty('service')) {
        service = canvas.thumbnail.service;
        if(service.hasOwnProperty('profile')) {
            compliance = $.Iiif.getComplianceLevelFromProfile(service.profile);
        }
        if(compliance === 0){
            // don't change existing behaviour unless compliance is explicitly 0
            thumbnailUrl = canvas.thumbnail['@id'];
        } else {
            // Get the IIIF Image API via the @context
            if (service.hasOwnProperty('@context')) {
                version = $.Iiif.getVersionFromContext(service['@context']);
            }
            thumbnailUrl = $.Iiif.makeUriWithWidth(service['@id'], width, version);
        }
      } else {
        thumbnailUrl = canvas.thumbnail['@id'];
      }
    } else {
      // No thumbnail, use main image
      var resource = canvas.images[0].resource;
      service = resource['default'] ? resource['default'].service : resource.service;
      if (service.hasOwnProperty('@context')) {
        version = $.Iiif.getVersionFromContext(service['@context']);
      }
      thumbnailUrl = $.Iiif.makeUriWithWidth(service['@id'], width, version);
    }
    return thumbnailUrl;
  };

  /*
     miscellaneous utilities
     */

  $.getQueryParams = function(url) {
    var assoc  = {};
    var decode = function (s) { return decodeURIComponent(s.replace(/\+/g, " ")); };
    var queryString = url.split('?')[1];
    if (typeof queryString === "undefined") {
      return {};
    }
    var keyValues = queryString.split('&');

    for(var i in keyValues) {
      var key = keyValues[i].split('=');
      if (key.length > 1) {
        assoc[decode(key[0])] = decode(key[1]);
      }
    }

    return assoc;
  };

  $.genUUID = function() {
    var idNum = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });

    return idNum;
  };

  jQuery.fn.slideFadeToggle  = function(speed, easing, callback) {
    return this.animate({opacity: 'toggle', height: 'toggle'}, speed, easing, callback);
  };

  $.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;

    if (typeof options !== 'undefined') {
      options = {};
    }

    var later = function() {
      previous = options.leading === false ? 0 : new Date();
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  $.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // http://upshots.org/javascript/jquery-test-if-element-is-in-viewport-visible-on-screen
  $.isOnScreen = function(elem, outsideViewportFactor) {
    var factor = 1;
    if (outsideViewportFactor) {
      factor = outsideViewportFactor;
    }
    var win = jQuery(window);
    var viewport = {
      top : (win.scrollTop() * factor),
      left : (win.scrollLeft() * factor)
    };
    viewport.bottom = (viewport.top + win.outerHeight()) * factor;
    viewport.right = (viewport.left + win.outerWidth()) * factor;

    var el = jQuery(elem);
    var bounds = el.offset();
    bounds.bottom = bounds.top + el.height();
    bounds.right = bounds.left + el.width();

    return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));
  };

  $.getRangeIDByCanvasID = function(structures, canvasID /*, [given parent range] (for multiple ranges, later) */) {
    var ranges = jQuery.grep(structures, function(range) { return jQuery.inArray(canvasID, range.canvases) > -1; }),
    rangeIDs = jQuery.map(ranges,  function(range) { return range['@id']; });

    return rangeIDs;
  };

  $.layoutDescriptionFromGridString = function (gridString) {
    var columns = parseInt(gridString.substring(gridString.indexOf("x") + 1, gridString.length),10),
    rowsPerColumn = parseInt(gridString.substring(0, gridString.indexOf("x")),10),
    layoutDescription = {
      type:'row'
    };

    if (gridString === "1x1") return layoutDescription;

    layoutDescription.children = [];

    // Javascript does not have range expansions quite yet,
    // long live the humble for loop.
    // Use a closure to contain the column and row variables.
    for (var i = 0, c = columns; i < c; i++) {
      var column = { type: 'column'};

      if (rowsPerColumn > 1) {
        column.children = [];
        for (var j = 0, r = rowsPerColumn; j < r; j++) {
          column.children.push({
            type: 'row'
          });
        }
      }

      layoutDescription.children.push(column);
    }

    return layoutDescription;
  };

  // Configurable Promises
  $.createImagePromise = function(imageUrl) {
    var img = new Image(),
    dfd = jQuery.Deferred();

    img.onload = function() {
      dfd.resolve(img.src);
    };

    img.onerror = function() {
      dfd.reject(img.src);
    };

    dfd.fail(function() {
      console.log('image failed to load: ' + img.src);
    });

    img.src = imageUrl;
    return dfd.promise();
  };

  $.enterFullscreen = function(el) {
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  };

  $.exitFullscreen = function() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  };

  $.isFullscreen = function() {
    var fullscreen = $.fullscreenElement();
    return (fullscreen.length > 0);
  };

  $.fullscreenElement = function() {
    return (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement);
  };

  $.sanitizeHtml = function(dirty) {
    return sanitizeHtml(dirty, {
      allowedTags: ['a', 'b', 'br', 'i', 'img', 'p', 'span', 'strong', 'em', 'ul', 'ol', 'li'],
      allowedAttributes: {
        'a': ['href', 'target'],
        'img': ['src', 'alt'],
        'p': ['dir']
      }
    });
  };

  $.getBrowserViewportDimensions = function() {
    var w=window,d=document,e=d.documentElement,g=d.getElementsByTagName('body')[0],x=w.innerWidth||e.clientWidth||g.clientWidth,y=w.innerHeight||e.clientHeight||g.clientHeight;
    return {x:x,y:y};
  };

  $.getWorkspaceBoundingBox = function(elt) {
    var manifestInfoHeight = jQuery('.manifest-info').height(),
        workspaceTop = jQuery('.mirador-viewer').offset().top,

        // magic vars because no drag handles may be present at some time
        dragHandleWidth = 100,
        dragHandleHeight = 25,
        dimensions = $.getBrowserViewportDimensions(),
        x = dimensions.x,
        y = dimensions.y;
    if (elt === 'drag-handle.ui-draggable') {
      // must drag drag-handle within browser viewport
      return [0, workspaceTop, x - dragHandleWidth, y - dragHandleHeight];
    } else if (elt === 'layout-slot.ui-draggable') {
      // can drag window horizontally off the screen if desired
      return [-x, workspaceTop, 2*x, y - manifestInfoHeight];
    } else {
      throw '$.getWorkspaceBoundingBox: unknown element type "' + elt + '"';
    }
  };

  /*
   * Used to bring a DOM element to the top of a stack.
   * @param {String} stack jQuery selector that selects all elements to stack on top of
   */
  $.bringEltToTop = function(stack) {
    var elem = this,
    min,
    group = jQuery.makeArray(jQuery(stack)).sort(function(a, b) {
      return (parseInt(jQuery(a).css("zIndex"), 10) || 0) - (parseInt(jQuery(b).css("zIndex"), 10) || 0);
    });
    if (group.length < 1) {
      return;
    }
    min = parseInt(group[0].style.zIndex, 10) || 0;
    jQuery(group).each(function(i) {
      this.style.zIndex = min+i;
    });
    /* // why do we need the following check
    if (elem === undefined) {
      return;
    }
    */
    jQuery(elem).css({'zIndex' : min+group.length});
  };

}(Mirador));
