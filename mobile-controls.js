// mobile-controls.js — Fixed virtual joysticks for touch devices
(function(){
  "use strict";

  // --- Initialization function (can run immediately or lazily on first touch) ---
  function initMobileControls() {
    if (window._mobileInput) { if(window._loadLog) window._loadLog('摇杆已初始化，跳过'); return; }

    var _log = window._loadLog || function(){};
    _log('摇杆初始化开始...');

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

    // Adaptive sizing — must be before fitCanvas (fixes CTRL undefined crash)
    var CTRL = {};
    // Dynamic canvas scaling to fit viewport without cropping
    var cvs = document.getElementById("gameCanvas");
    var CRATIO = 960 / 640; // 1.5
    function fitCanvas(){
      if(!cvs)return;
      var vw=window.innerWidth, vh=window.innerHeight;
      var sr=vw/vh;
      if(sr>CRATIO){
        cvs.style.height=vh+"px";
        cvs.style.width=Math.floor(vh*CRATIO)+"px";
      }else{
        cvs.style.width=vw+"px";
        cvs.style.height=Math.floor(vw/CRATIO)+"px";
      }
      updateControlSizes();
    }
    window._fitCanvas = fitCanvas;
    window.addEventListener("resize",fitCanvas);
    window.addEventListener("orientationchange",function(){setTimeout(fitCanvas,100)});
    fitCanvas();

    var W = 960, H = 640;
    var ATTACK_THRESHOLD = 0.08;

    if(!cvs){_log('警告: canvas未找到');}else{_log('canvas尺寸:'+cvs.offsetWidth+'x'+cvs.offsetHeight);}

    function updateControlSizes() {
      var rect = cvs ? cvs.getBoundingClientRect() : null;
      var logicalScale = rect && rect.width > 0 ? 960 / rect.width : 1;
      CTRL.STICK_R = Math.round(68 * logicalScale);
      CTRL.THUMB_R = Math.round(32 * logicalScale);
      CTRL.DEAD    = Math.round(10 * logicalScale);
      // Touch hit area — wider than visual so sloppy taps register
      CTRL.HIT_R   = CTRL.STICK_R + 60;
    }

    // Joystick sensitivity from localStorage
    var _ctrlSettings = {};
    try { _ctrlSettings = JSON.parse(localStorage.getItem("mosui_ctrl_settings") || "{}"); } catch(e) {}
    var _rawSens = _ctrlSettings.sensitivity;
    var SENSITIVITY = (typeof _rawSens === "number" && isFinite(_rawSens)) ? _rawSens : 1.0;

    // Safe-area bottom compensation for joysticks
    var _safeBottom = 0;
    try {
      var _se = document.createElement("div");
      _se.style.paddingBottom = "env(safe-area-inset-bottom)";
      _se.style.position = "fixed"; _se.style.visibility = "hidden";
      document.body.appendChild(_se);
      _safeBottom = parseFloat(getComputedStyle(_se).paddingBottom) || 0;
      document.body.removeChild(_se);
    } catch(e) {}
    var _safeY = _safeBottom * (960 / (cvs ? cvs.offsetWidth || 960 : 960)) * 0.5;

    // Fixed joystick positions — compensated for bottom safe area
    var leftBase  = { x: W * 0.14, y: H * 0.78 - _safeY };
    var rightBase = { x: W * 0.86, y: H * 0.78 - _safeY };

    // Sticks: bx/by are ALWAYS at the fixed base, never move
    var sticks = {
      left:  { active: false, touchId: null, bx: leftBase.x,  by: leftBase.y,  tx: leftBase.x,  ty: leftBase.y },
      right: { active: false, touchId: null, bx: rightBase.x, by: rightBase.y, tx: rightBase.x, ty: rightBase.y }
    };

    // Pulse animation counter
    var pulseT = 0;

    // Mobile input state consumed by game.js
    var input = { active: false, dx: 0, dy: 0, aimAngle: 0, attacking: false, dodging: false };
    window._mobileInput = input;
    Object.defineProperty(window._mobileInput, 'sensitivity', {set:function(v){SENSITIVITY=v},get:function(){return SENSITIVITY}});

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
      var s = SENSITIVITY || 1;
      return { dx: (dx / CTRL.STICK_R) * s, dy: (dy / CTRL.STICK_R) * s };
    }

    function nearestAimVector() {
      if (!(window._lastEnemies && window._lastEnemies.length > 0 && window._playerPos)) return null;
      var best = null, bestD = Infinity;
      for (var ei = 0; ei < window._lastEnemies.length; ei++) {
        var en = window._lastEnemies[ei];
        if (en.hp <= 0) continue;
        var edx = en.x - window._playerPos.x, edy = en.y - window._playerPos.y;
        var ed = edx * edx + edy * edy;
        if (ed < bestD) { bestD = ed; best = en; }
      }
      return best ? { dx: best.x - window._playerPos.x, dy: best.y - window._playerPos.y } : null;
    }

    function updateRightAim(cr) {
      var aimDx = cr.dx, aimDy = cr.dy;
      var stickMag = cr.dx * cr.dx + cr.dy * cr.dy;
      if (stickMag < ATTACK_THRESHOLD) {
        var autoAim = nearestAimVector();
        if (autoAim) { aimDx = autoAim.dx; aimDy = autoAim.dy; }
      }
      if (aimDx || aimDy) input.aimAngle = Math.atan2(aimDy, aimDx);
      input.attacking = stickMag > ATTACK_THRESHOLD;
    }

    function canvasCoord(clientX, clientY) {
      if (!cvs) return { x: clientX, y: clientY };
      var rect = cvs.getBoundingClientRect();
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
          var dLeft  = dist(p.x, p.y, leftBase.x, leftBase.y);
          var dRight = dist(p.x, p.y, rightBase.x, rightBase.y);

          if (dLeft < CTRL.HIT_R && dLeft <= dRight) {
            sticks.left.active = true;
            sticks.left.touchId = id;
            sticks.left.tx = p.x; sticks.left.ty = p.y;
            var cl = clampStick(sticks.left, p.x, p.y);
            input.dx = cl.dx; input.dy = cl.dy;
          } else if (dRight < CTRL.HIT_R) {
            sticks.right.active = true;
            sticks.right.touchId = id;
            sticks.right.tx = p.x; sticks.right.ty = p.y;
            updateRightAim(clampStick(sticks.right, p.x, p.y));
          }
        } else if (e.type === "touchmove") {
          if (sticks.left.touchId === id) {
            var cl = clampStick(sticks.left, p.x, p.y);
            input.dx = cl.dx; input.dy = cl.dy;
          } else if (sticks.right.touchId === id) {
            var cr = clampStick(sticks.right, p.x, p.y);
            updateRightAim(cr);
          }
        } else if (e.type === "touchend" || e.type === "touchcancel") {
          if (sticks.left.touchId === id) {
            sticks.left.active = false; sticks.left.touchId = null;
            sticks.left.tx = leftBase.x; sticks.left.ty = leftBase.y;
            input.dx = 0; input.dy = 0;
          } else if (sticks.right.touchId === id) {
            sticks.right.active = false; sticks.right.touchId = null;
            sticks.right.tx = rightBase.x; sticks.right.ty = rightBase.y;
            input.attacking = false;
          }
        }
      }

      input.active = sticks.left.active || sticks.right.active;
    }

    // Draw a single joystick
    function drawStick(c, stick, label, pulse) {
      var isActive = stick.active;
      var baseAlpha = isActive ? 0.7 : (0.5 + pulse * 0.15);
      var thumbAlpha = isActive ? 0.9 : 0.6;

      // Outer decorative ring
      c.globalAlpha = baseAlpha;
      c.strokeStyle = "rgba(241,230,212,0.7)";
      c.lineWidth = 2;
      c.beginPath(); c.arc(stick.bx, stick.by, CTRL.STICK_R + 4, 0, Math.PI * 2); c.stroke();

      // Base circle fill
      c.globalAlpha = baseAlpha;
      c.fillStyle = "rgba(241,230,212,0.25)";
      c.beginPath(); c.arc(stick.bx, stick.by, CTRL.STICK_R, 0, Math.PI * 2); c.fill();
      // Base circle stroke
      c.globalAlpha = baseAlpha + 0.15;
      c.strokeStyle = "rgba(241,230,212,0.7)";
      c.lineWidth = 2.5;
      c.beginPath(); c.arc(stick.bx, stick.by, CTRL.STICK_R, 0, Math.PI * 2); c.stroke();

      // Crosshair lines in base
      c.globalAlpha = isActive ? 0.3 : 0.18;
      c.strokeStyle = "rgba(241,230,212,0.5)";
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(stick.bx - CTRL.STICK_R * 0.6, stick.by); c.lineTo(stick.bx + CTRL.STICK_R * 0.6, stick.by); c.stroke();
      c.beginPath(); c.moveTo(stick.bx, stick.by - CTRL.STICK_R * 0.6); c.lineTo(stick.bx, stick.by + CTRL.STICK_R * 0.6); c.stroke();

      // Thumb
      c.globalAlpha = thumbAlpha;
      c.fillStyle = isActive ? "rgba(241,230,212,0.8)" : "rgba(241,230,212,0.55)";
      c.beginPath(); c.arc(stick.tx, stick.ty, CTRL.THUMB_R, 0, Math.PI * 2); c.fill();
      c.strokeStyle = isActive ? "rgba(241,230,212,0.8)" : "rgba(241,230,212,0.6)";
      c.lineWidth = 2;
      c.beginPath(); c.arc(stick.tx, stick.ty, CTRL.THUMB_R, 0, Math.PI * 2); c.stroke();

      // Ink dot in thumb center
      c.globalAlpha = isActive ? 0.8 : 0.5;
      c.fillStyle = "rgba(23,19,16,0.8)";
      c.beginPath(); c.arc(stick.tx, stick.ty, 3, 0, Math.PI * 2); c.fill();

      // Label below base (only when idle)
      if (!isActive) {
        c.globalAlpha = 0.7 + pulse * 0.15;
        c.fillStyle = "rgba(241,230,212,0.85)";
        c.font = '500 14px "STKaiti","KaiTi",serif';
        c.textAlign = "center"; c.textBaseline = "top";
        c.fillText(label, stick.bx, stick.by + CTRL.STICK_R + 8);
      }
      c.globalAlpha = 1;
    }

    // Render hook — called from game.js render()
    window._renderMobileControls = function(c, w, h) {
      c.save();
      pulseT++;

      // Bottom panel — solid dark background for joystick contrast
      var panelTop = h * 0.76;
      c.globalAlpha = 0.55;
      c.fillStyle = "rgba(23,19,16,0.9)";
      c.fillRect(0, panelTop, w, h - panelTop);
      // Top edge gradient for smooth transition
      var grad = c.createLinearGradient(0, panelTop - 8, 0, panelTop + 4);
      grad.addColorStop(0, "rgba(23,19,16,0)");
      grad.addColorStop(1, "rgba(23,19,16,0.9)");
      c.fillStyle = grad;
      c.fillRect(0, panelTop - 8, w, 12);
      // Decorative top edge line
      c.globalAlpha = 0.25;
      c.strokeStyle = "rgba(241,230,212,0.4)";
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(40, panelTop); c.lineTo(w - 40, panelTop); c.stroke();

      var pulse = 0.5 + 0.5 * Math.sin(pulseT * 0.04);

      drawStick(c, sticks.left, "移动", pulse);
      drawStick(c, sticks.right, "攻击", pulse);
      c.restore();
    };

    // Reset all input state
    function resetAllInput(){
      sticks.left.active=false;sticks.left.touchId=null;
      sticks.left.tx=leftBase.x;sticks.left.ty=leftBase.y;
      sticks.right.active=false;sticks.right.touchId=null;
      sticks.right.tx=rightBase.x;sticks.right.ty=rightBase.y;
      input.active=false;input.dx=0;input.dy=0;input.attacking=false;input.dodging=false;
    }
    document.addEventListener("visibilitychange",function(){
      if(document.hidden)resetAllInput();
    });

    // Bind to canvas
    if (cvs) {
      cvs.addEventListener("touchstart", handleTouches, { passive: false });
      cvs.addEventListener("touchmove", handleTouches, { passive: false });
      cvs.addEventListener("touchend", handleTouches, { passive: false });
      cvs.addEventListener("touchcancel", handleTouches, { passive: false });
      window.addEventListener("touchstart",function(e){if(!e.target.closest||!e.target.closest('canvas'))return;handleTouches(e)},{passive:false});
      window.addEventListener("touchend",function(e){handleTouches(e)},{passive:false});
      window.addEventListener("touchcancel",function(e){handleTouches(e)},{passive:false});
      _log('触控事件已绑定');
    } else {
      _log('错误: 绑定触控时canvas未找到');
    }

    if (window._loadLog) window._loadLog('摇杆就绪 ✓ L('+leftBase.x.toFixed(0)+','+leftBase.y.toFixed(0)+') R('+rightBase.x.toFixed(0)+','+rightBase.y.toFixed(0)+')');
