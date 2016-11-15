describe('Synchronized Window Groups Controller', function() {

  /*
   * Tests:
   *
   * entering text into panel field and submitting form creates a new group
   * add another group
   * click on accordion header shows that group
   * clicking on the delete button of a group deletes it
   * toggling checkboxes changes the settings of a group
   */
  describe('With no saved settings', function() {

    beforeAll(function() {
      jasmine.getJSONFixtures().fixturesPath = 'spec/fixtures';
      // WARNING: Need to stub to stop OpenSeadragon from crashing PhantomJS
      // If you can make this not happen, remove this line and test the method
      spyOn(Mirador.ImageView.prototype, 'createOpenSeadragonInstance');
      this.fixture = getJSONFixture('BNF-condorcet-florus-dispersus-manifest.json');
      this.manifest = new Mirador.Manifest(
        this.fixture['@id'], 'IIIF', this.fixture
      );
      this.appendTo = document.createElement('div', { class: 'view-container' });
      this.eventEmitter = new Mirador.EventEmitter();
      this.imagesList = this.manifest.getCanvases();
      this.canvasControls = jQuery.extend(
        true, {}, Mirador.DEFAULT_SETTINGS.windowSettings.canvasControls
      );
      // create a panel and controller for the synchronized window groups
      this.state = new Mirador.SaveController(jQuery.extend(true, {}, Mirador.DEFAULT_SETTINGS, {'eventEmitter': this.eventEmitter}));

      this.c = new Mirador.SynchronizedWindowController({state: this.state, eventEmitter: this.eventEmitter});
      this.s = this.c.synchronizedWindows;
    });

    describe('Initialization', function() {
      it('data structure should be defined, but empty', function() {
        expect(this.s).toBeDefined();
        expect(Object.keys(this.s.byGroup).length).toBe(0);
        expect(Object.keys(this.s.byGroup)).toEqual(this.s.keys);
        expect(Object.keys(this.s.byWindow).length).toBe(0);
      });
    });

    describe('Working with groups', function() {

      beforeAll(function() {
        spyOn(window, 'alert');

        this.viewObj1 = new Mirador.ImageView({
          manifest: this.manifest,
          appendTo: this.appendTo,
          windowId: 'a',
          eventEmitter: this.eventEmitter,
          imagesList: this.imagesList,
          state: this.state,
          bottomPanelAvailable: true,
          annoEndpointAvailable: false,
        canvasControls: this.canvasControls,
        annotationState: this.canvasControls.annotations.annotationState
        });
        this.viewObj2 = new Mirador.ImageView({
          manifest: this.manifest,
          appendTo: this.appendTo,
          windowId: 'b',
          eventEmitter: this.eventEmitter,
          imagesList: this.imagesList,
          state: this.state,
          bottomPanelAvailable: true,
          annoEndpointAvailable: false,
        canvasControls: this.canvasControls,
        annotationState: this.canvasControls.annotations.annotationState
        });
        this.viewObj3 = new Mirador.ImageView({
          manifest: this.manifest,
          appendTo: this.appendTo,
          windowId: 'c',
          eventEmitter: this.eventEmitter,
          imagesList: this.imagesList,
          state: this.state,
          bottomPanelAvailable: true,
          annoEndpointAvailable: false,
        canvasControls: this.canvasControls,
        annotationState: this.canvasControls.annotations.annotationState
        });
      });

      it('create group', function() {
        spyOn(this.c, 'createSynchronizedWindowGroup').and.callThrough();

        this.eventEmitter.publish('createSynchronizedWindowGroup', 'group1');
        expect(this.c.createSynchronizedWindowGroup).toHaveBeenCalledWith('group1');
        expect(this.s.keys.length).toBe(1)
        expect(Object.keys(this.s.byGroup)).toEqual(this.s.keys);
        expect(Object.keys(this.s.byWindow).length).toBe(0);

        this.eventEmitter.publish('createSynchronizedWindowGroup', 'group2');
        expect(this.c.createSynchronizedWindowGroup).toHaveBeenCalledWith('group2');
        expect(this.s.keys.length).toBe(2)
        expect(Object.keys(this.s.byGroup)).toEqual(this.s.keys);
        expect(Object.keys(this.s.byWindow).length).toBe(0);

        // create existing group
        this.eventEmitter.publish('createSynchronizedWindowGroup', 'group2');
        expect(this.c.createSynchronizedWindowGroup).toHaveBeenCalledWith('group2');

        // TODO: make it throw an exception instead of alert
        expect(alert).toHaveBeenCalled();
        expect(this.s.keys.length).toBe(2)
        expect(Object.keys(this.s.byGroup)).toEqual(this.s.keys);
        expect(Object.keys(this.s.byWindow).length).toBe(0);

      });
      it('add to group', function() {
        spyOn(this.c, 'addToSynchronizedWindowGroup').and.callThrough();

        // add to empty group
        this.eventEmitter.publish('addToSynchronizedWindowGroup', {viewObj: this.viewObj1, synchronizedWindowGroup: 'group1'});
        expect(this.c.addToSynchronizedWindowGroup).toHaveBeenCalledWith(this.viewObj1, 'group1');
        expect(this.s.byGroup['group1'].views.length).toBe(1);

        this.eventEmitter.publish('addToSynchronizedWindowGroup', {viewObj: this.viewObj2, synchronizedWindowGroup: 'group2'});
        expect(this.c.addToSynchronizedWindowGroup).toHaveBeenCalledWith(this.viewObj2, 'group2');
        expect(this.s.byGroup['group2'].views.length).toBe(1);

        // add to nonempty group
        this.eventEmitter.publish('addToSynchronizedWindowGroup', {viewObj: this.viewObj3, synchronizedWindowGroup: 'group1'});
        expect(this.c.addToSynchronizedWindowGroup).toHaveBeenCalledWith(this.viewObj3, 'group1');
        expect(this.s.byGroup['group1'].views.length).toBe(2);

        // move to different group
        this.eventEmitter.publish('addToSynchronizedWindowGroup', {viewObj: this.viewObj3, synchronizedWindowGroup: 'group2'});
        expect(this.c.addToSynchronizedWindowGroup).toHaveBeenCalledWith(this.viewObj3, 'group2');
        expect(this.s.byGroup['group1'].views.length).toBe(1);
        expect(this.s.byGroup['group2'].views.length).toBe(2);

        // add to nonexistent group
        //expect(this.c.addToSynchronizedWindowGroup(this.viewObj3, 'nonexistent group')).toThrow();
      });
      it('toggle settings', function() {
        spyOn(this.c, 'toggleSynchronizedWindowGroupSettings').and.callThrough();

        expect(this.s.byGroup['group1'].settings.zoompan).toBe(true);

        this.eventEmitter.publish('toggleSynchronizedWindowGroupSettings', {groupID: 'group1', key: 'zoompan'});
        expect(this.c.toggleSynchronizedWindowGroupSettings).toHaveBeenCalledWith('group1', 'zoompan', undefined);
        expect(this.s.byGroup['group1'].settings.zoompan).toBe(false);

        this.eventEmitter.publish('toggleSynchronizedWindowGroupSettings', {groupID: 'group1', key: 'zoompan'});
        expect(this.c.toggleSynchronizedWindowGroupSettings).toHaveBeenCalledWith('group1', 'zoompan', undefined);
        expect(this.s.byGroup['group1'].settings.zoompan).toBe(true);

        expect(this.s.byGroup['group1'].settings.profile).toBe('dimensionalLockMirror');

        this.eventEmitter.publish('toggleSynchronizedWindowGroupSettings', {groupID: 'group1', key: 'profile', value: 'dimensionalLockOffset'});
        expect(this.c.toggleSynchronizedWindowGroupSettings).toHaveBeenCalledWith('group1', 'profile', 'dimensionalLockOffset');
        expect(this.s.byGroup['group1'].settings.profile).toBe('dimensionalLockOffset');
      });
      it('events that update followers', function() {
        spyOn(this.c, 'updateFollowers');

        var _this = this;
        var eventsToArgs = [
          {
            ev: 'syncWindowGrayscale',
            be: 'grayscale'
          },
          {
            ev: 'syncWindowZoom',
            be: 'zoompan'
          },
          {
            ev: 'syncWindowPan',
            be: 'zoompan'
          },
          {
            ev: 'syncWindowInvert',
            be: 'invert'
          },
          {
            ev: 'syncWindowReset',
            be: 'reset'
          }
        ];
        var eventsToData = [
          {
            ev: 'syncWindowRotation',
            be: 'rotation',
            va: 90
          },
          {
            ev: 'syncWindowBrightness',
            be: 'brightness',
            va: 150
          },
          {
            ev: 'syncWindowContrast',
            be: 'contrast',
            va: 140
          },
          {
            ev: 'syncWindowSaturate',
            be: 'saturate',
            va: 130
          }
        ];

        eventsToArgs.forEach(function(e) {
          _this.eventEmitter.publish(e.ev, this.viewObj2);
          expect(_this.c.updateFollowers).toHaveBeenCalledWith(this.viewObj2, e.be);
        });

        eventsToData.forEach(function(e) {
          _this.eventEmitter.publish(e.ev, { viewObj: this.viewObj2, value: e.va});
          expect(_this.c.updateFollowers).toHaveBeenCalledWith(this.viewObj2, e.be, e.va);
        });
      });
      it('update followers', function() {
        spyOn(this.c.lockOptions, 'dimensionalLockMirror');
        spyOn(this.c.lockOptions, 'dimensionalLockOffset');

        var functsToSpyOn = [
          'applyCSSFilter',
          'osdRotate',
          'resetImageManipulationControls'
        ];
        var _this = this;
        functsToSpyOn.forEach(function(e) {
          spyOn(_this.viewObj1, e);
          spyOn(_this.viewObj2, e);
          spyOn(_this.viewObj3, e);
        });

        this.c.updateFollowers(this.viewObj2, 'zoompan');
        expect(this.c.lockOptions.dimensionalLockMirror).toHaveBeenCalledWith(this.viewObj2, this.viewObj3);
        this.c.updateFollowers(this.viewObj2, 'grayscale');
        expect(this.viewObj3.applyCSSFilter).toHaveBeenCalled();
        this.c.updateFollowers(this.viewObj2, 'invert');
        expect(this.viewObj3.applyCSSFilter).toHaveBeenCalled();
        this.c.updateFollowers(this.viewObj2, 'reset');
        expect(this.viewObj3.resetImageManipulationControls).toHaveBeenCalled();
        this.c.updateFollowers(this.viewObj2, 'brightness');
        expect(this.viewObj3.applyCSSFilter).toHaveBeenCalled();
        this.c.updateFollowers(this.viewObj2, 'contrast');
        expect(this.viewObj3.applyCSSFilter).toHaveBeenCalled();
        this.c.updateFollowers(this.viewObj2, 'saturate');
        expect(this.viewObj3.applyCSSFilter).toHaveBeenCalled();
        this.c.updateFollowers(this.viewObj2, 'rotation');
        expect(this.viewObj3.osdRotate).toHaveBeenCalled();
        this.c.updateFollowers(this.viewObj2, 'navigationControls');
        // expect event to have been called

      });
      it('remove from group', function() {
        spyOn(this.c, 'removeFromSynchronizedWindowGroup').and.callThrough();

        // remove member of group
        this.eventEmitter.publish('removeFromSynchronizedWindowGroup', { viewObj: this.viewObj2 });
        expect(this.c.removeFromSynchronizedWindowGroup).toHaveBeenCalledWith(this.viewObj2);
        expect(this.s.byGroup['group2'].views.length).toBe(1);

        this.eventEmitter.publish('removeFromSynchronizedWindowGroup', { viewObj: this.viewObj3 });
        expect(this.c.removeFromSynchronizedWindowGroup).toHaveBeenCalledWith(this.viewObj3);
        expect(this.s.byGroup['group2'].views.length).toBe(0);

        // remove non-member of group
        this.eventEmitter.publish('removeFromSynchronizedWindowGroup', { viewObj: this.viewObj2 });
        expect(this.c.removeFromSynchronizedWindowGroup).toHaveBeenCalledWith(this.viewObj2);
        expect(this.s.byGroup['group2'].views.length).toBe(0);
      });
      it('remove group', function() {
        spyOn(this.c, 'deleteSynchronizedWindowGroup').and.callThrough();

        // empty group
        this.eventEmitter.publish('deleteSynchronizedWindowGroup', 'group2');
        expect(this.c.deleteSynchronizedWindowGroup).toHaveBeenCalledWith('group2');
        expect(this.s.byGroup['group2']).toBeUndefined();

        // nonempty group
        this.eventEmitter.publish('deleteSynchronizedWindowGroup', 'group1');
        expect(this.c.deleteSynchronizedWindowGroup).toHaveBeenCalledWith('group1');
        expect(this.s.byGroup['group1']).toBeUndefined();

      });
    });
  });

  describe('With previously saved settings', function() {

    beforeAll(function() {
      // create a panel and controller for the synchronized window groups
      this.eventEmitter = new Mirador.EventEmitter();
      this.mockedEventEmitter = new MockEventEmitter(this.eventEmitter);
      this.state = new Mirador.SaveController(jQuery.extend(true, {}, Mirador.DEFAULT_SETTINGS, {
        'eventEmitter': this.mockedEventEmitter,
        'synchronizedWindowGroupsState': JSON.stringify({
          "keys": ["group1"],
          "byGroup": {
            "group1": {
              "views": [],
              "settings": {
                "profile": "dimensionalLockMirror",
                "zoompan": true,
                "rotation": true,
                "brightness": true,
                "saturate": true,
                "contrast": true,
                "invert": true,
                "grayscale": true,
                "reset": true,
                "navigationControls": true
              }
            }
          },
          "byWindow": {
            "fae8cfe3-be05-4510-b4f1-cee8d0f356d4": "group1",
            "dde1b2b9-6726-4d6d-9aa1-28ceffecf711": "group1"
          }
        })
      }));
      this.c = new Mirador.SynchronizedWindowController({state: this.state, eventEmitter: this.mockedEventEmitter});
      this.s = this.c.synchronizedWindows;
    });

    describe('Initialization', function() {
      it('data structure should be defined and nonempty', function() {
        expect(this.s).toBeDefined();
        expect(Object.keys(this.s.byGroup).length).toBeGreaterThan(0);
        expect(Object.keys(this.s.byGroup)).toEqual(this.s.keys);
        expect(Object.keys(this.s.byWindow).length).toBeGreaterThan(0);
      });
    });

    describe('Working with groups', function() {
      it('create group', function() {

      });
      it('add to group', function() {

      });
      it('remove from group', function() {

      });
      it('remove group', function() {

      });
    });
  });
});
