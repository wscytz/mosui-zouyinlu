// wave_test.js — comprehensive wave progression test
var fs=require('fs');
var dataCode=fs.readFileSync('gamedata.js','utf8');
var code=fs.readFileSync('game.js','utf8');
var mkCtx=function(){return{restore:function(){},save:function(){},translate:function(){},fillRect:function(){},fillText:function(){},strokeRect:function(){},beginPath:function(){},arc:function(){},fill:function(){},stroke:function(){},moveTo:function(){},lineTo:function(){},setLineDash:function(){},closePath:function(){},createRadialGradient:function(){return{addColorStop:function(){}}},scale:function(){},rotate:function(){},drawImage:function(){},globalAlpha:1,fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'left',shadowBlur:0,shadowColor:'',lineCap:'butt'}};
global.window={_showDebug:false,GameSound:{play:function(){},init:function(){}},addEventListener:function(){}};
global.GameSound=global.window.GameSound;
global.document={getElementById:function(id){
  if(id==='gameCanvas')return{width:960,height:640,getContext:function(){return mkCtx()},addEventListener:function(){},focus:function(){},getBoundingClientRect:function(){return{left:0,top:0,width:960,height:640}}};
  return{style:{display:'none'},classList:{add:function(){},remove:function(){}},addEventListener:function(){},onclick:null,focus:function(){},offsetWidth:0,innerHTML:'',textContent:'',querySelectorAll:function(){return[]},closest:function(){return null}};
},readyState:'complete',addEventListener:function(e,f){f()},createElement:function(t){return{tagName:t,width:960,height:640,getContext:function(){return mkCtx()}}}};
global.requestAnimationFrame=function(){};
global.setTimeout=function(f){f()};
global.performance={now:function(){return Date.now()}};
global.keys={};
global.mouse={x:480,y:320,down:false};
global.fs=fs;

(0,eval)(dataCode);
code=code.replace(/^\(function\(\)\{/,'');
code=code.replace(/\}\)\(\);?\s*$/,'');

