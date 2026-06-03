// stress_test.js — Performance stress test for high-pressure scenarios
// Run: node stress_test.js
// Tests bell AOE spam, fire saturation, ink spirits, splitter chains,
// summoner hordes, combined pressure, and perfMul throttling.

var fs=require('fs');
var dataCode=fs.readFileSync('gamedata.js','utf8');
var utilsCode=fs.readFileSync('game-utils.js','utf8');
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
global.performance={now:function(){return Date.now()}};
global.keys={};
global.mouse={x:480,y:320,down:false};

(0,eval)(dataCode);
(0,eval)(utilsCode);
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

'var errors=[];',

// === Test 1: Bell AOE spam at max combo ===
// Bell with max combo creates large rings; spam attacks for 200 frames
'try{var g1=newGame("ling");startWave(g1);g1.announceT=0;',
'  for(var i=0;i<40;i++)spawnEnemy(g1,"zhikui",{noScale:true});',
'  var p=g1.player;p.comboCount=15;p.comboTimer=100;',
'  p.x=W/2;p.y=H/2;',
'  for(var i=0;i<200;i++){',
'    if(i%28===0)pAtk(g1);',
'    update(g1);',
'  }',
'  if(g1.attacks.length>LIMITS.attacks)errors.push("bell-spam: attacks overflow "+g1.attacks.length);',
'  if(g1.perf.peaks.attacks>LIMITS.attacks)errors.push("bell-spam: peak attacks "+g1.perf.peaks.attacks+" > "+LIMITS.attacks);',
'  if(g1.enemies.length>LIMITS.enemies)errors.push("bell-spam: enemies overflow "+g1.enemies.length);',
'}catch(e){errors.push("bell-spam: "+e.message)}',

// === Test 2: Fire saturation — fireOnKill + fire trail enemies ===
'try{var g2=newGame("jian");startWave(g2);g2.announceT=0;',
'  g2.player.fireOnKill=true;',
'  for(var i=0;i<8;i++)spawnEnemy(g2,"fenling",{noScale:true});',
'  for(var i=0;i<8;i++)spawnEnemy(g2,"yanyong",{noScale:true});',
'  for(var i=0;i<300;i++)update(g2);',
'  var alive=g2.enemies.filter(function(x){return x.hp>0});',
'  for(var i=0;i<alive.length&&i<10;i++){',
'    damageEnemy(g2,alive[i],9999,"hit");}',
'  for(var i=0;i<100;i++)update(g2);',
'  if(g2.fires.length>LIMITS.fires)errors.push("fire-sat: fires overflow "+g2.fires.length);',
'  if(g2.perf.peaks.fires>LIMITS.fires)errors.push("fire-sat: peak fires "+g2.perf.peaks.fires+" > "+LIMITS.fires);',
'}catch(e){errors.push("fire-sat: "+e.message)}',

// === Test 3: Ink spirits at max count ===
'try{var g3=newGame("jian");startWave(g3);g3.announceT=0;',
'  for(var i=0;i<40;i++)spawnEnemy(g3,"zhikui",{noScale:true});',
'  g3.player.inkSpiritCount=LIMITS.inkSpirits;',
'  for(var i=0;i<6;i++){g3.inkSpirits.push({orbitAngle:i*Math.PI/3,orbitR:42,atkTimer:0,atkCd:38,dmg:4,r:8})}',
'  if(g3.inkSpirits.length>LIMITS.inkSpirits)errors.push("spirit: over cap "+g3.inkSpirits.length);',
'  for(var i=0;i<300;i++)update(g3);',
'  if(g3.inkSpirits.length>LIMITS.inkSpirits)errors.push("spirit: cap broken after run "+g3.inkSpirits.length);',
'}catch(e){errors.push("spirit: "+e.message)}',