function ensureMobileButtons(){
  var btns=document.querySelectorAll('.mobile-btn');
  var isTouch='ontouchstart' in window||navigator.maxTouchPoints>0;
  if(isTouch){for(var i=0;i<btns.length;i++)btns[i].style.display='block'}
}
ensureMobileButtons();
window.addEventListener('touchstart',function(){ensureMobileButtons()},{once:true});
  }

  // Expose for game.js fallback trigger — always force init regardless of detection
  window.__forceMobileInit = function() {
    try { initMobileControls(); } catch(e) { if(window._loadLog) window._loadLog('摇杆错误:'+e.message); }
  };

  // --- Always initialize on native (Capacitor), lazy init elsewhere ---
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var isTouch = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');

  if (window._loadLog) window._loadLog('检测: native='+isNative+' touch='+isTouch+' ua='+(navigator.userAgent||'').substring(0,40));

  if (isNative || isTouch) {
    initMobileControls();
  } else {
    // Lazy init on first touch for unknown environments
    var _lazyInit = function() {
      document.removeEventListener('touchstart', _lazyInit, true);
      window.removeEventListener('touchstart', _lazyInit, true);
      initMobileControls();
    };
    document.addEventListener('touchstart', _lazyInit, true);
    window.addEventListener('touchstart', _lazyInit, true);
    if (window._loadLog) window._loadLog('等待触控...');
  }
  // Fallback: force init after 2s if still not initialized (edge case devices)
  setTimeout(function(){if(!window._mobileInput)initMobileControls()},2000);
})();
