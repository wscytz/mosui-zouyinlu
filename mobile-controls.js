// mobile-controls.js — Virtual joysticks for touch devices
(function(){
  "use strict";
  var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  // Landscape orientation lock
  function isLandscape(){return window.innerWidth>window.innerHeight}
  var rotateEl=document.getElementById("rotateHint");
  function checkOrientation(){
    if(isLandscape()){
      if(rotateEl)rotateEl.style.display="none";
    }else{
      if(rotateEl)rotateEl.style.display="";
    }
  }
  window.addEventListener("resize",checkOrientation);
  window.addEventListener("orientationchange",function(){setTimeout(checkOrientation,100)});
  try{screen.orientation.lock("landscape").catch(function(){})}catch(e){}
  checkOrientation();

  // Dynamic canvas scaling to fit viewport without cropping
  var cvs = document.getElementById("gameCanvas");
  var CW = 960, CH = 640, CRATIO = CW / CH; // 1.5
  function fitCanvas(){
    if(!cvs)return;
    var vw=window.innerWidth, vh=window.innerHeight;
    var sr=vw/vh;
    if(sr>CRATIO){
      // screen wider than canvas — fit to height
      cvs.style.height=vh+"px";
      cvs.style.width=Math.floor(vh*CRATIO)+"px";
    }else{
      // screen taller — fit to width
      cvs.style.width=vw+"px";
      cvs.style.height=Math.floor(vw/CRATIO)+"px";
    }
    updateControlSizes();
  }
  window.addEventListener("resize",fitCanvas);
  window.addEventListener("orientationchange",function(){setTimeout(fitCanvas,100)});
  fitCanvas();

  var W = 960, H = 640;
  var BASE_ALPHA = 0.25, THUMB_ALPHA = 0.55, BTN_ALPHA = 0.4;
  var ATTACK_THRESHOLD = 0.001; // very low — attack nearly instantly on touch

  // Adaptive sizing based on viewport
  var CTRL = {};
  function getSafeInsets() {
    var s = { top: 0, right: 0, bottom: 0, left: 0 };
    try {
      var style = getComputedStyle(document.documentElement);
      var pt = parseInt(style.getPropertyValue('--sat')) || 0;
      if (!pt) {
        // Read from env() via a temp measurement or parse from padding
        var b = document.body;
        var bpt = parseInt(getComputedStyle(b).paddingTop) || 0;
        s.top = bpt > 40 ? 0 : Math.max(0, 44 - bpt); // estimate
      }
      // Use CSS custom properties if set, otherwise estimate from viewport
      var rawTop = parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0;
      var rawRight = parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0;
      s.top = isNaN(rawTop) ? 0 : rawTop;
      s.right = isNaN(rawRight) ? 0 : rawRight;
    } catch(e) {}
    return s;
  }

  function updateControlSizes() {
    var rect = cvs ? cvs.getBoundingClientRect() : null;
    var logicalScale = rect && rect.width > 0 ? 960 / rect.width : 1;
    CTRL.STICK_R = Math.round(55 * logicalScale);
    CTRL.THUMB_R = Math.round(24 * logicalScale);
    CTRL.DEAD    = Math.round(10 * logicalScale);
    CTRL.DODGE_R = Math.round(32 * logicalScale);
    CTRL.PAUSE_R = Math.round(24 * logicalScale);

    // Safe area adjustments in canvas coords
    var insets = getSafeInsets();
    var scaleX = rect && rect.width > 0 ? 960 / rect.width : 1;
    var scaleY = rect && rect.height > 0 ? 640 / rect.height : 1;
    pausePos.x = W - 28 - insets.right * scaleX;
    pausePos.y = 28 + insets.top * scaleY;
    // Adjust dodge/stick Y for bottom safe area
    var bottomInsetY = (insets.bottom || 0) * scaleY;
    leftBase.y = Math.min(leftBase.y, H - bottomInsetY - 60);
    rightBase.y = Math.min(rightBase.y, H - bottomInsetY - 60);
    dodgePos.y = Math.min(dodgePos.y, H - bottomInsetY - 50);
  }
  // Positions moved lower for landscape thumb ergonomics
  var leftBase  = { x: W * 0.14, y: H * 0.82 };
  var rightBase = { x: W * 0.88, y: H * 0.82 };
  var dodgePos  = { x: W * 0.62, y: H * 0.78 };
  var pausePos  = { x: W - 28, y: 28 };

  updateControlSizes();

  var sticks = {
    left:  { active: false, touchId: null, bx: leftBase.x,  by: leftBase.y,  tx: leftBase.x,  ty: leftBase.y },
    right: { active: false, touchId: null, bx: rightBase.x, by: rightBase.y, tx: rightBase.x, ty: rightBase.y }
  };

  var dodgeDown = false;
  var pauseDown = false;
  var pauseWasDown = false; // edge detection for pause toggle
  var pauseFlash = 0; // visual feedback frames for pause button

  // Mobile input state consumed by game.js
  var input = { active: false, dx: 0, dy: 0, aimAngle: 0, attacking: false, dodging: false, pausing: false };
  window._mobileInput = input;

  function dist(x1, y1, x2, y2) {
    var dx = x1 - x2, dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clampStick(stick, tx, ty) {
    var dx = tx - stick.bx, dy = ty - stick.by;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > CTRL.STICK_R) { dx = dx / d * CTRL.STICK_R; dy = dy / d * CTRL.STICK_R; d = CTRL.STICK_R; }
    stick.tx = stick.bx + dx;
    stick.ty = stick.by + dy;
    if (d < CTRL.DEAD) return { dx: 0, dy: 0 };
    var norm = d / CTRL.STICK_R;
    return { dx: dx / CTRL.STICK_R, dy: dy / CTRL.STICK_R };
  }

  function canvasCoord(clientX, clientY) {
    var c = document.getElementById("gameCanvas");
    if (!c) return { x: clientX, y: clientY };
    var rect = c.getBoundingClientRect();
    return {
      x: rect.width > 0 ? (clientX - rect.left) * (W / rect.width) : clientX,
      y: rect.height > 0 ? (clientY - rect.top) * (H / rect.height) : clientY
    };
  }

  function handleTouches(e) {
    e.preventDefault();
    var changed = e.changedTouches;
    for (var i = 0; i < changed.length; i++) {
      var t = changed[i];
      var p = canvasCoord(t.clientX, t.clientY);
      var id = t.identifier;

      if (e.type === "touchstart") {
        // Check buttons first
        if (dist(p.x, p.y, dodgePos.x, dodgePos.y) < CTRL.DODGE_R + 10) {
          dodgeDown = true; continue;
        }
        if (dist(p.x, p.y, pausePos.x, pausePos.y) < CTRL.PAUSE_R + 10) {
          pauseDown = true; pauseFlash = 18; continue;
        }
        // Left or right stick based on screen half
        if (p.x < W / 2) {
          sticks.left.active = true;
          sticks.left.touchId = id;
          sticks.left.bx = p.x; sticks.left.by = p.y;
          sticks.left.tx = p.x; sticks.left.ty = p.y;
        } else {
          sticks.right.active = true;
          sticks.right.touchId = id;
          sticks.right.bx = p.x; sticks.right.by = p.y;
          sticks.right.tx = p.x; sticks.right.ty = p.y;
          // Immediate attack on right stick touch with auto-aim
          input.attacking = true;
          if (window._lastEnemies && window._lastEnemies.length > 0 && window._playerPos) {
            var best = null, bestD = Infinity;
            for (var ei = 0; ei < window._lastEnemies.length; ei++) {
              var en = window._lastEnemies[ei];
              if (en.hp <= 0) continue;
              var edx = en.x - window._playerPos.x, edy = en.y - window._playerPos.y;
              var ed = edx * edx + edy * edy;
              if (ed < bestD) { bestD = ed; best = en; }
            }
            if (best) input.aimAngle = Math.atan2(best.y - window._playerPos.y, best.x - window._playerPos.x);
          }
        }
      } else if (e.type === "touchmove") {
        if (sticks.left.touchId === id) {
          var cl = clampStick(sticks.left, p.x, p.y);
          input.dx = cl.dx; input.dy = cl.dy;
        } else if (sticks.right.touchId === id) {
          var cr = clampStick(sticks.right, p.x, p.y);
          var aimDx = cr.dx, aimDy = cr.dy;
          var aimMag = aimDx * aimDx + aimDy * aimDy;
          // If barely aiming, auto-aim to nearest enemy
          if (aimMag < 0.04 && window._lastEnemies && window._lastEnemies.length > 0 && window._playerPos) {
            var best = null, bestD = Infinity;
            for (var ei = 0; ei < window._lastEnemies.length; ei++) {
              var en = window._lastEnemies[ei];
              if (en.hp <= 0) continue;
              var edx = en.x - window._playerPos.x, edy = en.y - window._playerPos.y;
              var ed = edx * edx + edy * edy;
              if (ed < bestD) { bestD = ed; best = en; }
            }
            if (best) { aimDx = best.x - window._playerPos.x; aimDy = best.y - window._playerPos.y; }
          }
          input.aimAngle = Math.atan2(aimDy, aimDx);
          input.attacking = (cr.dx * cr.dx + cr.dy * cr.dy) > ATTACK_THRESHOLD;
        }
      } else if (e.type === "touchend" || e.type === "touchcancel") {
        if (sticks.left.touchId === id) {
          sticks.left.active = false; sticks.left.touchId = null;
          sticks.left.bx = leftBase.x; sticks.left.by = leftBase.y;
          sticks.left.tx = leftBase.x; sticks.left.ty = leftBase.y;
          input.dx = 0; input.dy = 0;
        } else if (sticks.right.touchId === id) {
          sticks.right.active = false; sticks.right.touchId = null;
          sticks.right.bx = rightBase.x; sticks.right.by = rightBase.y;
          sticks.right.tx = rightBase.x; sticks.right.ty = rightBase.y;
          input.attacking = false;
        }
        if (dodgeDown) {
          // Find if any remaining touch is near dodge button
          var stillDodge = false;
          for (var j = 0; j < e.touches.length; j++) {
            var tp = canvasCoord(e.touches[j].clientX, e.touches[j].clientY);
            if (dist(tp.x, tp.y, dodgePos.x, dodgePos.y) < CTRL.DODGE_R + 10) stillDodge = true;
          }
          if (!stillDodge) dodgeDown = false;
        }
        if (pauseDown) {
          var stillPause = false;
          for (var k = 0; k < e.touches.length; k++) {
            var tpp = canvasCoord(e.touches[k].clientX, e.touches[k].clientY);
            if (dist(tpp.x, tpp.y, pausePos.x, pausePos.y) < CTRL.PAUSE_R + 10) stillPause = true;
          }
          if (!stillPause) pauseDown = false;
        }
      }
    }

    // Derive input state
    input.active = sticks.left.active || sticks.right.active;
    input.dodging = dodgeDown;
    // Pause: edge-triggered to prevent repeated toggle while held
    var pauseEdge = pauseDown && !pauseWasDown;
    input.pausing = pauseEdge;
    pauseWasDown = pauseDown;
    if (pauseFlash > 0) pauseFlash--;
  }

  function drawStick(c, stick) {
    if (!stick.active) return;
    // Base
    c.globalAlpha = BASE_ALPHA;
    c.fillStyle = "rgba(23,19,16,0.3)";
    c.beginPath(); c.arc(stick.bx, stick.by, CTRL.STICK_R, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(23,19,16,0.4)"; c.lineWidth = 1.5;
    c.beginPath(); c.arc(stick.bx, stick.by, CTRL.STICK_R, 0, Math.PI * 2); c.stroke();
    // Thumb
    c.globalAlpha = THUMB_ALPHA;
    c.fillStyle = "rgba(23,19,16,0.6)";
    c.beginPath(); c.arc(stick.tx, stick.ty, CTRL.THUMB_R, 0, Math.PI * 2); c.fill();
    // Ink dot center
    c.globalAlpha = 0.3; c.fillStyle = "rgba(241,230,212,0.6)";
    c.beginPath(); c.arc(stick.tx, stick.ty, 4, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }

  function drawBtn(c, pos, r, label, pressed) {
    c.globalAlpha = pressed ? 0.6 : BTN_ALPHA;
    c.fillStyle = pressed ? "rgba(163,58,45,0.4)" : "rgba(23,19,16,0.2)";
    c.beginPath(); c.arc(pos.x, pos.y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(23,19,16,0.35)"; c.lineWidth = 1.5;
    c.beginPath(); c.arc(pos.x, pos.y, r, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = pressed ? 0.8 : 0.5;
    c.fillStyle = "rgba(23,19,16,0.7)";
    c.font = '500 13px "STKaiti","KaiTi",serif'; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(label, pos.x, pos.y);
    c.globalAlpha = 1;
  }

  // Render hook — called from game.js render()
  window._renderMobileControls = function(c, w, h) {
    // Bottom control panel background — subtle ink-wash gradient
    var panelTop = h * 0.62;
    var grad = c.createLinearGradient(0, panelTop, 0, h);
    grad.addColorStop(0, "rgba(23,19,16,0)");
    grad.addColorStop(0.25, "rgba(23,19,16,0.05)");
    grad.addColorStop(1, "rgba(23,19,16,0.15)");
    c.globalAlpha = 1;
    c.fillStyle = grad;
    c.fillRect(0, panelTop, w, h - panelTop);
    // Subtle top edge line of the panel
    c.globalAlpha = 0.08;
    c.strokeStyle = "rgba(23,19,16,0.3)";
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, panelTop); c.lineTo(w, panelTop); c.stroke();
    c.globalAlpha = 1;
    // Always show faint indicators for stick zones when game is playing
    if (!sticks.left.active) {
      c.globalAlpha = 0.08; c.fillStyle = "rgba(23,19,16,0.2)";
      c.beginPath(); c.arc(leftBase.x, leftBase.y, CTRL.STICK_R + 10, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.12; c.fillStyle = "rgba(23,19,16,0.3)";
      c.font = '400 12px "STKaiti","KaiTi",serif'; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("移动", leftBase.x, leftBase.y);
      c.globalAlpha = 1;
    }
    if (!sticks.right.active) {
      c.globalAlpha = 0.08; c.fillStyle = "rgba(23,19,16,0.2)";
      c.beginPath(); c.arc(rightBase.x, rightBase.y, CTRL.STICK_R + 10, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.12; c.fillStyle = "rgba(23,19,16,0.3)";
      c.font = '400 12px "STKaiti","KaiTi",serif'; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("攻击", rightBase.x, rightBase.y);
      c.globalAlpha = 1;
    }
    drawStick(c, sticks.left);
    drawStick(c, sticks.right);
    drawBtn(c, dodgePos, CTRL.DODGE_R, "闪", dodgeDown);
    drawBtn(c, pausePos, CTRL.PAUSE_R, "停", pauseDown || pauseFlash > 0);
  };

  // Reset all input state (called on tab switch / visibility loss)
  function resetAllInput(){
    sticks.left.active=false;sticks.left.touchId=null;
    sticks.left.bx=leftBase.x;sticks.left.by=leftBase.y;
    sticks.left.tx=leftBase.x;sticks.left.ty=leftBase.y;
    sticks.right.active=false;sticks.right.touchId=null;
    sticks.right.bx=rightBase.x;sticks.right.by=rightBase.y;
    sticks.right.tx=rightBase.x;sticks.right.ty=rightBase.y;
    dodgeDown=false;pauseDown=false;pauseWasDown=false;
    input.active=false;input.dx=0;input.dy=0;input.attacking=false;input.dodging=false;input.pausing=false;
  }
  document.addEventListener("visibilitychange",function(){
    if(document.hidden)resetAllInput();
  });

  // Bind to canvas
  var canvas = document.getElementById("gameCanvas");
  if (canvas) {
    canvas.addEventListener("touchstart", handleTouches, { passive: false });
    canvas.addEventListener("touchmove", handleTouches, { passive: false });
    canvas.addEventListener("touchend", handleTouches, { passive: false });
    canvas.addEventListener("touchcancel", handleTouches, { passive: false });
  }
})();