code+=[
'var errors=[];',

// Direct kill: use damageEnemy directly, guaranteed overkill
'function forceKill(g,e){',
'  if(e.hp<=0)return;',
'  var dmg=e.hp+(e.shield||0)+9999;',
'  damageEnemy(g,e,dmg,"test");',
'}',

// Kill all living enemies, then wait for death animations
'function killAll(g){',
'  var safety=0;',
'  // Phase 1: kill while still playing (handles moyong→morui death spawns)',
'  while(safety<900&&g.state==="playing"){',
'    safety++;',
'    var killed=false;',
'    for(var i=0;i<g.enemies.length;i++){',
'      if(g.enemies[i].hp>0){forceKill(g,g.enemies[i]);killed=true}',
'    }',
'    update(g);',
'    if(!killed){',
'      var alive=false;',
'      for(var j=0;j<g.enemies.length;j++){if(g.enemies[j].hp>0){alive=true;break}}',
'      if(!alive&&g.state!=="playing")break;',
'    }',
'  }',
'  // Phase 2: drain any alive enemies that may have spawned after state change',
'  var phase2=0;',
'  while(phase2<60){',
'    phase2++;',
'    var anyAlive=false;',
'    for(var k=0;k<g.enemies.length;k++){',
'      if(g.enemies[k].hp>0){forceKill(g,g.enemies[k]);anyAlive=true}',
'    }',
'    update(g);',
'    if(!anyAlive)break;',
'  }',
'}',

'function advanceWave(g){',
'  if(g.state!=="waveClear")return false;',
'  var isEvo=(g.wave===3||g.wave===6);',
'  if(isEvo){',
'    var pool=(EVOLUTIONS[g.weapon.type]||[]).filter(function(e){return !g.evolution||e.id!==g.evolution.id});',
'    if(pool.length>0){var item=pool[0];if(!g.evolution)g.evolution=item;else g.evolution2=item}',
'    else{errors.push("wave"+g.wave+": no evo pool");return false}',
'  }else{',
'    var ch=pickRelicChoices(g);',
'    if(ch.length===0){errors.push("wave"+g.wave+": no relic choices");return false}',
'    g.relics.push(ch[0]);ch[0].fn(g.player);',
'  }',
'  g.state="playing";',
'  return true;',
'}',

// TEST 1: Full 9-wave run x 4 weapons
'["jian","bi","ling","san"].forEach(function(wid){',
'  try{',
'    var g=newGame(wid);',
'    for(var w=0;w<WAVES.length;w++){',
'      startWave(g);g.announceT=0;',
'      for(var i=0;i<20;i++)update(g);',
'      killAll(g);',
'      if(g.state==="victory"){break}',
'      if(g.state!=="waveClear"){',
'        errors.push(wid+" w"+w+": state="+g.state+" enemies="+g.enemies.length+" wave="+g.wave);',
'        g.enemies.forEach(function(e,i){if(e.hp>0)errors.push("  alive["+i+"]: type="+e.type+" hp="+e.hp)});',
'        break}',
'      if(g.enemies.length>0){var aliveN=0;g.enemies.forEach(function(e){if(e.hp>0)aliveN++});if(aliveN>0){errors.push(wid+" w"+w+": "+aliveN+" alive enemies remain after killAll");break}}',
'      if(!advanceWave(g)){break}',
'    }',
'  }catch(e){errors.push(wid+" crash: "+e.message)}',
'});',

// TEST 2: Splitter
'try{',
'  var g2=newGame("jian");startWave(g2);g2.announceT=0;',
'  spawnEnemy(g2,"fenshen");',
'  var sp=null;for(var i=0;i<g2.enemies.length;i++){if(g2.enemies[i].splitter&&!g2.enemies[i].isSplit){sp=g2.enemies[i];break}}',
'  if(sp){',
'    forceKill(g2,sp);',
'    for(var i=0;i<3;i++)update(g2);',
'    var splits=0;g2.enemies.forEach(function(e){if(e.isSplit&&e.hp>0)splits++});',
'    if(splits!==2)errors.push("splitter: expected 2 splits got "+splits);',
'    killAll(g2);',
'  }',
'}catch(e){errors.push("splitter: "+e.message)}',

// TEST 3: Summoner
'try{',
'  var g3=newGame("ling");startWave(g3);g3.announceT=0;',
'  spawnEnemy(g3,"zhikuang");',
'  var sum=null;for(var i=0;i<g3.enemies.length;i++){if(g3.enemies[i].summoner){sum=g3.enemies[i];break}}',
'  if(sum){',
'    for(var i=0;i<130;i++)update(g3);',
'    var minions=0;g3.enemies.forEach(function(e){if(e._summonerId===sum.id&&e.hp>0)minions++});',
'    if(minions<1)errors.push("summoner: no minions after 130 frames");',
'    forceKill(g3,sum);',
'    for(var i=0;i<3;i++)update(g3);',
'    var alive=0;g3.enemies.forEach(function(e){if(e._summonerId===sum.id&&e.hp>0)alive++});',
'    if(alive>0)errors.push("summoner: "+alive+" minions alive after kill");',
'  }',
'}catch(e){errors.push("summoner: "+e.message)}',

// TEST 4: Shield halves damage
'try{',
'  var g4=newGame("jian");startWave(g4);g4.announceT=0;',
'  spawnEnemy(g4,"modun");',
'  var se=null;for(var i=0;i<g4.enemies.length;i++){if(g4.enemies[i].hasShield&&g4.enemies[i].shield>0){se=g4.enemies[i];break}}',
'  if(se){',
'    var origHp=se.hp;var origShield=se.shield;',
'    damageEnemy(g4,se,10,"test");',
'    if(se.hp!==origHp-5)errors.push("shield: hp "+origHp+"->"+se.hp+" expected "+(origHp-5));',
'    if(se.shield!==origShield-5)errors.push("shield: shield "+origShield+"->"+se.shield+" expected "+(origShield-5));',
'  }',
'}catch(e){errors.push("shield: "+e.message)}',

// TEST 5: spawnInk parameter check
'var src2=fs.readFileSync("game.js","utf8");',
'var bad=src2.match(/spawnInk\\([^g,]/g);',
'if(bad)errors.push("spawnInk missing g param: "+bad.length+": "+JSON.stringify(bad));',

// TEST 6: Boss clone (画皮分身) — desperate triggers 2 clones
'var g6=newGame("jian","normal");',
'g6.bossType="boss";',
'spawnEnemy(g6,"boss",{x:480,y:320});',
'var theBoss=g6.enemies[g6.enemies.length-1];',
'theBoss.hp=Math.floor(theBoss.maxHp*0.2);',
'var beforeCount=g6.enemies.length;',
'for(var u6=0;u6<60;u6++)update(g6);',
'var clones=g6.enemies.filter(function(e){return e.isClone});',
'if(clones.length<2)errors.push("boss clone: expected >=2 clones, got "+clones.length);',
'else{',
'  if(clones[0].isBoss)errors.push("boss clone: clone should not be isBoss");',
'  if(clones[0].hp>60)errors.push("boss clone: clone HP too high: "+clones[0].hp);',
'}',

// Report
'if(errors.length){console.log("FAIL ("+errors.length+"):");errors.forEach(function(e){console.log("  - "+e)});process.exit(1)}',
'else{console.log("ALL 6 TESTS PASSED");',
'  console.log("  1. 4 weapons x full 9-wave run");',
'  console.log("  2. Splitter chain kill");',
'  console.log("  3. Summoner+minion cleanup");',
'  console.log("  4. Shield damage reduction");',
'  console.log("  5. spawnInk parameter check");',
'  console.log("  6. Boss clone (画皮分身)")}',
].join('\n');

eval(code);
