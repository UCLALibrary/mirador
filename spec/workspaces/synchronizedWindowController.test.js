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
      // create a panel and controller for the synchronized window groups
      this.eventEmitter = new Mirador.EventEmitter();
      this.mockedEventEmitter = new MockEventEmitter(this.eventEmitter);
      this.state = new Mirador.SaveController(jQuery.extend(true, {}, Mirador.DEFAULT_SETTINGS, {'eventEmitter': this.mockedEventEmitter}));
      this.c = new Mirador.SynchronizedWindowController({state: this.state, eventEmitter: this.mockedEventEmitter});
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
      var viewObj1 = { windowId: 'a' };
      var viewObj2 = { windowId: 'b' };
      var viewObj3 = { windowId: 'c' };

      it('create group', function() {
        this.c.createSynchronizedWindowGroup('group1');
        expect(this.s.keys.length).toBe(1)
        expect(Object.keys(this.s.byGroup)).toEqual(this.s.keys);
        expect(Object.keys(this.s.byWindow).length).toBe(0);

        this.c.createSynchronizedWindowGroup('group2');
        expect(this.s.keys.length).toBe(2)
        expect(Object.keys(this.s.byGroup)).toEqual(this.s.keys);
        expect(Object.keys(this.s.byWindow).length).toBe(0);
      });
      it('add to group', function() {
        // add to empty group
        this.c.addToSynchronizedWindowGroup(viewObj1, 'group1');
        this.c.addToSynchronizedWindowGroup(viewObj2, 'group2');
        expect(this.s.byGroup['group1'].views.length).toBe(1);
        expect(this.s.byGroup['group2'].views.length).toBe(1);

        // add to nonempty group
        this.c.addToSynchronizedWindowGroup(viewObj3, 'group1');
        expect(this.s.byGroup['group1'].views.length).toBe(2);

        // move to different group
        this.c.addToSynchronizedWindowGroup(viewObj3, 'group2');
        expect(this.s.byGroup['group1'].views.length).toBe(1);
        expect(this.s.byGroup['group2'].views.length).toBe(2);

        // add to nonexistent group
        //expect(this.c.addToSynchronizedWindowGroup(viewObj3, 'nonexistent group')).toThrow();
      });
      it('remove from group', function() {
        // remove from empty group
        this.c.removeFromSynchronizedWindowGroup(viewObj1);
        // remove from nonempty group
      });
      it('remove group', function() {
        // empty group
        // nonempty group

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