// === Test 4: Splitter chain explosion ===
'try{var g4=newGame("jian");startWave(g4);g4.announceT=0;',
'  for(var i=0;i<10;i++)spawnEnemy(g4,"fenshen",{noScale:true});',
'  var targets=g4.enemies.slice();',
'  for(var i=0;i<targets.length;i++){if(targets[i].hp>0)damageEnemy(g4,targets[i],9999,"hit");}',
'  for(var i=0;i<50;i++)update(g4);',
'  if(g4.enemies.length>LIMITS.enemies)errors.push("splitter-chain: enemies overflow "+g4.enemies.length);',
'  var aliveCount=g4.enemies.filter(function(x){return x.hp>0}).length;',
'  if(aliveCount<1)errors.push("splitter-chain: all dead, expected splits to survive");',
'}catch(e){errors.push("splitter-chain: "+e.message)}',

// === Test 5: Summoner horde saturation ===
'try{var g5=newGame("jian");startWave(g5);g5.announceT=0;',
'  for(var i=0;i<4;i++)spawnEnemy(g5,"zhikuang",{noScale:true});',
'  for(var i=0;i<400;i++)update(g5);',
'  if(g5.enemies.length>LIMITS.enemies)errors.push("summoner-horde: enemies overflow "+g5.enemies.length);',
'  var minions=g5.enemies.filter(function(x){return x._summonerId});',
'  if(g5.enemies.length<6)errors.push("summoner-horde: too few enemies, expected summons "+g5.enemies.length);',
'}catch(e){errors.push("summoner-horde: "+e.message)}',

// === Test 6: Ranged enemy projectile saturation ===
'try{var g6=newGame("jian");startWave(g6);g6.announceT=0;',
'  for(var i=0;i<20;i++)spawnEnemy(g6,"youhun",{noScale:true});',
'  g6.player.x=W/2;g6.player.y=H/2;',
'  for(var i=0;i<200;i++)update(g6);',
'  if(g6.eProj.length>LIMITS.eProj)errors.push("ranged-sat: eProj overflow "+g6.eProj.length);',
'  if(g6.perf.peaks.eProj>LIMITS.eProj)errors.push("ranged-sat: peak eProj "+g6.perf.peaks.eProj+" > "+LIMITS.eProj);',
'}catch(e){errors.push("ranged-sat: "+e.message)}',

// === Test 7: perfMul throttle verification ===
'try{var g7=newGame("jian");startWave(g7);g7.announceT=0;',
'  for(var i=0;i<LIMITS.particles;i++)pushLimited(g7.particles,{x:0,y:0,life:300,type:"ink"},LIMITS.particles);',
'  var pressure=perfPressure(g7);',
'  if(pressure<0.9)errors.push("perfMul: pressure too low "+pressure+" with full particles");',
'  var mul=perfMul(g7);',
'  if(mul>0.5)errors.push("perfMul: should throttle when near capacity, got mul="+mul);',
'  var pCount=g7.particles.length;',
'  spawnP(g7,100,100,"ink",10);',
'  if(g7.particles.length>LIMITS.particles)errors.push("perfMul: particles exceeded limit after spawnP");',
'}catch(e){errors.push("perfMul: "+e.message)}',

