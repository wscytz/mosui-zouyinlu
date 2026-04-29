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
'  while(safety<500){',
'    safety++;',
'    var before=g.enemies.length;',
'    var target=null;',
'    for(var i=0;i<g.enemies.length;i++){if(g.enemies[i].hp>0){target=g.enemies[i];break}}',
'    if(!target)break;',
'    forceKill(g,target);',
'    // Don\'t call update between kills - just kill them all first',
'  }',
'  // Now run updates for death animations + wave check',
'  for(var w=0;w<90;w++){if(g.state!=="playing")break;update(g)}',
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
'      if(g.enemies.length>0){errors.push(wid+" w"+w+": "+g.enemies.length+" enemies remain after killAll");break}',
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

// Report
'if(errors.length){console.log("FAIL ("+errors.length+"):");errors.forEach(function(e){console.log("  - "+e)});process.exit(1)}',
'else{console.log("ALL 5 TESTS PASSED");',
'  console.log("  1. 4 weapons x full 9-wave run");',
'  console.log("  2. Splitter chain kill");',
'  console.log("  3. Summoner+minion cleanup");',
'  console.log("  4. Shield damage reduction");',
'  console.log("  5. spawnInk parameter check")}',
].join('\n');

eval(code);
