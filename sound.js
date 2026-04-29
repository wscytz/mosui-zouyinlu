// sound.js — Web Audio API synthesized sound effects for ink-wash game
(function () {
  'use strict';

  var ctx = null;
  var masterGain = null;
  var noiseBuffer = null;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    var savedVol=0.6;
    try{var v=parseFloat(localStorage.getItem("mosui_vol"));if(!isNaN(v))savedVol=v}catch(e){}
    masterGain.gain.value = savedVol;
    masterGain.connect(ctx.destination);
    noiseBuffer = createNoiseBuffer();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function createNoiseBuffer() {
    var len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ±5% random pitch variation
  function jitter(base) {
    return base * (1 + (Math.random() - 0.5) * 0.1);
  }

  function now() {
    return ctx.currentTime;
  }

  // Create a gain node with envelope connected to master
  function makeGain(vol) {
    var g = ctx.createGain();
    g.gain.value = vol;
    g.connect(masterGain);
    return g;
  }

  // Auto-disconnect nodes after a duration
  function autoDisconnect(duration, nodes) {
    setTimeout(function () {
      for (var i = 0; i < nodes.length; i++) {
        try { nodes[i].disconnect(); } catch (e) {}
      }
    }, duration * 1000 + 200);
  }

  // --- Sound generators ---

  function playSwordSlash() {
    var t = now();
    var dur = 0.08;
    var osc = ctx.createOscillator();
    var gain = makeGain(0);
    // Distortion via waveshaper
    var dist = ctx.createWaveShaper();
    var curve = new Float32Array(256);
    for (var i = 0; i < 256; i++) {
      var x = (i / 128) - 1;
      curve[i] = (Math.PI + 2) * x / (Math.PI + 2 * Math.abs(x));
    }
    dist.curve = curve;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(jitter(800), t);
    osc.frequency.exponentialRampToValueAtTime(150, t + dur);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(dist);
    dist.connect(gain);
    osc.start(t);
    osc.stop(t + dur);
    autoDisconnect(dur, [osc, gain, dist]);
  }

  function playBrushShot() {
    var t = now();
    var dur = 0.1;
    var osc = ctx.createOscillator();
    var gain = makeGain(0);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(jitter(440), t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + dur);
    autoDisconnect(dur, [osc, gain]);
  }

  function playBellRing() {
    var t = now();
    var dur = 0.3;
    var baseFreq = jitter(320);
    var harmonics = [1, 2.0, 3.0, 4.2, 5.4];
    var allNodes = [];

    harmonics.forEach(function (ratio, idx) {
      var osc = ctx.createOscillator();
      var gain = makeGain(0);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, t);

      var vol = 0.2 / (idx + 1);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur - idx * 0.02);

      osc.connect(gain);
      osc.start(t);
      osc.stop(t + dur);
      allNodes.push(osc, gain);
    });

    autoDisconnect(dur, allNodes);
  }

  function playUmbrellaDash() {
    var t = now();
    var dur = 0.15;
    var allNodes = [];

    // Wind noise
    var noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    var noiseGain = makeGain(0);
    var noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2000;
    noiseFilter.Q.value = 0.5;

    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.15, t + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseSrc.start(t);
    noiseSrc.stop(t + dur);
    allNodes.push(noiseSrc, noiseGain, noiseFilter);

    // Short thump
    var osc = ctx.createOscillator();
    var thumpGain = makeGain(0);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(jitter(100), t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    thumpGain.gain.setValueAtTime(0, t);
    thumpGain.gain.linearRampToValueAtTime(0.3, t + 0.005);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(thumpGain);
    osc.start(t);
    osc.stop(t + dur);
    allNodes.push(osc, thumpGain);

    autoDisconnect(dur, allNodes);
  }

  function playEnemyHit() {
    var t = now();
    var dur = 0.08;
    var osc = ctx.createOscillator();
    var gain = makeGain(0);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(jitter(120), t);
    osc.frequency.exponentialRampToValueAtTime(50, t + dur);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + dur);
    autoDisconnect(dur, [osc, gain]);
  }

  function playEnemyDeath() {
    var t = now();
    var dur = 0.25;
    var allNodes = [];

    // Low freq sweep
    var osc = ctx.createOscillator();
    var oscGain = makeGain(0);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(jitter(180), t);
    osc.frequency.exponentialRampToValueAtTime(30, t + dur);

    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(0.25, t + 0.008);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(oscGain);
    osc.start(t);
    osc.stop(t + dur);
    allNodes.push(osc, oscGain);

    // Noise burst
    var noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    var noiseGain = makeGain(0);
    var noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1200;

    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.2, t + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.7);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseSrc.start(t);
    noiseSrc.stop(t + dur);
    allNodes.push(noiseSrc, noiseGain, noiseFilter);

    autoDisconnect(dur, allNodes);
  }

  function playPlayerHurt() {
    var t = now();
    var dur = 0.12;
    var osc = ctx.createOscillator();
    var gain = makeGain(0);
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(jitter(200), t);
    osc.frequency.exponentialRampToValueAtTime(80, t + dur);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    osc.start(t);
    osc.stop(t + dur);
    autoDisconnect(dur, [osc, gain, filter]);
  }

  function playWaveStart() {
    var t = now();
    var dur = 0.3;
    var osc = ctx.createOscillator();
    var gain = makeGain(0);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(jitter(60), t);
    osc.frequency.exponentialRampToValueAtTime(30, t + dur);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
    gain.gain.setValueAtTime(0.4, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + dur);
    autoDisconnect(dur, [osc, gain]);
  }

  function playRelicPickup() {
    var t = now();
    var dur = 0.2;
    var osc = ctx.createOscillator();
    var gain = makeGain(0);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(jitter(880), t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + dur);
    autoDisconnect(dur, [osc, gain]);
  }

  function playGameOver() {
    var t = now();
    var dur = 0.8;
    var osc = ctx.createOscillator();
    var gain = makeGain(0);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(jitter(130), t);
    osc.frequency.exponentialRampToValueAtTime(50, t + dur);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + dur);
    autoDisconnect(dur, [osc, gain]);
  }

  function playVictory() {
    var t = now();
    var dur = 0.6;
    var baseFreq = jitter(260);
    var ratios = [1, 1.25, 1.5]; // major chord
    var allNodes = [];

    ratios.forEach(function (ratio, idx) {
      var osc = ctx.createOscillator();
      var gain = makeGain(0);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * ratio, t);

      // Staggered entry
      var entry = t + idx * 0.04;
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0, entry);
      gain.gain.linearRampToValueAtTime(0.18, entry + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      osc.start(t);
      osc.stop(t + dur);
      allNodes.push(osc, gain);
    });

    autoDisconnect(dur, allNodes);
  }

  function playChargeReady() {
    if (!ctx) init();
    var t = now();
    var osc = ctx.createOscillator();
    var gain = makeGain(0);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.2);
    autoDisconnect(0.2, [osc, gain]);
  }

  function playShieldBreak() {
    if (!ctx) init(); var t = now();
    var osc = ctx.createOscillator(); var gain = makeGain(0);
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain); osc.start(t); osc.stop(t + 0.15);
    autoDisconnect(0.15, [osc, gain]);
  }

  function playFrostCreate() {
    if (!ctx) init(); var t = now();
    var osc = ctx.createOscillator(); var gain = makeGain(0);
    osc.type = 'sine'; osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.12);
    gain.gain.setValueAtTime(0.06, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain); osc.start(t); osc.stop(t + 0.12);
    autoDisconnect(0.12, [osc, gain]);
  }

  function playSplitPop() {
    if (!ctx) init(); var t = now();
    for (var i = 0; i < 2; i++) {
      var osc = ctx.createOscillator(); var gain = makeGain(0);
      osc.type = 'triangle'; osc.frequency.setValueAtTime(300 + i * 200, t);
      gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain); osc.start(t); osc.stop(t + 0.1);
      autoDisconnect(0.1, [osc, gain]);
    }
  }

  function playSummon() {
    if (!ctx) init(); var t = now();
    var osc = ctx.createOscillator(); var gain = makeGain(0);
    osc.type = 'square'; osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.1);
    gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain); osc.start(t); osc.stop(t + 0.15);
    autoDisconnect(0.15, [osc, gain]);
  }

  function playPlayerDodge() {
    if (!ctx) init(); var t = now();
    var osc = ctx.createOscillator(); var gain = makeGain(0);
    osc.type = 'sine'; osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.06);
    gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain); osc.start(t); osc.stop(t + 0.08);
    autoDisconnect(0.08, [osc, gain]);
  }

  function playBossEnrage() {
    if (!ctx) init(); var t = now();
    for (var i = 0; i < 3; i++) {
      var osc = ctx.createOscillator(); var gain = makeGain(0);
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100 + i * 50, t + i * 0.08);
      gain.gain.setValueAtTime(0, t); gain.gain.setValueAtTime(0.1, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
      osc.connect(gain); osc.start(t); osc.stop(t + 0.4);
      autoDisconnect(0.4, [osc, gain]);
    }
  }

  function playRevive() {
    if (!ctx) init(); var t = now();
    var freqs = [523, 659, 784];
    freqs.forEach(function (f, i) {
      var osc = ctx.createOscillator(); var gain = makeGain(0);
      osc.type = 'triangle'; osc.frequency.setValueAtTime(f, t + i * 0.06);
      gain.gain.setValueAtTime(0, t); gain.gain.setValueAtTime(0.1, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.2);
      osc.connect(gain); osc.start(t); osc.stop(t + 0.4);
      autoDisconnect(0.4, [osc, gain]);
    });
  }

  function playKiteHit() {
    if (!ctx) init(); var t = now();
    var osc = ctx.createOscillator(); var gain = makeGain(0);
    osc.type = 'triangle'; osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.06);
    gain.gain.setValueAtTime(0.07, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain); osc.start(t); osc.stop(t + 0.06);
    autoDisconnect(0.06, [osc, gain]);
  }

  function playWaveClear() {
    if (!ctx) init(); var t = now();
    var freqs = [440, 554, 659];
    freqs.forEach(function (f, i) {
      var osc = ctx.createOscillator(); var gain = makeGain(0);
      osc.type = 'sine'; osc.frequency.setValueAtTime(f, t + i * 0.1);
      gain.gain.setValueAtTime(0, t); gain.gain.setValueAtTime(0.08, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
      osc.connect(gain); osc.start(t); osc.stop(t + 0.5);
      autoDisconnect(0.5, [osc, gain]);
    });
  }

  function playBossIntro() {
    if (!ctx) init(); var t = now();
    // deep rumble
    var rum = ctx.createOscillator(); var rG = makeGain(0);
    rum.type = 'sawtooth'; rum.frequency.setValueAtTime(40, t);
    rG.gain.setValueAtTime(0.12, t); rG.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    rum.connect(rG); rum.start(t); rum.stop(t + 0.8);
    // high ping
    var ping = ctx.createOscillator(); var pG = makeGain(0);
    ping.type = 'sine'; ping.frequency.setValueAtTime(880, t + 0.3);
    ping.frequency.exponentialRampToValueAtTime(440, t + 0.7);
    pG.gain.setValueAtTime(0, t); pG.gain.setValueAtTime(0.06, t + 0.3);
    pG.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    ping.connect(pG); ping.start(t + 0.3); ping.stop(t + 0.8);
    autoDisconnect(0.8, [rum, rG, ping, pG]);
  }

  function playUiBlip() {
    if (!ctx) init(); var t = now();
    var osc = ctx.createOscillator(); var gain = makeGain(0);
    osc.type = 'sine'; osc.frequency.setValueAtTime(660, t);
    gain.gain.setValueAtTime(0.04, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain); osc.start(t); osc.stop(t + 0.06);
    autoDisconnect(0.06, [osc, gain]);
  }

  function playEvoPickup() {
    if (!ctx) init(); var t = now();
    // deep resonant chord — power-up feel
    var freqs = [220, 277.18, 329.63, 440];
    freqs.forEach(function(f, i) {
      var osc = ctx.createOscillator(); var gain = makeGain(0);
      osc.type = i < 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.04);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.12, t + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.35);
      osc.connect(gain); osc.start(t); osc.stop(t + 0.5);
      autoDisconnect(0.5, [osc, gain]);
    });
  }

  // Sound dispatch
  var sounds = {
    swordSlash: playSwordSlash,
    brushShot: playBrushShot,
    bellRing: playBellRing,
    umbrellaDash: playUmbrellaDash,
    enemyHit: playEnemyHit,
    enemyDeath: playEnemyDeath,
    playerHurt: playPlayerHurt,
    waveStart: playWaveStart,
    relicPickup: playRelicPickup,
    gameOver: playGameOver,
    victory: playVictory,
    chargeReady: playChargeReady,
    shieldBreak: playShieldBreak,
    frostCreate: playFrostCreate,
    splitPop: playSplitPop,
    summon: playSummon,
    playerDodge: playPlayerDodge,
    bossEnrage: playBossEnrage,
    revive: playRevive,
    kiteHit: playKiteHit,
    waveClear: playWaveClear,
    bossIntro: playBossIntro,
    uiBlip: playUiBlip,
    evoPickup: playEvoPickup,
    killMilestone: playKillMilestone
  };

  function playKillMilestone() {
    if (!ctx) init(); var t = now();
    var freqs = [523, 659, 784, 1047];
    freqs.forEach(function(f, i) {
      var osc = ctx.createOscillator(); var gain = makeGain(0);
      osc.type = i < 2 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, t + i * 0.06);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.08, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.3);
      osc.connect(gain); osc.start(t); osc.stop(t + 0.5);
      autoDisconnect(0.5, [osc, gain]);
    });
  }

  function play(name) {
    if (!ctx) init();
    if (sounds[name]) sounds[name]();
  }

  function setVolume(v) {
    if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  // Ambient drone: low pad with slow LFO for atmosphere
  var ambientNodes = null;

  var STAGE_AMBIENT = {
    calm:    { freqs: [55, 82.41, 110], types: ['sine','sine','sine'], vol: 0.018, lfo: 0.08, lfoD: 2.5 },
    ash:     { freqs: [65, 98, 130],    types: ['sine','sine','sine'], vol: 0.015, lfo: 0.15, lfoD: 4 },
    well:    { freqs: [44, 66, 88],     types: ['sine','sine','sine'], vol: 0.02, lfo: 0.05, lfoD: 3 },
    mask:    { freqs: [55, 73.42, 110], types: ['sine','sine','sine'], vol: 0.018, lfo: 0.12, lfoD: 5 },
    lantern: { freqs: [73.42, 110, 146.83], types: ['sine','sine','sine'], vol: 0.016, lfo: 0.1, lfoD: 3.5 },
    inkpool: { freqs: [36.71, 55, 73.42], types: ['sine','sine','sine'], vol: 0.022, lfo: 0.04, lfoD: 2 }
  };

  function startAmbient(stage) {
    if (!ctx) init();
    if (ambientNodes) stopAmbient();
    var cfg = STAGE_AMBIENT[stage] || STAGE_AMBIENT.calm;
    var g = ctx.createGain();
    g.gain.value = cfg.vol;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 200; lp.Q.value = 0.7;
    g.connect(lp); lp.connect(masterGain);

    var oscs = [];
    for (var i = 0; i < cfg.freqs.length; i++) {
      var o = ctx.createOscillator();
      o.type = cfg.types[i];
      o.frequency.value = cfg.freqs[i];
      o.connect(g);
      o.start();
      oscs.push(o);
    }
    var lfo = ctx.createOscillator();
    lfo.frequency.value = cfg.lfo;
    var lfoG = ctx.createGain();
    lfoG.gain.value = cfg.lfoD;
    lfo.connect(lfoG);
    lfoG.connect(oscs[0].frequency);
    lfo.start();
    oscs.push(lfo);

    ambientNodes = { oscs: oscs, gain: g };
  }

  function stopAmbient() {
    if (!ambientNodes) return;
    var t = ctx.currentTime;
    ambientNodes.gain.gain.linearRampToValueAtTime(0, t + 0.5);
    var nodes = ambientNodes;
    setTimeout(function () {
      nodes.oscs.forEach(function (o) { try { o.stop(); } catch (e) {} });
      try { nodes.gain.disconnect(); } catch (e) {}
    }, 600);
    ambientNodes = null;
  }

  window.GameSound = {
    init: init,
    play: play,
    setVolume: setVolume,
    startAmbient: startAmbient,
    stopAmbient: stopAmbient
  };
})();
