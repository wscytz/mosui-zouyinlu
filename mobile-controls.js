// mobile-controls.js — Mobile input layer for touch devices
//
// Architecture:
//   1. Platform detection — should we init mobile UI?
//   2. Canvas adaptation — fit to viewport, compute logical sizes
//   3. Joystick math — dead zone, response curve, coordinate mapping
//   4. Auto-aim — sticky targeting, angle smoothing, per-frame tick
//   5. Touch bridge — raw touch → joystick state
//   6. Rendering — joystick visuals on canvas overlay
//   7. Input state — the _mobileInput object consumed by game.js
//   8. Lifecycle — init, reset, visibility/blur handlers
//
(function(){
  "use strict";

  // ================================================================
  // 1. PLATFORM DETECTION
  // ================================================================

  function hasMobileDebugFlag() {
    var q = "";
    try { q = (window.location && window.location.search) || ""; } catch(e) {}
    return /(?:[?&](?:mobile|mobileControls)=1(?:&|$))|(?:[?&]controls=mobile(?:&|$))/.test(q);
  }

  function needsMobileUI() {
    var isNative = false;
    try {
      isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    } catch(e) {}
    return isNative || hasMobileDebugFlag();
  }

  window.__needsMobileUI = needsMobileUI;

  // ================================================================
  // 2–8. INITIALIZATION (runs only on mobile)
  // ================================================================
  function initMobileControls() {
    if (!needsMobileUI()) { if(window._loadLog) window._loadLog('网页端输入模式，跳过摇杆初始化'); return false; }
    if (window._mobileInput) { if(window._loadLog) window._loadLog('摇杆已初始化，跳过'); return; }

    var _log = window._loadLog || function(){};
    _log('摇杆初始化开始...');
    if(document.body)document.body.classList.add("is-mobile-ui");

    // ================================================================
    // 2. CANVAS ADAPTATION
    // ================================================================
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

    // PROF initialization — must be before fitCanvas/updateControlSizes/ATTACK_THRESHOLD
    window.MOSUI=window.MOSUI||{};
    window.MOSUI.input=window.MOSUI.input||{};
    window.MOSUI.platform=window.MOSUI.platform||{};
    window.MOSUI.profiles=window.MOSUI.profiles||{control:{},render:{},ui:{}};
    window.MOSUI.profiles.control=window.MOSUI.profiles.control||{};
    var PROF = window.MOSUI.profiles.control;
    if (!PROF.stickR) PROF.stickR = 62;
    if (!PROF.thumbR) PROF.thumbR = 30;
    if (!PROF.deadZone) PROF.deadZone = 22;
    if (!PROF.hitPad) PROF.hitPad = 55;
    if (!PROF.attackThresh) PROF.attackThresh = 0.08;
    if (!PROF.curvePower) PROF.curvePower = 3;
    if (!PROF.defaultSens) PROF.defaultSens = 1.0;
    if (!PROF.leftBaseX) PROF.leftBaseX = 0.15;
    if (!PROF.leftBaseY) PROF.leftBaseY = 0.72;
    if (!PROF.rightBaseX) PROF.rightBaseX = 0.78;
    if (!PROF.rightBaseY) PROF.rightBaseY = 0.72;
    if (!PROF.panelY) PROF.panelY = 0.80;
    if (!PROF.aimSmoothTick) PROF.aimSmoothTick = 0.2;
    if (!PROF.aimSmoothTouch) PROF.aimSmoothTouch = 0.25;
    if (!PROF.aimReturnDelay) PROF.aimReturnDelay = 5;
    if (!PROF.targetSwitchRatio) PROF.targetSwitchRatio = 0.65;
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
    var ATTACK_THRESHOLD = PROF.attackThresh;

    if(!cvs){_log('警告: canvas未找到');}else{_log('canvas尺寸:'+cvs.offsetWidth+'x'+cvs.offsetHeight);}

    function updateControlSizes() {
      var rect = cvs ? cvs.getBoundingClientRect() : null;
      var logicalScale = rect && rect.width > 0 ? 960 / rect.width : 1;
      CTRL.STICK_R = Math.round(PROF.stickR * logicalScale);
      CTRL.THUMB_R = Math.round(PROF.thumbR * logicalScale);
      CTRL.DEAD    = Math.round(PROF.deadZone * logicalScale);
      // Touch hit area — wider than visual so sloppy taps register
      CTRL.HIT_R   = CTRL.STICK_R + PROF.hitPad;
    }

    // ================================================================
    // 3. JOYSTICK MATH
    // ================================================================

    // Joystick sensitivity from localStorage
    var _ctrlSettings = {};
    try { _ctrlSettings = JSON.parse(localStorage.getItem("mosui_ctrl_settings") || "{}"); } catch(e) {}
    var _rawSens = _ctrlSettings.sensitivity;
    var SENSITIVITY = (typeof _rawSens === "number" && isFinite(_rawSens)) ? _rawSens : PROF.defaultSens;

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
    var _safeY = _safeBottom * (960 / (cvs ? cvs.offsetWidth || 960 : 960));

    // Fixed joystick positions — compensated for bottom safe area
    var leftBase  = { x: W * PROF.leftBaseX, y: H * PROF.leftBaseY - _safeY };
    var rightBase = { x: W * PROF.rightBaseX, y: H * PROF.rightBaseY - _safeY };

    // Sticks: bx/by are ALWAYS at the fixed base, never move
    var sticks = {
      left:  { active: false, touchId: null, bx: leftBase.x,  by: leftBase.y,  tx: leftBase.x,  ty: leftBase.y },
      right: { active: false, touchId: null, bx: rightBase.x, by: rightBase.y, tx: rightBase.x, ty: rightBase.y }
    };

    // Pulse animation counter
    var pulseT = 0;

    // Mobile input state consumed by game.js
    var input = { active: false, dx: 0, dy: 0, aimAngle: 0, attacking: false, dodging: false, dodgeRequest: 0, leftActive: false, rightActive: false, lastAimMode: "idle", autoAtk: false };
    window._mobileInput = input;
    window.MOSUI.input.mobile=input;
    Object.defineProperty(window._mobileInput, 'sensitivity', {set:function(v){SENSITIVITY=v},get:function(){return SENSITIVITY}});

    // Haptic feedback helper
    function haptic(style) {
      try {
        if (window.Capacitor && Capacitor.Haptics) {
          if (style === "light") Capacitor.Haptics.impact({ style: 'LIGHT' });
          else if (style === "medium") Capacitor.Haptics.impact({ style: 'MEDIUM' });
        } else if (navigator.vibrate) {
          navigator.vibrate(style === "light" ? 10 : 25);
        }
      } catch(e) {}
    }

    // --- Auto-aim state ---
    var _lockedTargetId = -1;      // enemy.id of currently locked target
    var _aimAngleSmooth = 0;       // smoothed aim angle
    var _aimReturnDelay = 0;       // frames to wait after right stick release before returning to auto
    var _hasEverLocked = false;    // whether auto-aim has locked onto anything this session

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
      // Nonlinear response: small movements dampened, large movements ramp up fast
      var norm = (d - CTRL.DEAD) / (CTRL.STICK_R - CTRL.DEAD); // 0..1
      var curved = Math.pow(norm, PROF.curvePower); // configurable curve power
      var s = SENSITIVITY || 1;
      var outScale = curved * s;
      var angle = Math.atan2(dy, dx);
      return { dx: Math.cos(angle) * outScale, dy: Math.sin(angle) * outScale };
    }

    function nearestAimVector() {
      if (!(window._lastEnemies && window._lastEnemies.length > 0 && window._playerPos)) return null;
      var pp = window._playerPos;
      var locked = null;

      // Try to keep current locked target
      if (_lockedTargetId >= 0) {
        for (var li = 0; li < window._lastEnemies.length; li++) {
          var le = window._lastEnemies[li];
          if (le.id === _lockedTargetId && le.hp > 0) { locked = le; break; }
        }
      }

      // If locked target is alive, check if we should switch
      if (locked) {
        var lockDx = locked.x - pp.x, lockDy = locked.y - pp.y;
        var lockD = lockDx * lockDx + lockDy * lockDy;
        // Find nearest as alternative
        var best = null, bestD = Infinity;
        for (var ei = 0; ei < window._lastEnemies.length; ei++) {
          var en = window._lastEnemies[ei];
          if (en.hp <= 0) continue;
          var edx = en.x - pp.x, edy = en.y - pp.y;
          var ed = edx * edx + edy * edy;
          if (ed < bestD) { bestD = ed; best = en; }
        }
        // Switch only if new target is 35%+ closer
        if (best && best.id !== _lockedTargetId && bestD < lockD * PROF.targetSwitchRatio) {
          _lockedTargetId = best.id;
          return { dx: best.x - pp.x, dy: best.y - pp.y, target: best };
        }
        return { dx: lockDx, dy: lockDy, target: locked };
      }

      // No locked target or target died — find nearest
      var best = null, bestD = Infinity;
      for (var ei = 0; ei < window._lastEnemies.length; ei++) {
        var en = window._lastEnemies[ei];
        if (en.hp <= 0) continue;
        var edx = en.x - pp.x, edy = en.y - pp.y;
        var ed = edx * edx + edy * edy;
        if (ed < bestD) { bestD = ed; best = en; }
      }
      if (best) {
        _lockedTargetId = best.id;
        _hasEverLocked = true;
        return { dx: best.x - pp.x, dy: best.y - pp.y, target: best };
      }
      _lockedTargetId = -1;
      return null;
    }

    // Smooth angle interpolation (handles wrap-around)
    function lerpAngle(from, to, t) {
      var diff = to - from;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return from + diff * t;
    }

    function updateRightAim(cr) {
      var aimDx = cr.dx, aimDy = cr.dy;
      var stickMag = cr.dx * cr.dx + cr.dy * cr.dy;
      if (stickMag < ATTACK_THRESHOLD) {
        // Right stick idle — auto-aim with delay
        _aimReturnDelay = Math.max(0, _aimReturnDelay - 1);
        if (_aimReturnDelay <= 0) {
          var autoAim = nearestAimVector();
          if (autoAim) {
            var targetAngle = Math.atan2(autoAim.dy, autoAim.dx);
            // Smooth interpolation — fast tracking but no jitter
            _aimAngleSmooth = lerpAngle(_aimAngleSmooth, targetAngle, PROF.aimSmoothTouch);
            input.aimAngle = _aimAngleSmooth;
            input.lastAimMode = "auto";
            input.autoAtk = true;
          } else {
            input.lastAimMode = "idle";
            input.autoAtk = false;
            _lockedTargetId = -1;
          }
        }
        input.attacking = false;
      } else {
        // Right stick active — instant manual override
        input.lastAimMode = "stick";
        var manualAngle = Math.atan2(aimDy, aimDx);
        input.aimAngle = manualAngle;
        _aimAngleSmooth = manualAngle;
        input.attacking = true;
        input.autoAtk = false;
        // Clear lock and set return delay when manually aiming
        _lockedTargetId = -1;
        _aimReturnDelay = PROF.aimReturnDelay;
      }
    }

    // ================================================================
    // 5. TOUCH BRIDGE — raw touch events → joystick state
    // ================================================================

    function canvasCoord(clientX, clientY) {
      if (!cvs) return { x: clientX, y: clientY };
      var rect = cvs.getBoundingClientRect();
      return {
        x: rect.width > 0 ? (clientX - rect.left) * (W / rect.width) : clientX,
        y: rect.height > 0 ? (clientY - rect.top) * (H / rect.height) : clientY
      };
    }

    function handleTouches(e) {
      var changed = e.changedTouches;
      var handled = false;
      for (var i = 0; i < changed.length; i++) {
        var t = changed[i];
        var p = canvasCoord(t.clientX, t.clientY);
        var id = t.identifier;

        if (e.type === "touchstart") {
          var dLeft  = dist(p.x, p.y, leftBase.x, leftBase.y);
          var dRight = dist(p.x, p.y, rightBase.x, rightBase.y);

          if (dLeft < CTRL.HIT_R && dLeft <= dRight) {
            handled = true;
            sticks.left.active = true;
            sticks.left.touchId = id;
            sticks.left.tx = p.x; sticks.left.ty = p.y;
            var cl = clampStick(sticks.left, p.x, p.y);
            input.dx = cl.dx; input.dy = cl.dy;
            input.leftActive = true;
            haptic("light");
          } else if (dRight < CTRL.HIT_R) {
            handled = true;
            sticks.right.active = true;
            sticks.right.touchId = id;
            sticks.right.tx = p.x; sticks.right.ty = p.y;
            updateRightAim(clampStick(sticks.right, p.x, p.y));
            input.rightActive = true;
            haptic("light");
          }
        } else if (e.type === "touchmove") {
          if (sticks.left.touchId === id) {
            handled = true;
            var cl = clampStick(sticks.left, p.x, p.y);
            input.dx = cl.dx; input.dy = cl.dy;
          } else if (sticks.right.touchId === id) {
            handled = true;
            var cr = clampStick(sticks.right, p.x, p.y);
            updateRightAim(cr);
          }
        } else if (e.type === "touchend" || e.type === "touchcancel") {
          if (sticks.left.touchId === id) {
            handled = true;
            sticks.left.active = false; sticks.left.touchId = null;
            sticks.left.tx = leftBase.x; sticks.left.ty = leftBase.y;
            input.dx = 0; input.dy = 0;
            input.leftActive = false;
          } else if (sticks.right.touchId === id) {
            handled = true;
            sticks.right.active = false; sticks.right.touchId = null;
            sticks.right.tx = rightBase.x; sticks.right.ty = rightBase.y;
            input.attacking = false;
            input.rightActive = false;
            // Keep autoAtk true — will auto-aim at nearest enemy on next frame
          }
        }
      }

      if (handled) e.preventDefault();
      input.active = sticks.left.active || sticks.right.active;
    }

    // ================================================================
    // 6. RENDERING — joystick visuals drawn on canvas overlay
    // ================================================================

    // Draw a single joystick
    function drawStick(c, stick, label, pulse, isRight) {
      var isActive = stick.active;
      var baseAlpha = isActive ? 0.85 : (0.5 + pulse * 0.15);
      var thumbAlpha = isActive ? 0.95 : 0.6;

      // Outer decorative ring — brighter when active
      c.globalAlpha = baseAlpha;
      c.strokeStyle = isActive ? "rgba(241,230,212,0.9)" : "rgba(241,230,212,0.7)";
      c.lineWidth = isActive ? 2.5 : 2;
      c.beginPath(); c.arc(stick.bx, stick.by, CTRL.STICK_R + 4, 0, Math.PI * 2); c.stroke();

      // Base circle fill — brighter when active
      c.globalAlpha = isActive ? 0.4 : 0.25;
      c.fillStyle = isActive ? "rgba(241,230,212,0.4)" : "rgba(241,230,212,0.25)";
      c.beginPath(); c.arc(stick.bx, stick.by, CTRL.STICK_R, 0, Math.PI * 2); c.fill();
      // Base circle stroke
      c.globalAlpha = baseAlpha + 0.1;
      c.strokeStyle = "rgba(241,230,212,0.7)";
      c.lineWidth = 2.5;
      c.beginPath(); c.arc(stick.bx, stick.by, CTRL.STICK_R, 0, Math.PI * 2); c.stroke();

      // Crosshair lines in base
      c.globalAlpha = isActive ? 0.35 : 0.18;
      c.strokeStyle = "rgba(241,230,212,0.5)";
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(stick.bx - CTRL.STICK_R * 0.6, stick.by); c.lineTo(stick.bx + CTRL.STICK_R * 0.6, stick.by); c.stroke();
      c.beginPath(); c.moveTo(stick.bx, stick.by - CTRL.STICK_R * 0.6); c.lineTo(stick.bx, stick.by + CTRL.STICK_R * 0.6); c.stroke();

      // Direction line from base to thumb when active
      if (isActive) {
        c.globalAlpha = 0.5;
        c.strokeStyle = "rgba(163,58,45,0.7)";
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(stick.bx, stick.by); c.lineTo(stick.tx, stick.ty); c.stroke();
      }

      // Auto-aim indicator for right stick when idle but auto-attacking
      if (isRight && !isActive && input.autoAtk) {
        var aimLen = CTRL.STICK_R * 0.5;
        var ax = stick.bx + Math.cos(input.aimAngle) * aimLen;
        var ay = stick.by + Math.sin(input.aimAngle) * aimLen;
        c.globalAlpha = 0.55 + pulse * 0.2;
        c.strokeStyle = "rgba(163,58,45,0.8)";
        c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(stick.bx, stick.by); c.lineTo(ax, ay); c.stroke();
        // Arrow tip
        c.fillStyle = "rgba(163,58,45,0.8)";
        c.beginPath(); c.arc(ax, ay, 4, 0, Math.PI * 2); c.fill();
      }

      // Thumb — stronger contrast when active
      c.globalAlpha = thumbAlpha;
      c.fillStyle = isActive ? "rgba(241,230,212,0.9)" : "rgba(241,230,212,0.55)";
      c.beginPath(); c.arc(stick.tx, stick.ty, CTRL.THUMB_R, 0, Math.PI * 2); c.fill();
      c.strokeStyle = isActive ? "rgba(241,230,212,0.95)" : "rgba(241,230,212,0.6)";
      c.lineWidth = 2;
      c.beginPath(); c.arc(stick.tx, stick.ty, CTRL.THUMB_R, 0, Math.PI * 2); c.stroke();

      // Ink dot in thumb center
      c.globalAlpha = isActive ? 0.9 : 0.5;
      c.fillStyle = "rgba(23,19,16,0.8)";
      c.beginPath(); c.arc(stick.tx, stick.ty, 3, 0, Math.PI * 2); c.fill();

      // Label below base (only when idle)
      if (!isActive) {
        c.globalAlpha = 0.7 + pulse * 0.15;
        c.fillStyle = isRight && input.autoAtk ? "rgba(163,58,45,0.85)" : "rgba(241,230,212,0.85)";
        c.font = '500 14px "STKaiti","KaiTi",serif';
        c.textAlign = "center"; c.textBaseline = "top";
        var displayLabel = isRight && input.autoAtk ? "自动" : label;
        c.fillText(displayLabel, stick.bx, stick.by + CTRL.STICK_R + 8);
      }
      c.globalAlpha = 1;
    }

    // ================================================================
    // 4. AUTO-AIM (per-frame tick called from game.js)
    // ================================================================

    // Per-frame tick: update auto-aim when right stick is idle
    window._tickMobileAutoAim = function() {
      if (!sticks.right.active) {
        _aimReturnDelay = Math.max(0, _aimReturnDelay - 1);
        if (_aimReturnDelay > 0) return; // still in manual→auto transition delay
        var autoAim = nearestAimVector();
        if (autoAim) {
          var targetAngle = Math.atan2(autoAim.dy, autoAim.dx);
          _aimAngleSmooth = lerpAngle(_aimAngleSmooth, targetAngle, PROF.aimSmoothTick);
          input.aimAngle = _aimAngleSmooth;
          input.autoAtk = true;
          input.lastAimMode = "auto";
        } else {
          input.autoAtk = false;
          _lockedTargetId = -1;
          if (input.lastAimMode === "auto") input.lastAimMode = "idle";
        }
      } else {
        // Right stick active — clear lock, set return delay
        _lockedTargetId = -1;
        _aimReturnDelay = PROF.aimReturnDelay;
      }
    };

    // Render hook — called from game.js render()
    window._renderMobileControls = function(c, w, h) {
      c.save();
      pulseT++;

      // Bottom panel — solid dark background for joystick contrast
      var panelTop = h * PROF.panelY;
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

      drawStick(c, sticks.left, "移动", pulse, false);
      drawStick(c, sticks.right, "攻击", pulse, true);
      c.restore();
    };

    // ================================================================
    // 8. LIFECYCLE — reset, visibility, blur, bind events
    // ================================================================

    // Reset all input state
    function resetAllInput(){
      sticks.left.active=false;sticks.left.touchId=null;
      sticks.left.tx=leftBase.x;sticks.left.ty=leftBase.y;
      sticks.right.active=false;sticks.right.touchId=null;
      sticks.right.tx=rightBase.x;sticks.right.ty=rightBase.y;
      input.active=false;input.aimAngle=0;input.dx=0;input.dy=0;input.attacking=false;input.dodging=false;input.dodgeRequest=0;input.leftActive=false;input.rightActive=false;input.lastAimMode="idle";input.autoAtk=false;
      _lockedTargetId=-1;_aimAngleSmooth=0;_aimReturnDelay=0;
    }
    window.MOSUI.platform.mobileControls={needsMobileUI:needsMobileUI,haptic:haptic,resetAllInput:resetAllInput};
    window.MOSUI.profiles.control.mobile={
      stickR:function(){return CTRL.STICK_R},
      thumbR:function(){return CTRL.THUMB_R},
      deadZone:function(){return CTRL.DEAD},
      hitRadius:function(){return CTRL.HIT_R}
    };
    document.addEventListener("visibilitychange",function(){
      if(document.hidden)resetAllInput();
    });
    window.addEventListener("blur",function(){resetAllInput()});

    // Bind to canvas
    if (cvs) {
      cvs.addEventListener("touchstart", handleTouches, { passive: false });
      cvs.addEventListener("touchmove", handleTouches, { passive: false });
      cvs.addEventListener("touchend", handleTouches, { passive: false });
      cvs.addEventListener("touchcancel", handleTouches, { passive: false });
      window.addEventListener("touchstart",function(e){if(!e.target.closest||!e.target.closest('canvas'))return;handleTouches(e)},{passive:false});
      window.addEventListener("touchend",function(e){if(!e.target.closest||!e.target.closest('canvas'))return;handleTouches(e)},{passive:false});
      window.addEventListener("touchcancel",function(e){if(!e.target.closest||!e.target.closest('canvas'))return;handleTouches(e)},{passive:false});
      _log('触控事件已绑定');
    } else {
      _log('错误: 绑定触控时canvas未找到');
    }

    if (window._loadLog) window._loadLog('摇杆就绪 ✓ L('+leftBase.x.toFixed(0)+','+leftBase.y.toFixed(0)+') R('+rightBase.x.toFixed(0)+','+rightBase.y.toFixed(0)+')');
function ensureMobileButtons(){
  // body.is-mobile-ui already controls .mobile-btn display via CSS; no inline override needed
}
ensureMobileButtons();
    return true;
  }

  // Expose for game.js fallback trigger — guarded so desktop web cannot opt in accidentally.
  window.__forceMobileInit = function() {
    if(!needsMobileUI()){if(window._loadLog)window._loadLog('非移动UI环境，拒绝强制摇杆初始化');return false}
    try { return !!initMobileControls(); } catch(e) { if(window._loadLog) window._loadLog('摇杆错误:'+e.message); return false; }
  };

  var shouldInit = needsMobileUI();
  if (window._loadLog) window._loadLog('移动UI检测: enabled='+shouldInit+' ua='+(navigator.userAgent||'').substring(0,40));

  if (shouldInit) {
    initMobileControls();
  } else {
    if(document.body)document.body.classList.remove("is-mobile-ui");
    if (window._loadLog) window._loadLog('网页端保持键鼠/轻触模式');
  }
  // Fallback: force init after 2s only inside APK/debug mobile UI mode.
  setTimeout(function(){if(needsMobileUI()&&!window._mobileInput)initMobileControls()},2000);
})();
