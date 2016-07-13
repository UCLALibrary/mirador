(function($) {

  $.LockController = function(options) {

    jQuery.extend(true, this, {
      /* format of synchronizedWindows:
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
       *
       *     someOtherGroupId: { ... },
       *
       *     ...
       *
       *   },
       *
       *   byWindow: {
       *     someWindowId: someGroupId,
       *     ...
       *   }
       * }
       */
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
      var parsedSavedSettings;
      console.log(savedSettings);

      if (savedSettings !== undefined) {
      
        /*
         * format:
         *
         * {
         *   keys: [],
         *   byGroup: {
         *     someGroupId: {
         *       settings: {},
         *     },
         *     ...
         *   },
         *   byWindow: {
         *     someWindowId: someGroupId,
         *     ...
         *   }
         * }
         *
         */

          /*
        function reviver(k, v) {

          // determine if this is a byGroup obj
          if (key === 'views' &&
              this.hasOwnProperty('settings') &&
                this.settings.hasOwnProperty('profile') &&
                this.settings.hasOwnProperty('zoompan') &&
                this.settings.hasOwnProperty('rotation') &&
                this.settings.hasOwnProperty('brightness') &&
                this.settings.hasOwnProperty('contrast') &&
                this.settings.hasOwnProperty('invert') &&
                this.settings.hasOwnProperty('grayscale') &&
                this.settings.hasOwnProperty('reset') ) {
            // set views to contain
            return [];
          }
        }
        */

        _this.synchronizedWindows = JSON.parse(savedSettings);

        /*
        jQuery.each(_this.synchronizedWindows.byGroup, function(k, v) {
          // create empty array
          v.views = [];
        });
        */

        jQuery.each(_this.synchronizedWindows.byWindow, function(k, v) {
          // restore the views for each groupId
          //
          //
          console.log(k);
          console.log(v);
          console.log('break here');
          _this.synchronizedWindows.byGroup[v].views.push( /* window with id of k */ );
        });
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

      dimensionalLockMirror: function(leader, follower) {

        var viewCenter = leader.osd.viewport.getCenter(),
        leaderViewportPixelWidth = leader.osd.viewport.getContainerSize().x,
        followerViewportPixelWidth = follower.osd.viewport.getContainerSize().x,
        viewportRatio = followerViewportPixelWidth / leaderViewportPixelWidth,

        // Construct target Rect variables from collected data.
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

      dimensionalLockOffset: function(leader, follower) {

        var viewCenter = leader.osd.viewport.getCenter(),
        leaderViewportPixelWidth = leader.osd.viewport.getContainerSize().x,
        followerViewportPixelWidth = follower.osd.viewport.getContainerSize().x,
        viewportRatio = followerViewportPixelWidth / leaderViewportPixelWidth,

        // Construct target Rect variables from collected data.
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

      _this.eventEmitter.subscribe('createLockGroup', function(event, name) {
        _this.createLockGroup(name);

        // update DOM
        _this.eventEmitter.publish('updateLockGroupMenus', _this.synchronizedWindows);

        // notify saveController that settings have changed
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });
      
      _this.eventEmitter.subscribe('deleteLockGroup', function(event, name) {
        _this.deleteLockGroup(name);
        _this.eventEmitter.publish('updateLockGroupMenus', _this.synchronizedWindows);
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });

      _this.eventEmitter.subscribe('addToLockGroup', function(event, data) {
        _this.addToLockGroup(data.viewObj, data.lockGroup);
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });

      _this.eventEmitter.subscribe('removeFromLockGroup', function(event, data) {
        _this.removeFromLockGroup(data.viewObj);
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });

      _this.eventEmitter.subscribe('synchronizeZoom', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'zoompan');
      });

      _this.eventEmitter.subscribe('synchronizePan', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'zoompan');
      });

      _this.eventEmitter.subscribe('synchronizeImgGrayscale', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'grayscale');
      });

      _this.eventEmitter.subscribe('synchronizeImgInvert', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'invert');
      });

      _this.eventEmitter.subscribe('synchronizeImgReset', function(event, viewObj) {
        _this.updateFollowers(viewObj, 'reset');
      });

      _this.eventEmitter.subscribe('synchronizeImgBrightness', function(event, data) {
        _this.updateFollowers(data.viewObj, 'brightness', data.value);
      });

      _this.eventEmitter.subscribe('synchronizeImgContrast', function(event, data) {
        _this.updateFollowers(data.viewObj, 'contrast', data.value);
      });

      _this.eventEmitter.subscribe('synchronizeImgRotation', function(event, data) {
        _this.updateFollowers(data.viewObj, 'rotation', data.value);
      });

      _this.eventEmitter.subscribe('toggleLockGroupSettings', function(event, data) {
        _this.toggleLockGroupSettings(data.groupID, data.key);

        // notify saveController that settings have changed
        _this.eventEmitter.publish('lockGroupsStateChanged', _this.synchronizedWindows);
      });

      _this.eventEmitter.subscribe('lockGroupsPanelReady', function(event) {
        _this.eventEmitter.publish('updateLockGroupMenus', _this.synchronizedWindows);
      });

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

    // !!! Throws exception, caller must catch
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
        _this.synchronizedWindows.keys.push(name);
      } else {
        // throw error
        alert("There is already a lock group with that name!");
      }
    },

    deleteLockGroup: function(name) {
      var _this = this;
      delete _this.synchronizedWindows.byGroup[name];

      // go thru the byWindow object and delete any keys that have name as the value
      // TODO: also, remove all viewObj from the lock group
      jQuery.each(_this.synchronizedWindows.byWindow, function(k, v) {
        if (v === name) {
          delete _this.synchronizedWindows.byWindow[k];
        }
      });

      // delete from keys
      var idx = _this.synchronizedWindows.keys.indexOf(name);
      if (idx !== -1) {
        _this.synchronizedWindows.keys.splice(idx, 1);
      }
    },

    // assumes that _this.synchronizedWindows.byGroup.lockGroup is an array
    addToLockGroup: function(viewObj, lockGroup) {
      var _this = this;
      // check to see if the window is already locked
      _this.removeFromLockGroup(viewObj);

      // add to lockGroups
      _this.synchronizedWindows.byGroup[lockGroup].views.push(viewObj);
      _this.synchronizedWindows.byWindow[viewObj.windowId] = lockGroup;

    },

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

      // remove locked class from the slot, and change the icon from locked to unlocked
    },

    /*
     * Sets the settings of the lockGroup.
     * If key is profile, value must be one of the lock profiles
     * Otherwise, 'value' will be unused.
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
          settings[key] = !settings[key];
          break;
        default:
          // idk
          break;
      }
    },

    updateFollowers: function(viewObj, behavior, value) {
      var _this = this,
      lockGroup = _this.synchronizedWindows.byWindow[viewObj.windowId],
      lgData = _this.synchronizedWindows.byGroup[lockGroup],
      lgViews,
      lgSettings;

      if (lgData !== undefined) {
        lgViews = lgData.views;
        lgSettings = lgData.settings;

        if (lgSettings[behavior] === true)
        {
          jQuery.each(lgViews, function(idx, val) {
            if (viewObj.windowId === val.windowId) {
    
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
                    follower.imageManipGrayscale();
                    break;
                  case 'invert':
                    follower.imageManipInvert();
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
                    // idk
                    break;
                }
              });
    
              return false;
            }
          });
        }
      }
    }
  };
}(Mirador));