// === Test 8: Combined pressure — all mechanics active ===
'try{var g8=newGame("ling");startWave(g8);g8.announceT=0;',
'  g8.player.fireOnKill=true;',
'  g8.player.soulDmg=8;g8.player.soulChain=true;',
'  g8.player.inkSpiritCount=3;',
'  for(var i=0;i<3;i++){g8.inkSpirits.push({orbitAngle:i*2.1,orbitR:42,atkTimer:0,atkCd:38,dmg:4,r:8})}',
'  for(var i=0;i<6;i++)spawnEnemy(g8,"fenling",{noScale:true});',
'  for(var i=0;i<4;i++)spawnEnemy(g8,"zhikuang",{noScale:true});',
'  for(var i=0;i<4;i++)spawnEnemy(g8,"fenshen",{noScale:true});',
'  for(var i=0;i<6;i++)spawnEnemy(g8,"youhun",{noScale:true});',
'  g8.player.x=W/2;g8.player.y=H/2;',
'  g8.player.comboCount=10;g8.player.comboTimer=999;',
'  for(var i=0;i<600;i++){',
'    if(i%28===0)pAtk(g8);',
'    update(g8);',
'  }',
'  var pOk=g8.particles.length<=LIMITS.particles;',
'  var fOk=g8.fires.length<=LIMITS.fires;',
'  var aOk=g8.attacks.length<=LIMITS.attacks;',
'  var eOk=g8.eProj.length<=LIMITS.eProj;',
'  var nOk=g8.enemies.length<=LIMITS.enemies;',
'  var sOk=g8.inkSpirits.length<=LIMITS.inkSpirits;',
'  if(!pOk)errors.push("combined: particles overflow "+g8.particles.length);',
'  if(!fOk)errors.push("combined: fires overflow "+g8.fires.length);',
'  if(!aOk)errors.push("combined: attacks overflow "+g8.attacks.length);',
'  if(!eOk)errors.push("combined: eProj overflow "+g8.eProj.length);',
'  if(!nOk)errors.push("combined: enemies overflow "+g8.enemies.length);',
'  if(!sOk)errors.push("combined: inkSpirits overflow "+g8.inkSpirits.length);',
'}catch(e){errors.push("combined: "+e.message)}',

// === Test 9: 60s extreme long-run with boss + all enemies ===
'try{var g9=newGame("jian");g9.wave=8;',
'  g9.player.fireOnKill=true;g9.player.soulDmg=8;g9.player.soulChain=true;',
'  g9.player.slowOnHit=0.4;g9.player.ringSlow=true;',
'  g9.player.killAtkSpd=true;g9.player.killSpeed=true;',
'  startWave(g9);g9.announceT=0;',
'  spawnEnemy(g9,"boss",{noScale:true});',
'  for(var i=0;i<20;i++)spawnEnemy(g9,"zhikui",{noScale:true});',
'  for(var i=0;i<10;i++)spawnEnemy(g9,"fenling",{noScale:true});',
'  for(var i=0;i<5;i++)spawnEnemy(g9,"youhun",{noScale:true});',
'  g9.player.x=W/2;g9.player.y=H/2;',
'  var t0=Date.now();',
'  for(var i=0;i<3600;i++){',
'    if(i%16===0)pAtk(g9);',
'    update(g9);',
'    // Spawn reinforcements every 300 frames',
'    if(i%300===0&&i>0){spawnEnemy(g9,"zhikui",{noScale:true});spawnEnemy(g9,"fenling",{noScale:true});}',
'  }',
'  var elapsed=Date.now()-t0;',
'  var lims={particles:LIMITS.particles,fires:LIMITS.fires,attacks:LIMITS.attacks,eProj:LIMITS.eProj,enemies:LIMITS.enemies,inkSpirits:LIMITS.inkSpirits};',
'  var arrays={particles:g9.particles,fires:g9.fires,attacks:g9.attacks,eProj:g9.eProj,enemies:g9.enemies,inkSpirits:g9.inkSpirits};',
'  for(var k in lims){if(arrays[k].length>lims[k])errors.push("longrun: "+k+" overflow "+arrays[k].length+" > "+lims[k]);}',
'  if(elapsed>5000)errors.push("longrun: too slow "+elapsed+"ms for 3600 frames");',
'}catch(e){errors.push("longrun: "+e.message)}',

