(function($) {

  $.LockController = function(options) {

    jQuery.extend(true, this, {
      lockProfile: 'dimensionalLockOffset', // TODO: pass this in via options
      lockedWindows: [],
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

      _this.eventEmitter.subscribe('TOGGLE_LOCK', function(event, viewObj) {
        var isLocked = false;
        jQuery.each(_this.lockedWindows, function(idx, val) {
          if (viewObj.windowId === val.windowId) {
            isLocked = true;
          }
        });
        if (isLocked) {
          _this.unlockWindow(viewObj);
        } else {
          _this.lockWindow(viewObj);
        }
      });

      _this.eventEmitter.subscribe('synchronizeZoom', function(event, viewObj) {
        _this.updateFollowers(viewObj);
      });

      _this.eventEmitter.subscribe('synchronizePan', function(event, viewObj) {
        _this.updateFollowers(viewObj);
      });
    },

    lockWindow: function(viewObj) {
      var _this = this;
      _this.lockedWindows.push(viewObj);

      // add locked class to the slot, and change the icon from unlocked to locked

    },

    unlockWindow: function(viewObj) {
      var _this = this;
      console.log('unlockWindow');
      _this.lockedWindows = _this.lockedWindows.filter(function(e, i, a) {
        return e.windowId === viewObj.windowId ? false : true;
      });

      // remove locked class from the slot, and change the icon from locked to unlocked
    },

    updateFollowers: function(viewObj) {
      var _this = this;

      jQuery.each(_this.lockedWindows, function(idx, val) {
        if (viewObj.windowId === val.windowId) {

          var followers = _this.lockedWindows.filter(function(elt) {
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
  };
}(Mirador));
