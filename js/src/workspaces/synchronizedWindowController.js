(function($) {

  /*
   * Class that handles window sychrnonization.
   *
   * Format of synchronizedWindows:
   *
   * {
   *   keys: [ groupID1, ...],
   *   byGroup: {
   *     someGroupId: {
   *       views: [ ... ],
   *       settings: {
   *         profile: 'dimensionalLockMirror' or 'dimensionalLockOffset',
   *         zoompan: true,
   *         rotation: true,
   *         brightness: true,
   *         contrast: true,
   *         saturate: true,
   *         invert: true,
   *         grayscale: true,
   *         reset: true
   *       },
   *     },
   *     someOtherGroupId: { ... },
   *     ...
   *   },
   *   byWindow: {
   *     someWindowId: someGroupId,
   *     ...
   *   }
   * }
   *
   */
  $.SynchronizedWindowController = function(options) {

    jQuery.extend(true, this, {
      synchronizedWindows: null,
      state: null,
      eventEmitter: null,
    }, options);

    this.init();
  };

  $.SynchronizedWindowController.prototype = {
    init: function () {
      var _this = this;
      var savedSettings = _this.state.getStateProperty('synchronizedWindowGroupState');

      if (savedSettings !== undefined) {
        _this.synchronizedWindows = JSON.parse(savedSettings);
        // the views array will be restored by each window, starting with the restoreWindowToSynchronizedWindowGroups
        // eventEmitter message
      }
      else {
        // new settings object
        _this.synchronizedWindows = { keys: [], byGroup: {}, byWindow: {} };
      }
      _this.listenForActions();
    },

    // TODO: remove after refactor
    getSynchronizedWindowGroupData: function() {
      return this.synchronizedWindows.byGroup;
    },

    // TODO: remove after refactor
    getSynchronizedWindowGroupOfWindow: function(viewObj) {
      return this.synchronizedWindows.byWindow[viewObj.windowId];
    },

    lockOptions: {

      /*
       * Aligns the leader with the follower according to a 'mirrored' scheme, so that
       * the center of both windows correspond.
       *
       * @param {Object} leader The leader viewobject
       * @param {Object} follower The follower viewobject
       */
      dimensionalLockMirror: function(leader, follower) {

        var viewCenter = leader.osd.viewport.getCenter(),
        leaderViewportPixelWidth = leader.osd.viewport.getContainerSize().x,
        followerViewportPixelWidth = follower.osd.viewport.getContainerSize().x,
        viewportRatio = followerViewportPixelWidth / leaderViewportPixelWidth,

        // Construct target Rect variables from collected data.
        // TODO: generalize so that this works for any two arbitrary canvases
        // the following two lines assume that the canvases have the same physical dimensions
        leaderPhysWidth = 2,
        followerPhysWidth = 2,

        followerTargetRectWidth = leader.osd.viewport.getBounds().width * viewportRatio,
        followerTargetRectHeight = followerTargetRectWidth / follower.osd.viewport.getAspectRatio(),

        // calculate position of top right corner such that the
        // center maintains the same real coordinates for that image.
        followerTargetRectX = viewCenter.x - ( followerTargetRectWidth/2 ),
        followerTargetRectY = viewCenter.y - ( followerTargetRectHeight/2 ),
        followerTargetRect = new OpenSeadragon.Rect(followerTargetRectX, followerTargetRectY, followerTargetRectWidth, followerTargetRectHeight);

        follower.osd.viewport.fitBounds(followerTargetRect);
      },

      /*
       * Aligns the leader with the follower according to a 'offset' scheme, so that
       * the right edge of the leader corresponds to the left edge of the follower.
       *
       * @param {Object} leader The leader viewobject
       * @param {Object} follower The follower viewobject
       */
      dimensionalLockOffset: function(leader, follower) {

        var viewCenter = leader.osd.viewport.getCenter(),
        leaderViewportPixelWidth = leader.osd.viewport.getContainerSize().x,
        followerViewportPixelWidth = follower.osd.viewport.getContainerSize().x,
        viewportRatio = followerViewportPixelWidth / leaderViewportPixelWidth,

        // Construct target Rect variables from collected data.
        // TODO: generalize so that this works for any two arbitrary canvases
        // the following two lines assume that the canvases have the same physical dimensions
        leaderPhysWidth = 2,
        followerPhysWidth = 2,

        followerTargetRectWidth = leader.osd.viewport.getBounds().width * viewportRatio,
        followerTargetRectHeight = followerTargetRectWidth / follower.osd.viewport.getAspectRatio(),

        // calculate position of top right corner such that the
        // center maintains the same real coordinates for that image.
        followerTargetRectX = viewCenter.x + ( leader.osd.viewport.getBounds().width/2 ),
        followerTargetRectY = viewCenter.y - ( followerTargetRectHeight/2 ),
        followerTargetRect = new OpenSeadragon.Rect(followerTargetRectX, followerTargetRectY, followerTargetRectWidth, followerTargetRectHeight);

        follower.osd.viewport.fitBounds(followerTargetRect);
      }
    },

    listenForActions: function () {

      var _this = this;

      /*
       * Simply sends synchronized window group data.
       */
      _this.eventEmitter.subscribe('windowReadyForSynchronizedWindowGroups', function(event) {
        _this.eventEmitter.publish('updateSynchronizedWindowGroupMenus', _this.synchronizedWindows);
      });

      /*
       * Creates a new synchronized window group. Published by synchronizedWindowGroupsPanel.
       *
       * @param {string} name Name of new synchronized window group.
       */
      _this.eventEmitter.subscribe('createSynchronizedWindowGroup', function(event, name) {
        // update data model
        _this.createSynchronizedWindowGroup(name);

        // notify windows and synchronizedWindowGroupMenu that data model is updated, so they can update DOM
        _this.eventEmitter.publish('updateSynchronizedWindowGroupMenus', _this.synchronizedWindows);

        // notify saveController that settings have changed
        _this.eventEmitter.publish('synchronizedWindowGroupsStateChanged', _this.synchronizedWindows);
      });

      /*
       * Deletes a synchronized window group.
       *
       * @param {string} name Name of the synchronized window group to delete.
       */
      _this.eventEmitter.subscribe('deleteSynchronizedWindowGroup', function(event, name) {
        _this.deleteSynchronizedWindowGroup(name);
        _this.eventEmitter.publish('updateSynchronizedWindowGroupMenus', _this.synchronizedWindows);
        _this.eventEmitter.publish('synchronizedWindowGroupsStateChanged', _this.synchronizedWindows);
      });

      /*
       * Adds the given viewobject to the synchronized window group with the given name.
       *
       * @param {Object} data Contains:
       *     viewObj: viewobject to add
       *     synchronizedWindowGroup: name of synchronizedWindowGroup to add it to
       */
      _this.eventEmitter.subscribe('addToSynchronizedWindowGroup', function(event, data) {
        _this.addToSynchronizedWindowGroup(data.viewObj, data.synchronizedWindowGroup);
        _this.eventEmitter.publish('synchronizedWindowGroupsStateChanged', _this.synchronizedWindows);
      });

      /*
       * Removes the given viewobject from its synchronizedWindowGroup.
       *
       * @param {Object} data Wrapper for the viewobject to free
       */
      _this.eventEmitter.subscribe('removeFromSynchronizedWindowGroup', function(event, data) {
        _this.removeFromSynchronizedWindowGroup(data.viewObj);
        _this.eventEmitter.publish('synchronizedWindowGroupsStateChanged', _this.synchronizedWindows);
      });

      /*
       * Sync the zoom and pan of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('syncWindowZoom', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'zoompan');
      });

      // TODO: combine this with syncWindowZoom. Having both is unnecessary
      _this.eventEmitter.subscribe('syncWindowPan', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'zoompan');
      });

      /*
       * Sync the grayscale of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('syncWindowGrayscale', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'grayscale');
      });

      /*
       * Sync the invert of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('syncWindowInvert', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'invert');
      });

      /*
       * Sync the reset button of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('syncWindowReset', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'reset');
      });

      /*
       * Sync the brightness of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('syncWindowBrightness', function(event, data) {
        _this.updateFollowers(data.viewObj, 'brightness', data.value);
      });

      /*
       * Sync the contrast of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('syncWindowContrast', function(event, data) {
        _this.updateFollowers(data.viewObj, 'contrast', data.value);
      });

      /*
       * Sync the saturate of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('syncWindowSaturate', function(event, data) {
        _this.updateFollowers(data.viewObj, 'saturate', data.value);
      });

      /*
       * Sync the rotation of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('syncWindowRotation', function(event, data) {
        _this.updateFollowers(data.viewObj, 'rotation', data.value);
      });

      /*
       * Sync the navigation control action of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('syncWindowNavigationControls', function(event, data) {
        _this.updateFollowers(data.viewObj, 'navigationControls', data.value);
      });

      /*
       * Handle the request from the DOM to toggle settings for a synchronized window group.
       *
       * @param {Object} data Contains
       *     groupID: synchronizedWindowGroup to focus on
       *     key: setting to change
       */
      _this.eventEmitter.subscribe('toggleSynchronizedWindowGroupSettings', function(event, data) {
        _this.toggleSynchronizedWindowGroupSettings(data.groupID, data.key);

        // notify saveController that settings have changed
        _this.eventEmitter.publish('synchronizedWindowGroupsStateChanged', _this.synchronizedWindows);
      });

      /*
       * Sends synchronizedWindowGroup data to the DOM. Received upon initialization of the synchronizedWindowGroupPanel
       */
      _this.eventEmitter.subscribe('synchronizedWindowGroupsPanelReady', function(event) {
        _this.eventEmitter.publish('updateSynchronizedWindowGroupMenus', _this.synchronizedWindows);
      });

      /*
       * Checks to see if the given viewobject is part of a synchronized window group that was saved.
       * If so, it is restored.
       *
       * @param {Object} viewObj The viewobject to check
       */
      _this.eventEmitter.subscribe('restoreWindowToSynchronizedWindowController', function(event, viewObj) {
        // check if this window is in a synchronized window group
        var groupID = _this.getSynchronizedWindowGroupOfWindow(viewObj);
        if (groupID !== undefined) {
          _this.synchronizedWindows.byGroup[groupID].views.push(viewObj);
          _this.eventEmitter.publish('activateSynchronizedWindowGroupMenuItem.' + viewObj.windowId, groupID);
        }
      });
    },

    /*
     * Creates a synchronized window group with the given name, if that name isn't already in use.
     *
     * @param {string} name Name of the new synchronized window group to create
     */
    createSynchronizedWindowGroup: function(name) {
      var _this = this;
      if (_this.synchronizedWindows.byGroup[name] === undefined) {
        _this.synchronizedWindows.byGroup[name] = {
          views: [],
          settings: {
            profile: 'dimensionalLockMirror',
            zoompan: true,
            rotation: true,
            brightness: true,
            saturate: true,
            contrast: true,
            invert: true,
            grayscale: true,
            reset: true,
            navigationControls: true
          }
        };

        // add to keys array
        _this.synchronizedWindows.keys.push(name);
      } else {
        // throw error
        alert("There is already a synchronized window group with that name!");
      }
    },

    /*
     * Deletes synchronized window group with the given name.
     *
     * @param {string} name Name of the synchronized window group to delete
     */
    deleteSynchronizedWindowGroup: function(name) {
      var _this = this;
      delete _this.synchronizedWindows.byGroup[name];

      // go thru the byWindow object and delete any keys that have name as the value
      jQuery.each(_this.synchronizedWindows.byWindow, function(k, v) {
        if (v === name) {
          delete _this.synchronizedWindows.byWindow[k];
        }
      });

      // delete from keys array
      var idx = _this.synchronizedWindows.keys.indexOf(name);
      if (idx !== -1) {
        _this.synchronizedWindows.keys.splice(idx, 1);
      }
    },

    /*
     * Adds a viewobject to a synchronized window group
     *
     * @param {Object} viewObj The viewobject to add to the synchronizedWindowGroup
     * @param {string} synchronizedWindowGroup The synchronizedWindowGroup to append the viewobject to
     */
    addToSynchronizedWindowGroup: function(viewObj, synchronizedWindowGroup) {
      var _this = this;
      // check to see if the window is already synced
      _this.removeFromSynchronizedWindowGroup(viewObj);

      // add to synchronizedWindowGroups
      _this.synchronizedWindows.byGroup[synchronizedWindowGroup].views.push(viewObj);
      _this.synchronizedWindows.byWindow[viewObj.windowId] = synchronizedWindowGroup;
    },

    /*
     * Removes a viewobject from its synchronizedWindowGroup
     *
     * @param {Object} viewObj The viewobject to free
     */
    removeFromSynchronizedWindowGroup: function(viewObj) {
      var _this = this,
      synchronizedWindowGroup = _this.synchronizedWindows.byWindow[viewObj.windowId],
      lgArr,
      idx;
      if (synchronizedWindowGroup !== undefined) {

        // remove from byGroup
        lgArr = _this.synchronizedWindows.byGroup[synchronizedWindowGroup].views;
        jQuery.each(lgArr, function(i, e) {
          if (e.windowId === viewObj.windowId) {
            idx = i;
            return false;
          }
        });
        lgArr.splice(idx, 1);

        // remove from byWindow
        delete _this.synchronizedWindows.byWindow[viewObj.windowId];
      }
    },

    /*
     * Sets the settings of the synchronizedWindowGroup.
     * If key is 'profile', value must be one of the lock profiles
     * Otherwise, param value will be unused.
     *
     * @param {string} groupID The synchronized window group id
     * @param {string} key The name of the setting to toggle
     * @param {string} value Only used to set the lockProfile (e.g., 'dimensionalLockMirror')
     */
    toggleSynchronizedWindowGroupSettings: function(groupID, key, value) {

      var _this = this;
      var settings = _this.synchronizedWindows.byGroup[groupID].settings,
      currentSetting = settings[key];

      switch (key) {
        case 'profile':
          settings[key] = value;
          break;
        case 'zoompan':
        case 'rotation':
        case 'brightness':
        case 'contrast':
        case 'saturate':
        case 'invert':
        case 'grayscale':
        case 'reset':
        case 'navigationControls':
          // just flip the current setting
          settings[key] = !settings[key];
          break;
        default:
          // should never get here
          alert('ERROR: unknown synchronized window group setting is being toggled!');
          break;
      }
    },

    /*
     * Updates the leader's followers with respect to a particular setting/behavior (rotation, grayscale, etc.)
     *
     * @param {Object} viewObj The viewobject that is the leader
     * @param {string} behavior The type of behavior to propagate to the followers
     * @param {int} value The value by which to execute a particular behavior
     */
    updateFollowers: function(viewObj, behavior, value) {
      var _this = this,
      synchronizedWindowGroup = _this.synchronizedWindows.byWindow[viewObj.windowId],
      lgData = _this.synchronizedWindows.byGroup[synchronizedWindowGroup],
      lgViews,
      lgSettings,
      uiElt;

      // make sure synchronized window group exists for this window
      if (lgData !== undefined) {
        lgViews = lgData.views;
        lgSettings = lgData.settings;

        // make sure this behavior is being synced for this synchronized window group
        if (lgSettings[behavior] === true)
        {
          jQuery.each(lgViews, function(idx, val) {
            if (viewObj.windowId === val.windowId) {

              // separate the followers from the leader
              var followers = lgViews.filter(function(elt) {
                return elt.windowId === viewObj.windowId ? false : true;
              });

              // for each follower, update it using the lock profile
              jQuery.each(followers, function(i, follower) {
                switch (behavior) {
                  case 'zoompan':
                    _this.lockOptions[lgSettings.profile](viewObj, follower);
                    break;
                  case 'grayscale':
                  case 'invert':
                    uiElt = follower.element.find('.mirador-osd-' + behavior);

                    // just apply the proper filter
                    follower.applyCSSFilter(uiElt, behavior);
                    break;
                  case 'reset':
                    follower.resetImageManipulationControls();
                    break;
                  case 'brightness':
                  case 'contrast':
                  case 'saturate':
                    uiElt = follower.element.find('.mirador-osd-' + (behavior === 'saturate' ? 'saturation' : behavior) + '-slider');

                    // set the position of the slider handle to correct value, then apply the filter
                    uiElt.slider('option', 'value', value);
                    follower.applyCSSFilter(uiElt, behavior, value);
                    break;
                  case 'rotation':
                    follower.osdRotate(value);
                    break;
                  case 'navigationControls':
                    this.eventEmitter.publish('SET_CURRENT_CANVAS_ID.' + follower.windowId, value);
                    break;
                  default:
                    // should never get here
                    alert('ERROR: unknown synchronized window group setting is being toggled!');
                    break;
                }
              });

              // we've found the leader, so stop iterating over lgViews
              return false;
            }
          });
        }
      }
    }
  };
}(Mirador));
