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
  $.LockController = function(options) {

    jQuery.extend(true, this, {
      synchronizedWindows: null,
      state: null,
      eventEmitter: null,
    }, options);

    this.init();
  };

  $.LockController.prototype = {
    init: function () {
      var _this = this;
      var savedSettings = _this.state.getStateProperty('lockGroupState');

      if (savedSettings !== undefined) {
        _this.synchronizedWindows = JSON.parse(savedSettings);
        // the views array will be restored by each window, starting with the restoreWindowToLockGroups
        // eventEmitter message
      }
      else {
        _this.synchronizedWindows = { keys: [], byGroup: {}, byWindow: {} };
      }
      _this.listenForActions();
    },

    getLockGroupData: function() {
      return this.synchronizedWindows.byGroup;
    },

    getLockGroupOfWindow: function(viewObj) {
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
       * Creates a new lock group. Sent from lockGroupsPanel.
       *
       * @param {string} name Name of new lock group.
       */
      _this.eventEmitter.subscribe('createLockGroup', function(event, name) {
        _this.createLockGroup(name);

        // update DOM
        _this.eventEmitter.publish('updateLockGroupMenus', _this.synchronizedWindows);

        // notify saveController that settings have changed
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });
      
      /*
       * Deletes a lock group.
       *
       * @param {string} name Name of the lock group to delete.
       */
      _this.eventEmitter.subscribe('deleteLockGroup', function(event, name) {
        _this.deleteLockGroup(name);
        _this.eventEmitter.publish('updateLockGroupMenus', _this.synchronizedWindows);
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });

      /*
       * Adds the given viewobject to the lock group with the given name.
       *
       * @param {Object} data Contains:
       *     viewObj: viewobject to add
       *     lockGroup: name of lockGroup to add it to
       */
      _this.eventEmitter.subscribe('addToLockGroup', function(event, data) {
        _this.addToLockGroup(data.viewObj, data.lockGroup);
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });

      /*
       * Removes the given viewobject from its lockGroup.
       *
       * @param {Object} data Wrapper for the viewobject to free
       */
      _this.eventEmitter.subscribe('removeFromLockGroup', function(event, data) {
        _this.removeFromLockGroup(data.viewObj);
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });

      /*
       * Sync the zoom and pan of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('synchronizeZoom', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'zoompan');
      });

      // TODO: combine this with synchronizeZoom. Having both is unnecessary
      _this.eventEmitter.subscribe('synchronizePan', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'zoompan');
      });

      /*
       * Sync the grayscale of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('synchronizeImgGrayscale', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'grayscale');
      });

      /*
       * Sync the invert of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('synchronizeImgInvert', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'invert');
      });

      /*
       * Sync the reset button of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('synchronizeImgReset', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'reset');
      });

      /*
       * Sync the brightness of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('synchronizeImgBrightness', function(event, data) {
        _this.updateFollowers(data.viewObj, 'brightness', data.value);
      });

      /*
       * Sync the contrast of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('synchronizeImgContrast', function(event, data) {
        _this.updateFollowers(data.viewObj, 'contrast', data.value);
      });

      /*
       * Sync the rotation of any followers of the viewobject
       *
       * @param {Object} viewObj The leader.
       */
      _this.eventEmitter.subscribe('synchronizeImgRotation', function(event, data) {
        _this.updateFollowers(data.viewObj, 'rotation', data.value);
      });

      /*
       * Handle the request from the DOM to toggle settings for a lock group.
       *
       * @param {Object} data Contains
       *     groupID: lockGroup to focus on
       *     key: setting to change
       */
      _this.eventEmitter.subscribe('toggleLockGroupSettings', function(event, data) {
        _this.toggleLockGroupSettings(data.groupID, data.key);

        // notify saveController that settings have changed
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });

      /*
       * Sends lockGroup data to the DOM.
       */
      _this.eventEmitter.subscribe('lockGroupsPanelReady', function(event) {
        _this.eventEmitter.publish('updateLockGroupMenus', _this.synchronizedWindows);
      });

      /*
       * Checks to see if the given viewobject is part of a lock group that was saved.
       * If so, it is restored.
       *
       * @param {Object} viewObj The viewobject to check
       */
      _this.eventEmitter.subscribe('restoreWindowToLockController', function(event, viewObj) {
        // check if this window is in a lock group
        var groupID = _this.getLockGroupOfWindow(viewObj);  
        if (groupID !== undefined) {
          _this.synchronizedWindows.byGroup[groupID].views.push(viewObj);
          // TODO: publish something to be recognized by window
          _this.eventEmitter.publish('activateLockGroupMenuItem', {windowId: viewObj.windowId, groupId: groupID});
        }
      });
    },

    /*
     * Creates a lock group with the given name, if that name isn't already in use.
     *
     * @param {string} name Name of the new lock group to create
     */
    createLockGroup: function(name) {
      var _this = this;
      if (_this.synchronizedWindows.byGroup[name] === undefined) {
        _this.synchronizedWindows.byGroup[name] = {
          views: [],
          settings: {
            profile: 'dimensionalLockMirror',
            zoompan: true,
            rotation: true,
            brightness: false,
            contrast: false,
            invert: true,
            grayscale: true,
            reset: true
          }
        };
        
        // add to keys array
        _this.synchronizedWindows.keys.push(name);
      } else {
        // throw error
        alert("There is already a lock group with that name!");
      }
    },

    /*
     * Deletes lock group with the given name.
     *
     * @param {string} name Name of the lock group to delete
     */
    deleteLockGroup: function(name) {
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
     * Adds a viewobject to a lock group
     *
     * @param {Object} viewObj The viewobject to add to the lockGroup
     * @param {string} lockGroup The lockGroup to append the viewobject to
     */
    addToLockGroup: function(viewObj, lockGroup) {
      var _this = this;
      // check to see if the window is already locked
      _this.removeFromLockGroup(viewObj);

      // add to lockGroups
      _this.synchronizedWindows.byGroup[lockGroup].views.push(viewObj);
      _this.synchronizedWindows.byWindow[viewObj.windowId] = lockGroup;
    },

    /*
     * Removes a viewobject from its lockGroup
     *
     * @param {Object} viewObj The viewobject to free
     */
    removeFromLockGroup: function(viewObj) {
      var _this = this,
      lockGroup = _this.synchronizedWindows.byWindow[viewObj.windowId],
      lgArr,
      idx;
      if (lockGroup !== undefined) {

        // remove from byGroup
        lgArr = _this.synchronizedWindows.byGroup[lockGroup].views;
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
     * Sets the settings of the lockGroup.
     * If key is profile, value must be one of the lock profiles
     * Otherwise, 'value' will be unused.
     *
     * @param {string} groupID The lock group id
     * @param {string} key The name of the setting to toggle
     * @param {string} value Only used to set the lockProfile (e.g., 'dimensionalLockMirror')
     */
    toggleLockGroupSettings: function(groupID, key, value) {

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
        case 'invert':
        case 'grayscale':
        case 'reset':
          // just flip the current setting
          settings[key] = !settings[key];
          break;
        default:
          // should never get here
          alert('ERROR: unknown lock group setting is being toggled!');
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
      lockGroup = _this.synchronizedWindows.byWindow[viewObj.windowId],
      lgData = _this.synchronizedWindows.byGroup[lockGroup],
      lgViews,
      lgSettings,
      followerImageManipButton;

      // make sure lock group exists for this window
      if (lgData !== undefined) {
        lgViews = lgData.views;
        lgSettings = lgData.settings;

        // make sure this behavior is being synced for this lock group
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
                    followerImageManipButton = follower.element.find('.mirador-osd-grayscale');
                    follower.imageManipGrayscale(followerImageManipButton);
                    break;
                  case 'invert':
                    followerImageManipButton = follower.element.find('.mirador-osd-invert');
                    follower.imageManipInvert(followerImageManipButton);
                    break;
                  case 'reset':
                    follower.imageManipReset();
                    break;
                  case 'brightness':
                    // TODO
                    follower.imageManipBrightness(value);
                    break;
                  case 'contrast':
                    // TODO
                    follower.imageManipContrast(value);
                    break;
                  case 'rotation':
                    follower.imageRotate(value);
                    break;
                  default:
                    // should never get here
                    alert('ERROR: unknown lock group setting is being toggled!');
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
