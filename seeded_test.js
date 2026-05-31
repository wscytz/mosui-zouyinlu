// seeded_test.js — v4.33 种子化确定性长跑测试
// 通过替换 Math.random 为可控 PRNG，验证相同种子下游戏运行确定性。
// 目的：回归保护——未来改动不能无意中让同一种子产出不同结果。

var fs=require('fs');

// Simple mulberry32 PRNG (32-bit seed)
function mulberry32(seed){
  return function(){
    seed|=0; seed=(seed+0x6D2B79F5)|0;
    var t=Math.imul(seed^(seed>>>15),1|seed);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

var dataCode=fs.readFileSync('gamedata.js','utf8');
var code=fs.readFileSync('game.js','utf8');

global.window={_showDebug:false,GameSound:{play:function(){},init:function(){}},addEventListener:function(){}};
global.GameSound=global.window.GameSound;
global.localStorage={getItem:function(){return null},setItem:function(){},removeItem:function(){}};
global.document={getElementById:function(id){
  if(id==='gameCanvas')return{width:960,height:640,
    getContext:function(){return{restore:function(){},save:function(){},translate:function(){},fillRect:function(){},
      fillText:function(){},strokeRect:function(){},beginPath:function(){},arc:function(){},
      fill:function(){},stroke:function(){},moveTo:function(){},lineTo:function(){},
      setLineDash:function(){},closePath:function(){},quadraticCurveTo:function(){},createRadialGradient:function(){return{addColorStop:function(){}}},
      scale:function(){},rotate:function(){},drawImage:function(){},globalAlpha:1,
      fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'left',shadowBlur:0,shadowColor:'',lineCap:'butt'}},
    addEventListener:function(){},focus:function(){},getBoundingClientRect:function(){return{left:0,top:0,width:960,height:640}}};
  return{style:{display:'none'},classList:{add:function(){},remove:function(){}},
    addEventListener:function(){},onclick:null,focus:function(){},offsetWidth:0,
    innerHTML:'',textContent:'',querySelectorAll:function(){return[]},closest:function(){return null}};
},readyState:'complete',addEventListener:function(e,f){f()},createElement:function(t){
  return{tagName:t,width:960,height:640,getContext:function(){return{fillRect:function(){},fillStyle:'',globalAlpha:1,beginPath:function(){},arc:function(){},fill:function(){},stroke:function(){}}}};
}};
global.requestAnimationFrame=function(){};
global.setTimeout=function(f){f()};

(0,eval)(dataCode);
code=code.replace(/^\(function\(\)\{/,'');
code=code.replace(/\}\)\(\);?\s*$/,'');

code+='\n'+[
'var mockCtx={restore:function(){},save:function(){},translate:function(){},fillRect:function(){},',
'fillText:function(){},strokeRect:function(){},beginPath:function(){},arc:function(){},',
'fill:function(){},stroke:function(){},moveTo:function(){},lineTo:function(){},',
'setLineDash:function(){},closePath:function(){},quadraticCurveTo:function(){},createRadialGradient:function(){return{addColorStop:function(){}}},',
'scale:function(){},rotate:function(){},drawImage:function(){},globalAlpha:1,',
'fillStyle:"",strokeStyle:"",lineWidth:1,font:"",textAlign:"left",shadowBlur:0,shadowColor:"",lineCap:"butt"};',
'canvas={width:960,height:640,getContext:function(){return mockCtx},addEventListener:function(){},focus:function(){},',
'getBoundingClientRect:function(){return{left:0,top:0,width:960,height:640}}};',
'ctx=mockCtx;',
'global.__newGame=newGame;global.__startWave=startWave;global.__update=update;global.__pAtk=pAtk;',
'global.__spawnEnemy=spawnEnemy;global.__pickRelicChoices=pickRelicChoices;global.__forceKill=function(g,e){e.hp=0;damageEnemy(g,e,1,"test")};',
'global.__W=W;global.__H=H;'
].join('\n');

(0,eval)(code);

var errors=[];

// Snapshot helper — captures game state in a stable, deterministic way
function snapshot(g){
  return {
    wave: g.wave,
    state: g.state,
    playerHp: g.player.hp,
    playerX: Math.round(g.player.x),
    playerY: Math.round(g.player.y),
    enemiesN: g.enemies.length,
    enemiesAlive: g.enemies.filter(function(e){return e.hp>0}).length,
    particlesN: g.particles.length,
    firesN: g.fires.length,
    attacksN: g.attacks.length,
    eProjN: g.eProj.length,
    kills: g.kills||0,
    soulKills: g.soulKills||0
  };
}

function runSeededGame(weapon,seed,frames){
  Math.random=mulberry32(seed);
  var g=global.__newGame(weapon,'normal');
  global.__startWave(g);
  g.announceT=0;
  g.player.x=global.__W/2;
  g.player.y=global.__H/2;
  for(var i=0;i<frames;i++){
    if(i%20===0)global.__pAtk(g);
    try{global.__update(g)}catch(e){return {error:e.message,frame:i}}
  }
  return snapshot(g);
}

// Test 1: Same seed same weapon → identical snapshot
var weapons=['jian','bi','ling','san','fan'];
var SEED=20260510;

weapons.forEach(function(w){
  var s1=runSeededGame(w,SEED,200);
  var s2=runSeededGame(w,SEED,200);
  if(s1.error){errors.push('seeded '+w+' error: '+s1.error);return}
  if(s2.error){errors.push('seeded '+w+' rerun error: '+s2.error);return}
  var k;
  for(k in s1){
    if(s1[k]!==s2[k])errors.push('seeded '+w+' non-determinism at '+k+': '+s1[k]+' vs '+s2[k]);
  }
});

// Test 2: Different seed → different snapshot (sanity: PRNG actually varies)
var sa=runSeededGame('jian',100,200);
var sb=runSeededGame('jian',200,200);
var hasVariance=false;
for(var k in sa){if(sa[k]!==sb[k]){hasVariance=true;break}}
if(!hasVariance)errors.push('seed variance: different seeds produced identical snapshots (PRNG may not be effective)');

// Test 3: Long run stability — 1800 frames (~30s @60fps) no crash
weapons.forEach(function(w){
  var res=runSeededGame(w,SEED+w.charCodeAt(0),1800);
  if(res.error)errors.push('longrun '+w+': '+res.error);
  else if(res.state==='gameOver'&&res.playerHp>0)errors.push('longrun '+w+': unexpected gameOver with hp>0');
});

if(errors.length){
  console.log('FAIL ('+errors.length+'):');
  errors.forEach(function(e){console.log('  - '+e)});
  process.exit(1);
}else{
  console.log('ALL SEEDED TESTS PASSED');
  console.log('  1. 5 weapons × same seed → identical snapshot');
  console.log('  2. seed variance: different seeds produce different results');
  console.log('  3. 5 weapons × 1800-frame long run no crash');
}
