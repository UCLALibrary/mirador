describe('Window', function() {
  describe('Basic Operation', function() {
    beforeEach(function() {
      this.eventEmitter = new Mirador.EventEmitter();
      this.mockedEventEmitter = new MockEventEmitter(this.eventEmitter);
      this.appendTo = jQuery('<div/>');
      Mirador.viewer = {
        // all of this global state should be 
        // removed as soon as possible.
        eventEmitter: this.mockedEventEmitter,
        annotationEndpoints: [],
        workspace: {
          slots: []
        }
      };
      spyOn(Mirador, 'ThumbnailsView').and.callFake(function() {
        this.updateImages = jasmine.createSpy();
        this.toggle = jasmine.createSpy();
        this.adjustHeight = jasmine.createSpy();
        this.updateFocusImages = jasmine.createSpy();
      });
      spyOn(Mirador, 'ImageView').and.callFake(function() {
        this.toggle = jasmine.createSpy();
        this.adjustHeight = jasmine.createSpy();
      });
      spyOn(Mirador, 'BookView').and.callFake(function() {
        this.updateImages = jasmine.createSpy();
        this.toggle = jasmine.createSpy();
        this.adjustHeight = jasmine.createSpy();
      });
      var state = new Mirador.SaveController(jQuery.extend(true, {}, Mirador.DEFAULT_SETTINGS, {eventEmitter:this.eventEmitter}));
      this.window = new Mirador.Window(jQuery.extend(true, 
        {}, 
        state.getStateProperty('windowSettings'),
        {
          state: state,
          eventEmitter: this.eventEmitter,
          manifest: {
            jsonLd: {
              sequences: [
                { viewingHint: 'paged',
                  canvases: [{
                    '@id': ''
                  }]
              }]
            },
            getCanvases: function() { return [{
              '@id': '',
              'images':[{
              }]
            }];
            },
            getAnnotationsListUrls: function() {
              return [];
            },
            getStructures: function() {
              return [];
            },
            getVersion: function() {
              return '1';
            }
          },
          appendTo: this.appendTo
      }));
    });

    afterEach(function() {
      delete Mirador.viewer;
    });

    // TODO: Mark make this pass with desktop-version code
    xdescribe('Initialisation', function() {
      it('should place itself in DOM', function() {
        expect(true).toBe(true);
        expect(this.appendTo.find('.window')).toExist();
        expect(this.appendTo.find('.remove-object-option').css('display')).toBe('none');
        expect(this.appendTo.find('.book-option')).toExist();
        expect(this.appendTo.find('.scroll-option')).toExist();
        var calls = Mirador.ImageView.calls;
        expect(calls.count()).toBe(1);
        expect(calls.first().args[0].appendTo.is(this.appendTo.find('.view-container'))).toBe(true);
      });
    });
    describe('Menu Events', function() {
      xit('should change to book view when button is clicked', function() {
        expect(this.appendTo.find('.book-option')).toExist();
        expect(this.window.focusModules.BookView).toBe(null);
        this.appendTo.find('.book-option').trigger('click');
        var calls = Mirador.BookView.calls;
        var bottomPanelCalls = this.window.bottomPanel.updateFocusImages.calls;
        expect(calls.count()).toBe(1);
        expect(bottomPanelCalls.count()).toBe(1);
      });
    });

    describe('Destroying', function () {

      it('should respond to windowRemoved', function () {
        spyOn(this.window,'destroy');
        this.eventEmitter.publish('windowRemoved', this.window.id);
        expect(this.window.destroy).toHaveBeenCalled();
      });

      it('should unsubscribe from all events', function () {
        this.window.destroy();
        for(var key in this.window.eventEmitter.events){
          expect(this.window.eventEmitter.events[key]).toBe(0);
        }
      });

      it('should remove dom element',function(){
        this.window.destroy();
        expect(this.appendTo.find('.window').length).toBe(0);
      })

    });

  });

  describe('Configuration', function() {

  });

  xdescribe('Scalebar', function() {
    beforeEach(function() {
      this.appendTo = jQuery('<div/>');
      Mirador.viewer = {
        // all of this global state should be 
        // removed as soon as possible.
        annotationEndpoints: [],
        workspace: {
          slots: []
        }
      }
      spyOn(Mirador, 'ThumbnailsView').and.callFake(function() {
        this.updateImages = jasmine.createSpy();
        this.toggle = jasmine.createSpy();
        this.adjustHeight = jasmine.createSpy();
        this.updateFocusImages = jasmine.createSpy();
      });
      spyOn(Mirador, 'BookView').and.callFake(function() {
        this.updateImages = jasmine.createSpy();
        this.toggle = jasmine.createSpy();
        this.adjustHeight = jasmine.createSpy();
      });
      this.window = new Mirador.Window({
          state: new Mirador.SaveController(/*jQuery.extend(true, {"windowObjects": {
                      "loadedManifest": "",
                      "slotAddress" : "row1.column1",
                      "availableViews": ["ImageView"],
                      "viewType": "ImageView",
                      "annotationLayer": false,
                      "annotationState": "annoOff",
                      "overlay": false,
                      "fullScreen": true,
                      "displayLayout": true,
                      "layoutOptions": {
                                    "close": true
                                  }}, */Mirador.DEFAULT_SETTINGS),
        manifest: {
            jsonLd: {"attribution":"Harvard Art Museums/Fogg Museum, Richard and Ronay Menschel Fund for the Acquisition of Photographs","description":null,"sequences":[{"canvases":[{"label":"1","width":2550,"images":[{"resource":{"service":{"profile":"http://library.stanford.edu/iiif/image-api/1.1/conformance.html#level1","@id":"http://images-dev.harvardx.harvard.edu/ids/iiif/10466656"},"format":"image/jpeg","height":1667,"width":2550,"@id":"http://images-dev.harvardx.harvard.edu/ids/iiif/10466656/full/full/full/native","@type":"dcterms:Image"},"on":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/canvas/canvas-10466656.json","motivation":"sc:painting","@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/annotation/anno-10466656.json","@type":"oa:Annotation"}],"height":1667,"@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/canvas/canvas-10466656.json","@type":"sc:Canvas"},{"label":"2","width":2550,"images":[{"resource":{"service":{"profile":"http://library.stanford.edu/iiif/image-api/1.1/conformance.html#level1","@id":"http://images-dev.harvardx.harvard.edu/ids/iiif/20434940"},"format":"image/jpeg","height":1662,"width":2550,"@id":"http://images-dev.harvardx.harvard.edu/ids/iiif/20434940/full/full/full/native","@type":"dcterms:Image"},"on":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/canvas/canvas-20434940.json","motivation":"sc:painting","@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/annotation/anno-20434940.json","@type":"oa:Annotation"}],"height":1662,"@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/canvas/canvas-20434940.json","@type":"sc:Canvas"}],"viewingHint":"individuals","@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/sequence/normal.json","@type":"sc:Sequence"}],"label":"Detroit (Ragsdale Beauty Shop)","logo":"http://iiif.lib.harvard.edu/static/manifests/harvard_logo.jpg","@context":"http://www.shared-canvas.org/ns/context.json","@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567","@type":"sc:Manifest"},
          getCanvases: function() { return [{"label":"1","width":2550,"images":[{"resource":{"service":{"profile":"http://library.stanford.edu/iiif/image-api/1.1/conformance.html#level1","@id":"http://images-dev.harvardx.harvard.edu/ids/iiif/10466656"},"format":"image/jpeg","height":1667,"width":2550,"@id":"http://images-dev.harvardx.harvard.edu/ids/iiif/10466656/full/full/full/native","@type":"dcterms:Image"},"on":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/canvas/canvas-10466656.json","motivation":"sc:painting","@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/annotation/anno-10466656.json","@type":"oa:Annotation"}],"height":1667,"@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/canvas/canvas-10466656.json","@type":"sc:Canvas"},{"label":"2","width":2550,"images":[{"resource":{"service":{"profile":"http://library.stanford.edu/iiif/image-api/1.1/conformance.html#level1","@id":"http://images-dev.harvardx.harvard.edu/ids/iiif/20434940"},"format":"image/jpeg","height":1662,"width":2550,"@id":"http://images-dev.harvardx.harvard.edu/ids/iiif/20434940/full/full/full/native","@type":"dcterms:Image"},"on":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/canvas/canvas-20434940.json","motivation":"sc:painting","@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/annotation/anno-20434940.json","@type":"oa:Annotation"}],"height":1662,"@id":"http://oculus-dev.harvardx.harvard.edu/manifests/huam:320567/canvas/canvas-20434940.json","@type":"sc:Canvas"}];
          },
          getAnnotationsListUrl: function() {
            return false; // returning false for non-existent value is probably not a good practice?
          },
          getStructures: function() {
            return [];
          }
        },
        appendTo: this.appendTo
      });
      //this.window.toggleImageView();

        //console.log('++=================',JSON.stringify(this.window.focusModules));
    });

    afterEach(function() {
      delete Mirador.viewer;
    });

    describe('Canvas w/ no physdim data', function() {
      // TODO: initialize the window object with a canvas with no physdim data
      it('should not instantiate a scalebar object', function() {
        expect(this.appendTo.find('.single-image-option')).toExist();
        expect(this.window.focusModules.ImageView).toBe(null);
        this.appendTo.find('.single-image-option').trigger('click');
        var calls = Mirador.ImageView.calls;
        //console.log('=================',JSON.stringify(this.window));
        expect(this.window.focusModules.ImageView.osd.scalebar).toBeUndefined();
      });

      it('should not have a DOM element for the scalebar', function() {
        expect(this.appendTo.find('.scalebar')).not.toExist();
      });
    });
    
    describe('Canvas w/ physdim data', function() {
      // TODO: initialize the window object with a canvas with physdim data
      describe('Initialization', function() {
        it('should instantiate a scalebar object', function() {
          expect(this.window.focusModules.ImageView.osd.scalebar).not.toBeUndefined();
        });

        it('should have a visible DOM element for the scalebar', function() {
          expect(this.appendTo.find('.scalebar')).toExist();
          expect(this.appendTo.find('.scalebar').css('display')).toEqual('block');
        });
      });

      describe('setRulerVisibility', function() {
        xit('should be able to hide a visible ruler', function() {
          // expect to have visibility hidden (display: none ?)
        });

        xit('should be able to show a hidden ruler', function() {
          // expect to have visibility visible (display: block ?)
        });
      });
      
      describe('setRulerOrientation', function() {
        xit('orient ruler horizontally', function() {
          // expect width > height
        });

        xit('orient ruler vertically', function() {
          // expect height > width
        });
      });

      describe('setRulerColor', function() {
        xit('change color to white', function() {

        });

        xit('change color to black', function() {

        });
      });

      describe('setRulerPosition', function() {
        // change positions (top-left, top-right, etc.)
      });
    });
  });
});
