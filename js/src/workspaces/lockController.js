(function($) {

  $.LockController = function(options) {

    jQuery.extend(true, this, {
      lockProfile: 'dimensionalLockMirror', // TODO: pass this in via options
      synchronizedWindows: { byGroup: {/* groupID -> listOfWindows */}, byWindow: {/* windowID -> groupID */} },
      eventEmitter: null,
    }, options);

    this.init();
  };

  $.LockController.prototype = {
    init: function () {
      var _this = this;
      _this.listenForActions();
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

      // subscribe to lockSlot and unlockSlot
      var _this = this;

      /*
      _this.eventEmitter.subscribe('TOGGLE_LOCK', function(event, viewObj) {
        var isLocked = false;
        jQuery.each(_this.lockedWindows, function(idx, val) {
          if (viewObj.windowId === val.windowId) {
            isLocked = true;
          }
        });
        if (isLocked) {
          _this.removeFromLockGroup(viewObj);
        } else {
          _this.addToLockGroup(viewObj, );
        }
      });
      */
      _this.eventEmitter.subscribe('createLockGroup', function(event, name) {
        _this.createLockGroup(name);
        // TODO: update list of lock groups in the dom
        _this.eventEmitter.publish('updateLockGroupMenus', [Object.keys(_this.synchronizedWindows.byGroup)]);
      });
      
      _this.eventEmitter.subscribe('deleteLockGroup', function(event, name) {
        _this.deleteLockGroup(name);
        // TODO: update list of lock groups in the dom
        _this.eventEmitter.publish('updateLockGroupMenus', [Object.keys(_this.synchronizedWindows.byGroup)]);
      });

      _this.eventEmitter.subscribe('addToLockGroup', function(event, data) {
        _this.addToLockGroup(data.viewObj, data.lockGroup);
        // TODO: update list of lock groups in the dom
      });

      _this.eventEmitter.subscribe('removeFromLockGroup', function(event, data) {
        _this.removeFromLockGroup(data.viewObj);
        // TODO: update list of lock groups in the dom
      });

      _this.eventEmitter.subscribe('synchronizeZoom', function(event, viewObj) {
        _this.updateFollowers(viewObj);
      });

      _this.eventEmitter.subscribe('synchronizePan', function(event, viewObj) {
        _this.updateFollowers(viewObj);
      });
    },

    // !!! Throws exception, caller must catch
    createLockGroup: function(name) {
      var _this = this;
      if (_this.synchronizedWindows.byGroup[name] === undefined) {
        _this.synchronizedWindows.byGroup[name] = [];
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
    },

    // assumes that _this.synchronizedWindows.byGroup.lockGroup is an array
    addToLockGroup: function(viewObj, lockGroup) {
      var _this = this;
      // check to see if the window is already locked
      _this.removeFromLockGroup(viewObj);

      // add to lockGroups
      _this.synchronizedWindows.byGroup[lockGroup].push(viewObj);
      _this.synchronizedWindows.byWindow[viewObj.windowId] = lockGroup;

    },

    removeFromLockGroup: function(viewObj) {
      var _this = this,
      lockGroup = _this.synchronizedWindows.byWindow[viewObj.windowId],
      lgArr,
      idx;
      if (lockGroup !== undefined) {

        // remove from byGroup
        lgArr = _this.synchronizedWindows.byGroup[lockGroup];
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

    updateFollowers: function(viewObj) {
      var _this = this,
      lockGroup = _this.synchronizedWindows.byWindow[viewObj.windowId],
      lgArr = _this.synchronizedWindows.byGroup[lockGroup];

      if (lgArr !== undefined) {
        jQuery.each(lgArr, function(idx, val) {
          if (viewObj.windowId === val.windowId) {
  
            var followers = lgArr.filter(function(elt) {
              return elt.windowId === viewObj.windowId ? false : true;
            });
      
            // for each follower, update it using the lock profile
            jQuery.each(followers, function(i, follower) {
              // call lockOptions
              _this.lockOptions[_this.lockProfile](viewObj, follower);
            });
  
            return false;
          }
        });
      }
    }
  };
}(Mirador));