// === Test 10: Particle budget under continuous combat ===
'try{var g10=newGame("bi");startWave(g10);g10.announceT=0;',
'  g10.player.bounce=true;g10.player.soulDmg=8;',
'  for(var i=0;i<30;i++){spawnEnemy(g10,"zhikui",{noScale:true});var e=g10.enemies[g10.enemies.length-1];',
'    e.x=100+Math.random()*(W-200);e.y=100+Math.random()*(H-200);}',
'  g10.player.x=W/2;g10.player.y=H/2;',
'  for(var i=0;i<500;i++){',
'    if(i%18===0)pAtk(g10);',
'    update(g10);',
'  }',
'  if(g10.perf.peaks.particles>LIMITS.particles)errors.push("particle-budget: peak particles "+g10.perf.peaks.particles+" > "+LIMITS.particles);',
'  if(g10.particles.length>LIMITS.particles)errors.push("particle-budget: current particles overflow "+g10.particles.length);',
'}catch(e){errors.push("particle-budget: "+e.message)}',

// === Test 11: Frame time P99 budget under combined pressure ===
'try{var g11=newGame("ling");g11.wave=5;startWave(g11);g11.announceT=0;',
'  g11.player.fireOnKill=true;g11.player.soulChain=true;g11.player.slowOnHit=0.4;',
'  for(var i=0;i<15;i++)spawnEnemy(g11,"zhikui",{noScale:true});',
'  for(var i=0;i<8;i++)spawnEnemy(g11,"fenling",{noScale:true});',
'  for(var i=0;i<5;i++)spawnEnemy(g11,"moyong",{noScale:true});',
'  g11.player.x=W/2;g11.player.y=H/2;',
'  var times=[];',
'  for(var i=0;i<1200;i++){',
'    if(i%18===0)pAtk(g11);',
'    var t0=process.hrtime.bigint();',
'    update(g11);',
'    var dt=Number(process.hrtime.bigint()-t0)/1e6;',
'    times.push(dt);',
'    if(i%400===0&&i>0)spawnEnemy(g11,"moyong",{noScale:true});',
'  }',
'  times.sort(function(a,b){return a-b});',
'  var p50=times[Math.floor(times.length*0.5)];',
'  var p95=times[Math.floor(times.length*0.95)];',
'  var p99=times[Math.floor(times.length*0.99)];',
'  var avg=times.reduce(function(a,b){return a+b},0)/times.length;',
'  // budgets: avg < 3ms, p95 < 8ms, p99 < 16ms (60fps = 16.7ms frame budget)',
'  if(avg>3)errors.push("frametime: avg="+avg.toFixed(2)+"ms > 3ms budget");',
'  if(p95>8)errors.push("frametime: p95="+p95.toFixed(2)+"ms > 8ms budget");',
'  if(p99>16)errors.push("frametime: p99="+p99.toFixed(2)+"ms > 16ms budget");',
'  console.log("  frame timing: avg="+avg.toFixed(2)+"ms p50="+p50.toFixed(2)+"ms p95="+p95.toFixed(2)+"ms p99="+p99.toFixed(2)+"ms");',
'}catch(e){errors.push("frametime: "+e.message)}',

'if(errors.length===0){',
'  console.log("ALL 11 STRESS TESTS PASSED");',
'  console.log("  1. Bell AOE spam at max combo");',
'  console.log("  2. Fire saturation (fireOnKill + fire trails)");',
'  console.log("  3. Ink spirits at max count");',
'  console.log("  4. Splitter chain explosion");',
'  console.log("  5. Summoner horde saturation");',
'  console.log("  6. Ranged enemy projectile saturation");',
'  console.log("  7. perfMul throttle verification");',
'  console.log("  8. Combined pressure (all mechanics)");',
'  console.log("  9. 60s extreme long-run (boss + mobs)");',
'  console.log("  10. Particle budget (ranged + bounce)");',
'  console.log("  11. Frame time P99 budget (60fps target)");',
'}else{',
'  console.log("FAILURES ("+errors.length+"):");',
'  errors.forEach(function(e,i){console.log("  "+(i+1)+". "+e)});',
'  process.exit(1);',
'}',

].join('\n');

(0,eval)(code);
