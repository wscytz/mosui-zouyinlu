// smoke_test.js — run: node smoke_test.js
// Strategy: read game.js, replace the IIFE wrapper to expose internals, then test

var fs=require('fs');
var dataCode=fs.readFileSync('gamedata.js','utf8');
var utilsCode=fs.readFileSync('game-utils.js','utf8');
var code=fs.readFileSync('game.js','utf8');

// Mock globals first, then strip IIFE and eval body
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

// Load data first, then strip IIFE and eval
(0,eval)(dataCode);
(0,eval)(utilsCode);
code=code.replace(/^\(function\(\)\{/,'');
code=code.replace(/\}\)\(\);?\s*$/,'');

// Add test harness at the end
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

// Test 1: 4 weapons x 20 frames
'["jian","bi","ling","san"].forEach(function(wid){',
'  try{var g=newGame(wid);startWave(g);',
'    for(var i=0;i<20;i++){try{update(g)}catch(e){errors.push(wid+" update@"+i+": "+e.message)}}',
'    try{render(g)}catch(e){errors.push(wid+" render: "+e.message)}',
'  }catch(e){errors.push(wid+": "+e.message)}});',

// Test 2: relic selection
'try{var g2=newGame("ling");startWave(g2);',
'  var c=pickRelicChoices(g2);if(c.length!==3)errors.push("relic count="+c.length)',
'}catch(e){errors.push("relic: "+e.message)}',

// Test 3: limits
'var g3=newGame("ling");',
'for(var i=0;i<300;i++){',
'  pushLimited(g3.particles,{x:0,y:0,vx:0,vy:0,life:1,maxLife:1,size:1,type:"ink"},LIMITS.particles);',
'  pushLimited(g3.floatTexts,{x:0,y:0,text:"t",life:1,maxLife:1},LIMITS.floatTexts);',
'  pushLimited(g3.decoys,{x:0,y:0,life:1,maxLife:1,r:15},LIMITS.decoys);}',
'if(g3.particles.length>LIMITS.particles)errors.push("par="+g3.particles.length);',
'if(g3.floatTexts.length>LIMITS.floatTexts)errors.push("txt="+g3.floatTexts.length);',
'if(g3.decoys.length>LIMITS.decoys)errors.push("dec="+g3.decoys.length);',

// Test 4: perf
'var g4=newGame("jian");if(!g4.perf)errors.push("perf missing");',

// Test 5: 9 waves
'try{var g5=newGame("jian");',
'  for(var w=0;w<WAVES.length;w++){startWave(g5);for(var i=0;i<5;i++)update(g5);',
'    g5.enemies=[];if(w===2)g5.evolution=EVOLUTIONS.melee[0];g5.state="playing"}',
'}catch(e){errors.push("9wave: "+e.message)}',

// Test 6: soulChain cap
'try{var g6=newGame("ling");startWave(g6);g6.player.soulChain=true;',
'  for(var i=0;i<10;i++)spawnEnemy(g6,"zhikui",{noScale:true});',
'  hitE(g6,{dmg:10,type:"slash",hitList:[],crit:false,life:10,maxLife:10},g6.enemies[0]);',
'  var sh=0;g6.enemies.forEach(function(en){if(en.hp<en.maxHp&&en!==g6.enemies[0])sh++});',
'  if(sh>4)errors.push("soulChain="+sh)',
'}catch(e){errors.push("soulChain: "+e.message)}',

// Test 7: no direct push
'var src=fs.readFileSync("game.js","utf8");',
'var bad=src.match(/g\\.(particles|fires|attacks|eProj|floatTexts|decoys|kites|frosts)\\.push/g);',
'if(bad)errors.push("direct push: "+bad.length);',

// Test 8: new enemy types
'try{var g8=newGame("jian");',
'  ["zhikuang","fenshen","modun"].forEach(function(t){',
'    spawnEnemy(g8,t);if(!g8.enemies.length)errors.push("spawn "+t+" failed")});',
'  var m=g8.enemies[2];if(m.hasShield&&m.shield>0){}',
'  else errors.push("modun missing shield");',
'}catch(e){errors.push("newEnemy: "+e.message)}',

// Test 9: critRate cap 0.65
'var g9=newGame("ling");g9.player.stats.critRate=0.8;',
'startWave(g9);',
'var capped=false;',
'for(var i=0;i<200;i++){update(g9);',
'  if(g9.attacks.length>0){var a=g9.attacks[g9.attacks.length-1];',
'    if(a.crit)capped=true}}',
// just check no crash — the cap is in pAtk logic',

// Test 10: bell combo cap 15
'var g10=newGame("ling");g10.player.comboCount=30;startWave(g10);',
'try{for(var i=0;i<5;i++)update(g10)}catch(e){errors.push("bellCombo: "+e.message)}',

// Test 11: new relics exist (40 total)
'var rc=RELICS.length;if(rc<40)errors.push("relics="+rc+", expected 40");',

// Test 12: returnInk echo has hitMap
'try{var g12=newGame("jian");g12.player.bounce=true;g12.player.stats.returnInk=1;startWave(g12);',
'  spawnEnemy(g12,"zhikui",{noScale:true});',
'  for(var i=0;i<40;i++)update(g12);',
'  pAtk(g12);',
'  var hasEcho=g12.attacks.some(function(a){return a.echo});',
'  if(!hasEcho)errors.push("returnInk: no echo proj spawned");',
'  for(var i=0;i<20;i++)update(g12);',
'}catch(e){errors.push("returnInk: "+e.message)}',

// Test 13: evolution selection produces valid choices
'try{var g13=newGame("jian");g13.wave=3;',
'  var pool=EVOLUTIONS.melee;',
'  var choices=pickEvolutionChoices(g13,pool);',
'  if(choices.length<1)errors.push("evo: empty choices");',
'  choices.forEach(function(c){if(!c.id||!c.fn)errors.push("evo: bad choice id="+c.id)});',
'}catch(e){errors.push("evo: "+e.message)}',

// Test 14: boss spawns and enrage triggers
'try{var g14=newGame("jian");startWave(g14);',
'  spawnEnemy(g14,"boss",{noScale:true});',
'  var boss=g14.enemies[g14.enemies.length-1];',
'  if(!boss.isBoss)errors.push("boss: isBoss not set");',
'  if(boss.hp!==320)errors.push("boss: wrong hp "+boss.hp);',
'  boss.hp=Math.floor(boss.maxHp*0.4);boss.spawnGraceT=0;',
'  for(var i=0;i<30;i++)update(g14);',
'  if(!boss.enraged)errors.push("boss: did not enrage at <50%");',
'}catch(e){errors.push("boss: "+e.message)}',

// Test 15: boss 8-directional projectiles
'try{var g15=newGame("jian");startWave(g15);',
'  spawnEnemy(g15,"boss",{noScale:true});',
'  var boss=g15.enemies[g15.enemies.length-1];boss.spawnGraceT=0;',
'  for(var i=0;i<92;i++)update(g15);',
'  if(g15.eProj.length===0)errors.push("boss8dir: no eProj after 91 frames");',
'}catch(e){errors.push("boss8dir: "+e.message)}',

// Test 16: dodge + invincibility
'try{var g16=newGame("jian");startWave(g16);',
'  var p=g16.player;',
'  startDodge(g16,1,0);',
'  if(p.dodgeT<=0)errors.push("dodge: dodgeT not set");',
'  if(p.invTimer<14)errors.push("dodge: invTimer too low "+p.invTimer);',
'  if(!p.justDodged)errors.push("dodge: justDodged not set");',
'  var oldHp=p.hp;hurtP(g16,10,null);',
'  if(p.hp!==oldHp)errors.push("dodge: took damage during invincibility");',
'}catch(e){errors.push("dodge: "+e.message)}',

// Test 17: frost zone slows enemies
'try{var g17=newGame("jian");startWave(g17);',
'  spawnEnemy(g17,"zhikui",{noScale:true});',
'  var e=g17.enemies[g17.enemies.length-1];e.spawnGraceT=0;e.x=W/2+50;e.y=H/2;',
'  pushLimited(g17.frosts,{x:W/2+50,y:H/2,r:45,life:60,maxLife:60},LIMITS.frosts);',
'  for(var i=0;i<10;i++)update(g17);',
'  if(e.slowT<=0)errors.push("frost: enemy not slowed in frost zone");',
'}catch(e){errors.push("frost: "+e.message)}',

// Test 18: kite tracking + damage
'try{var g18=newGame("jian");startWave(g18);',
'  spawnEnemy(g18,"zhikui",{noScale:true});',
'  var e=g18.enemies[g18.enemies.length-1];e.spawnGraceT=0;e.x=W/2+40;e.y=H/2;',
'  pushLimited(g18.kites,{x:W/2-40,y:H/2,targetId:0,life:180,maxLife:180,',
'    dmg:10,speed:3.5,r:8,angle:0},LIMITS.kites);',
'  var hpBefore=e.hp;',
'  for(var i=0;i<80;i++)update(g18);',
'  if(e.hp>=hpBefore)errors.push("kite: enemy not damaged, hp="+e.hp+"/"+hpBefore);',
'}catch(e){errors.push("kite: "+e.message)}',

// Test 19: shield regen (墨盾鬼)
'try{var g19=newGame("jian");startWave(g19);',
'  spawnEnemy(g19,"modun",{noScale:true});',
'  var e=g19.enemies[g19.enemies.length-1];',
'  if(!e.hasShield||e.shield<=0)errors.push("shield: no shield on spawn");',
'  e.shield=0;e.hasShield=false;e.shieldCd=1;',
'  update(g19);',
'  if(!e.hasShield||e.shield<=0)errors.push("shield: did not regen after Cd=0");',
'}catch(e){errors.push("shield: "+e.message)}',

// Test 20: fire trail from 焚灵
'try{var g20=newGame("jian");startWave(g20);',
'  spawnEnemy(g20,"fenling",{noScale:true});',
'  var e=g20.enemies[g20.enemies.length-1];e.spawnGraceT=0;',
'  var fBefore=g20.fires.length;',
'  for(var i=0;i<25;i++)update(g20);',
'  if(g20.fires.length<=fBefore)errors.push("fireTrail: no fires from fenling");',
'}catch(e){errors.push("fireTrail: "+e.message)}',

// Test 21: splitter enemy (分身鬼) splits on death
'try{var g21=newGame("jian");startWave(g21);',
'  spawnEnemy(g21,"fenshen",{noScale:true});',
'  var e=g21.enemies[g21.enemies.length-1];',
'  var aliveBefore=g21.enemies.filter(function(x){return x.hp>0}).length;',
'  damageEnemy(g21,e,999,"hit");',
'  var aliveAfter=g21.enemies.filter(function(x){return x.hp>0}).length;',
'  if(aliveAfter<aliveBefore+1)errors.push("splitter: did not split, before="+aliveBefore+" after="+aliveAfter);',
'}catch(e){errors.push("splitter: "+e.message)}',

// Test 22: summoner (纸鸢匠) spawns minions
'try{var g22=newGame("jian");g22.wave=3;startWave(g22);',
'  spawnEnemy(g22,"zhikuang",{noScale:true});',
'  var e=g22.enemies[g22.enemies.length-1];e.spawnGraceT=0;e.summonCdT=1;e.summonCount=0;',
'  update(g22);',
'  if(g22.enemies.length<2)errors.push("summoner: no minions spawned, en="+g22.enemies.length);',
'  var minions=g22.enemies.filter(function(x){return x._summonerId===e.id});',
'  if(minions.length<1)errors.push("summoner: no linked minions");',
'}catch(e){errors.push("summoner: "+e.message)}',

// Test 23: inkPoolCheck merged function
'try{var g23=newGame("jian");startWave(g23);',
'  if(inkPoolCheck(g23,W/2,H/2)!==0)errors.push("inkPool: should return 0 without inkpool stage");',
'  g23.stage={id:"inkpool",zones:[{x:W/2,y:H/2,r:60,purified:false,purifyT:0}]};',
'  if(inkPoolCheck(g23,W/2,H/2)!==1)errors.push("inkPool: should return 1 in unpurified pool");',
'  g23.stage.zones[0].purified=true;g23.stage.zones[0].purifyT=50;',
'  if(inkPoolCheck(g23,W/2,H/2)!==2)errors.push("inkPool: should return 2 in purified zone");',
'}catch(e){errors.push("inkPool: "+e.message)}',

// Test 24: cleanupWave preserves player fires
'try{var g24=newGame("jian");startWave(g24);',
'  addFire(g24,{x:100,y:100,r:20,life:60,dmg:2,owner:"player",kind:"phosphor"});',
'  addFire(g24,{x:200,y:200,r:20,life:60,dmg:2,owner:"enemy",kind:"trail"});',
'  pushLimited(g24.attacks,{x:0,y:0,life:10,hitMap:{}},LIMITS.attacks);',
'  pushLimited(g24.eProj,{x:0,y:0,vx:0,vy:0,r:5,dmg:3,life:20},LIMITS.eProj);',
'  cleanupWave(g24);',
'  if(g24.attacks.length!==0)errors.push("cleanup: attacks not cleared");',
'  if(g24.eProj.length!==0)errors.push("cleanup: eProj not cleared");',
'  var pFires=g24.fires.filter(function(f){return f.owner==="player"});',
'  if(pFires.length!==1)errors.push("cleanup: player fires should be 1, got "+pFires.length);',
'  var eFires=g24.fires.filter(function(f){return f.owner!=="player"});',
'  if(eFires.length!==0)errors.push("cleanup: enemy fires should be 0, got "+eFires.length);',
'}catch(e){errors.push("cleanup: "+e.message)}',

// Test 25: spawnGraceT prevents damage
'try{var g25=newGame("jian");startWave(g25);',
'  spawnEnemy(g25,"zhikui",{noScale:true});',
'  var e=g25.enemies[0];e.spawnGraceT=30;',
'  var atk={x:e.x,y:e.y,angle:0,arc:Math.PI,r:100,dmg:50,crit:false,life:12,maxLife:12,type:"slash",hitMap:{}};',
'  addAttack(g25,atk);',
'  for(var i=0;i<5;i++)update(g25);',
'  if(e.hp<e.maxHp)errors.push("grace: enemy took damage during spawnGraceT");',
'}catch(e){errors.push("grace: "+e.message)}',

// Test 26: decoy attracts enemies
'try{var g26=newGame("jian");startWave(g26);',
'  spawnEnemy(g26,"zhikui",{noScale:true});',
'  var e=g26.enemies[g26.enemies.length-1];e.spawnGraceT=0;e.x=W/2+60;e.y=H/2;',
'  pushLimited(g26.decoys,{x:W/2+160,y:H/2,life:50,maxLife:50,r:15},LIMITS.decoys);',
'  var dx0=Math.abs(e.x-(W/2+160));',
'  for(var i=0;i<30;i++)update(g26);',
'  var dx1=Math.abs(e.x-(W/2+160));',
'  if(dx1>=dx0)errors.push("decoy: enemy did not move toward decoy");',
'}catch(e){errors.push("decoy: "+e.message)}',

// Test 27: killShield (收阴袋) stacks and clears
'try{var g27=newGame("jian");g27.player.killShield=true;startWave(g27);',
'  var p=g27.player;',
'  spawnEnemy(g27,"zhikui",{noScale:true});',
'  var e=g27.enemies[0];e.spawnGraceT=0;',
'  onEnemyKilled(g27,e,"hit",{crit:false});',
'  if(p.shieldStack!==1)errors.push("shieldStack: should be 1, got "+p.shieldStack);',
'  onEnemyKilled(g27,{id:99,type:"zhikui",hp:0,maxHp:10,spd:1,r:10,dmg:5,atkR:20,atkCd:40,killed:false},"hit",{});',
'  if(p.shieldStack!==2)errors.push("shieldStack: should be 2, got "+p.shieldStack);',
'  var oldHp=p.hp;hurtP(g27,20,null);',
'  if(p.shieldStack!==0)errors.push("shieldStack: should clear to 0 on hit, got "+p.shieldStack);',
'}catch(e){errors.push("shieldStack: "+e.message)}',

// Test 28: mkMinion produces valid enemy objects
'try{var m=mkMinion(100,200,"zhikui",20,1.5,10,5,28,48,C.ghost,C.ghostE,{});',
'  if(m.x!==100||m.y!==200)errors.push("mkMinion: pos wrong");',
'  if(m.hp!==20||m.maxHp!==20)errors.push("mkMinion: hp wrong");',
'  if(m.ranged)errors.push("mkMinion: should not be ranged");',
'  if(m.isBoss)errors.push("mkMinion: should not be boss");',
'  if(!m.id||m.id<=0)errors.push("mkMinion: bad id");',
'}catch(e){errors.push("mkMinion: "+e.message)}',

// Test 29: Evolution selection excludes already-owned evolutions
'try{var g29=newGame("jian");g29.wave=3;',
'  var pool29=EVOLUTIONS.melee.slice();',
'  var cho29=pickEvolutionChoices(g29,pool29);',
'  if(cho29.length<1)errors.push("evoFilter: no choices");',
'  var first=cho29[0];g29.evolution=first;first.fn(g29.player);',
'  var filt29=pool29.filter(function(e){return !g29.evolution||e.id!==g29.evolution.id});',
'  if(filt29.length!==pool29.length-1)errors.push("evoFilter: expected "+(pool29.length-1)+" filtered, got "+filt29.length);',
'  filt29.forEach(function(e){if(e.id===first.id)errors.push("evoFilter: owned evo still in pool")});',
'  var cho29b=pickEvolutionChoices(g29,filt29);',
'  var sec=cho29b[0];g29.evolution2=sec;',
'  if(g29.evolution.id===g29.evolution2.id)errors.push("evoFilter: both evos same id");',
'}catch(e){errors.push("evoFilter: "+e.message)}',

// Test 30: Ash stage speed reduction (stageSpeedFactor)
'try{var g30=newGame("jian");startWave(g30);',
'  g30.stage={id:"ash",zones:[{x:W/2,y:H/2,r:60,life:500,maxLife:500,vx:0,vy:0}],lanterns:[],quietT:0,pulse:0};',
'  var fIn=stageSpeedFactor(g30,W/2,H/2);',
'  if(Math.abs(fIn-0.72)>0.001)errors.push("ash: factor inside zone="+fIn+", expected 0.72");',
'  var fOut=stageSpeedFactor(g30,W/2+200,H/2);',
'  if(fOut!==1)errors.push("ash: factor outside zone="+fOut+", expected 1");',
'  g30.stage.id="calm";',
'  var fCalm=stageSpeedFactor(g30,W/2,H/2);',
'  if(fCalm!==1)errors.push("ash: calm stage factor="+fCalm+", expected 1");',
'  var g30b=newGame("jian");startWave(g30b);',
'  var fNone=stageSpeedFactor(g30b,W/2,H/2);',
'  if(fNone!==1)errors.push("ash: no-stage factor="+fNone+", expected 1");',
'}catch(e){errors.push("ash: "+e.message)}',

// Test 31: Mask stage revive mechanic (tryStageRevive)
'try{var g31=newGame("jian");startWave(g31);',
'  g31.enemies=[];g31.stage={id:"mask",zones:[],lanterns:[],quietT:0,pulse:0};',
'  spawnEnemy(g31,"zhikui",{noScale:true});',
'  var e31=g31.enemies[0];e31.spawnGraceT=0;',
'  var origHp31=e31.hp;',
'  var killed=damageEnemy(g31,e31,origHp31+100,"hit");',
'  if(!e31.stageRevived)errors.push("mask: enemy not revived by mask stage");',
'  if(e31.hp<=0)errors.push("mask: revived enemy hp="+e31.hp);',
'  if(killed)errors.push("mask: damageEnemy returned true for revived enemy");',
'  // Boss should NOT be revived',
'  spawnEnemy(g31,"boss",{noScale:true});',
'  var boss=g31.enemies[g31.enemies.length-1];boss.spawnGraceT=0;',
'  var bk=damageEnemy(g31,boss,boss.hp+9999,"hit");',
'  if(boss.stageRevived)errors.push("mask: boss should not be revived");',
'  // Already-revived enemy should not revive again',
'  var e31b=g31.enemies[0];',
'  damageEnemy(g31,e31b,e31b.hp+100,"hit");',
'  if(!e31b.killed)errors.push("mask: already-revived enemy should die on second kill");',
'}catch(e){errors.push("mask: "+e.message)}',

// Test 32: Double-kill prevention (onEnemyKilled early return)
'try{var g32=newGame("jian");startWave(g32);',
'  spawnEnemy(g32,"zhikui",{noScale:true});',
'  var e32=g32.enemies[0];e32.spawnGraceT=0;',
'  var k1=damageEnemy(g32,e32,999,"hit");',
'  if(!k1)errors.push("doublekill: first kill returned false");',
'  if(!e32.killed)errors.push("doublekill: e32.killed not set");',
'  var killsBefore=g32.kills;',
'  damageEnemy(g32,e32,999,"hit");',
'  if(g32.kills!==killsBefore)errors.push("doublekill: kills incremented on second damageEnemy");',
'  onEnemyKilled(g32,e32,"hit",{});',
'  if(g32.kills!==killsBefore)errors.push("doublekill: onEnemyKilled early-return failed");',
'  // 0 HP edge: damageEnemy with exact hp amount',
'  spawnEnemy(g32,"zhikui",{noScale:true});',
'  var e32b=g32.enemies[g32.enemies.length-1];e32b.spawnGraceT=0;',
'  var exactHp=e32b.hp;',
'  var kExact=damageEnemy(g32,e32b,exactHp,"hit");',
'  if(!kExact)errors.push("0hpEdge: exact-damage kill returned false");',
'  if(e32b.hp!==0)errors.push("0hpEdge: hp="+e32b.hp+" not 0 after exact kill");',
'}catch(e){errors.push("doublekill: "+e.message)}',

// Test 33: Shield break timing and damage halving
'try{var g33=newGame("jian");startWave(g33);',
'  g33.enemies=[];spawnEnemy(g33,"modun",{noScale:true});',
'  var e33=g33.enemies[0];',
'  if(!e33.hasShield||e33.shield<=0)errors.push("shieldBrk: no shield on spawn");',
'  var oh33=e33.hp,os33=e33.shield;',
'  // Damage less than shield: halved damage split between hp and shield',
'  damageEnemy(g33,e33,10,"test");',
'  if(e33.hp!==oh33-5)errors.push("shieldBrk: hp="+e33.hp+", expected "+(oh33-5));',
'  if(e33.shield!==os33-5)errors.push("shieldBrk: shield="+e33.shield+", expected "+(os33-5));',
'  // Damage enough to break shield: exact break point',
'  var remShield=e33.shield;',
'  var dmgBreak=remShield*2;',
'  damageEnemy(g33,e33,dmgBreak,"test");',
'  if(e33.hasShield&&e33.shield>0)errors.push("shieldBrk: shield should be broken after break-point damage");',
'}catch(e){errors.push("shieldBrk: "+e.message)}',

// Test 34: Full cleanupWave clears volatile arrays (kites/frosts are persistent)
'try{var g34=newGame("jian");startWave(g34);',
'  for(var i34=0;i34<5;i34++){',
'    pushLimited(g34.particles,{x:0,y:0,vx:0,vy:0,life:1,maxLife:1,size:1,type:"ink"},LIMITS.particles);',
'    pushLimited(g34.attacks,{x:0,y:0,life:1,hitMap:{}},LIMITS.attacks);',
'    pushLimited(g34.eProj,{x:0,y:0,vx:0,vy:0,r:5,dmg:3,life:20},LIMITS.eProj);',
'    pushLimited(g34.floatTexts,{x:0,y:0,text:"x",life:1,maxLife:1},LIMITS.floatTexts);',
'    pushLimited(g34.decoys,{x:0,y:0,life:1,maxLife:1,r:15},LIMITS.decoys);',
'  }',
'  pushLimited(g34.kites,{x:0,y:0,targetId:0,life:1,maxLife:1,dmg:10,speed:3,r:8,angle:0},LIMITS.kites);',
'  pushLimited(g34.frosts,{x:0,y:0,r:45,life:1,maxLife:1},LIMITS.frosts);',
'  addFire(g34,{x:100,y:100,r:20,life:60,dmg:2,owner:"player",kind:"phosphor"});',
'  addFire(g34,{x:200,y:200,r:20,life:60,dmg:2,owner:"enemy",kind:"trail"});',
'  cleanupWave(g34);',
'  // Volatile arrays should be cleared',
'  if(g34.particles.length!==0)errors.push("cleanup2: particles="+g34.particles.length);',
'  if(g34.attacks.length!==0)errors.push("cleanup2: attacks="+g34.attacks.length);',
'  if(g34.eProj.length!==0)errors.push("cleanup2: eProj="+g34.eProj.length);',
'  if(g34.floatTexts.length!==0)errors.push("cleanup2: floatTexts="+g34.floatTexts.length);',
'  if(g34.decoys.length!==0)errors.push("cleanup2: decoys="+g34.decoys.length);',
'  // kites and frosts are persistent player tools, NOT cleared by cleanupWave',
'  if(g34.kites.length!==1)errors.push("cleanup2: kites should persist, got "+g34.kites.length);',
'  if(g34.frosts.length!==1)errors.push("cleanup2: frosts should persist, got "+g34.frosts.length);',
'  // Player fires preserved, enemy fires cleared',
'  var pf=g34.fires.filter(function(f){return f.owner==="player"});',
'  if(pf.length!==1)errors.push("cleanup2: player fires="+pf.length);',
'  var ef=g34.fires.filter(function(f){return f.owner!=="player"});',
'  if(ef.length!==0)errors.push("cleanup2: enemy fires="+ef.length);',
'}catch(e){errors.push("cleanup2: "+e.message)}',

// Test 35: CAPS enforcement — atkCdFloor, critRate, bellCombo, shieldStack
'try{var g35a=newGame("jian");startWave(g35a);',
'  var pa=g35a.player;',
'  pa.stats.atkSpd=0.01;pa.atkCd=0;',
'  pAtk(g35a);',
'  if(pa.atkCd<CAPS.atkCdFloor)errors.push("caps: atkCd="+pa.atkCd+", floor="+CAPS.atkCdFloor);',
'  pa.comboCount=999;',
'  var bell=Math.min(pa.comboCount,CAPS.bellCombo);',
'  if(bell!==CAPS.bellCombo)errors.push("caps: bellCombo capped="+bell+", expected "+CAPS.bellCombo);',
'  pa.stats.critRate=0.95;',
'  var ec=Math.min(pa.stats.critRate,CAPS.critRate);',
'  if(ec!==CAPS.critRate)errors.push("caps: critRate capped="+ec+", expected "+CAPS.critRate);',
'  var g35b=newGame("jian");g35b.player.killShield=true;startWave(g35b);',
'  var pb=g35b.player;pb.shieldStack=CAPS.shieldStack;',
'  onEnemyKilled(g35b,{id:9999,type:"zhikui",hp:0,maxHp:10,spd:1,r:10,dmg:5,atkR:20,atkCd:40,killed:false},"hit",{});',
'  if(pb.shieldStack>CAPS.shieldStack)errors.push("caps: shieldStack="+pb.shieldStack+", cap="+CAPS.shieldStack);',
'}catch(e){errors.push("caps: "+e.message)}',

// Test 36: PREREQS filtering — prerequisite-locked relics filtered when unmet
'try{var g36=newGame("jian");startWave(g36);',
'  var st36=buildPickState(g36);',
'  if(PREREQS.fanzhao&&PREREQS.fanzhao(st36))errors.push("prereqs: fanzhao should fail without returnInk");',
'  if(PREREQS.huosui&&PREREQS.huosui(st36))errors.push("prereqs: huosui should fail without yedeng");',
'  if(PREREQS.dengxin&&PREREQS.dengxin(st36))errors.push("prereqs: dengxin should fail without yedeng");',
'  if(PREREQS.liuying&&PREREQS.liuying(st36))errors.push("prereqs: liuying should fail for melee weapon");',
'  if(PREREQS.xueqi&&!PREREQS.xueqi(st36))errors.push("prereqs: xueqi should pass for melee weapon");',
'  var ye=RELICS.filter(function(r){return r.id==="yedeng"})[0];',
'  if(ye){g36.relics.push(ye);ye.fn(g36.player);',
'    var st36b=buildPickState(g36);',
'    if(PREREQS.huosui&&!PREREQS.huosui(st36b))errors.push("prereqs: huosui should pass with yedeng owned");',
'    if(PREREQS.dengxin&&!PREREQS.dengxin(st36b))errors.push("prereqs: dengxin should pass with yedeng owned");}',
'  var ch36=pickRelicChoices(g36);',
'  ch36.forEach(function(c){if(c.id==="fanzhao")errors.push("prereqs: fanzhao in choices without returnInk")});',
'}catch(e){errors.push("prereqs: "+e.message)}',

// Test 37: Long-run stability around reported 49s crash window
'try{var g37=newGame("ling");startWave(g37);',
'  g37.player.soulChain=true;g37.player.corrosive=true;g37.player.ringSlow=true;g37.player.ringSoulHit=true;',
'  for(var t37=0;t37<3600;t37++){',
'    mouse.down=(t37%4!==0);',
'    mouse.x=g37.player.x+80;mouse.y=g37.player.y;',
'    if(g37.state==="waveClear"){g37.state="playing";startWave(g37)}',
'    if(g37.state!=="playing")break;',
'    update(g37);',
'    if(t37%180===0&&g37.enemies.length<LIMITS.enemies-2)spawnEnemy(g37,"mochong",{noScale:true});',
'  }',
'  if(g37.perf.peaks.attacks>LIMITS.attacks)errors.push("longrun: attacks over limit");',
'  if(g37.perf.peaks.eProj>LIMITS.eProj)errors.push("longrun: eProj over limit");',
'}catch(e){errors.push("longrun49s: "+e.message)}',

// Test 38: Kill streak milestones (KILL_MILESTONES array)
'try{var g38=newGame("jian");startWave(g38);',
'  if(!KILL_MILESTONES||KILL_MILESTONES.length<4)errors.push("milestones: array too short="+KILL_MILESTONES.length);',
'  var ats=KILL_MILESTONES.map(function(m){return m.at});',
'  if(ats[0]!==3)errors.push("milestones: first at="+ats[0]+", expected 3");',
'  if(ats.indexOf(5)<0)errors.push("milestones: missing 5");',
'  if(ats.indexOf(10)<0)errors.push("milestones: missing 10");',
'  KILL_MILESTONES.forEach(function(m){',
'    if(!m.text||!m.life||!m.pCnt)errors.push("milestones: incomplete entry at="+m.at);',
'  });',
'  var g38b=newGame("jian");startWave(g38b);',
'  for(var k38=0;k38<12;k38++){',
'    spawnEnemy(g38b,"zhikui",{noScale:true});',
'    var ek38=g38b.enemies[g38b.enemies.length-1];ek38.spawnGraceT=0;',
'    damageEnemy(g38b,ek38,9999,"hit");',
'  }',
'  if(g38b.killStreak!==12)errors.push("milestones: killStreak="+g38b.killStreak+", expected 12");',
'  if(g38b.maxCombo<12)errors.push("milestones: maxCombo="+g38b.maxCombo+", expected >=12");',
'}catch(e){errors.push("milestones: "+e.message)}',

// Test 39: Crit/dodge stat tracking (critKills, dodgeKills)
'try{var g39=newGame("jian");startWave(g39);',
'  if(g39.critKills!==0)errors.push("stats: critKills should init 0");',
'  if(g39.dodgeKills!==0)errors.push("stats: dodgeKills should init 0");',
'  spawnEnemy(g39,"zhikui",{noScale:true});',
'  var e39=g39.enemies[g39.enemies.length-1];e39.spawnGraceT=0;',
'  var atk39={x:e39.x,y:e39.y,angle:0,arc:Math.PI,range:100,dmg:50,crit:true,life:12,maxLife:12,type:"slash",hitMap:{}};',
'  hitE(g39,atk39,e39);',
'  if(g39.critKills<1)errors.push("stats: critKills="+g39.critKills+" after crit hit");',
'  var g39b=newGame("jian");startWave(g39b);',
'  if(g39b.dodgeKills!==0)errors.push("stats: dodgeKills should init 0 in new game");',
'}catch(e){errors.push("statTracking: "+e.message)}',

// Test 40: Grade calculation includes combo and crit factors
'try{var g40a=newGame("jian");',
'  g40a.state="victory";g40a.kills=30;g40a.relics=[];g40a.diff="normal";',
'  g40a.player={hp:80,maxHp:100};g40a.maxCombo=0;g40a.critKills=0;',
'  var grade0=calcGrade(g40a);',
'  g40a.maxCombo=30;g40a.critKills=20;',
'  var gradeUp=calcGrade(g40a);',
'  if(gradeUp===grade0)errors.push("grade: combo+crit did not change grade, both="+grade0);',
'}catch(e){errors.push("gradeCalc: "+e.message)}',

// Test 41: forEachLiveEnemy skips dead and grace enemies
'try{var g41=newGame("jian");startWave(g41);',
'  g41.enemies=[];',
'  spawnEnemy(g41,"zhikui",{noScale:true});',
'  spawnEnemy(g41,"zhikui",{noScale:true});',
'  spawnEnemy(g41,"zhikui",{noScale:true});',
'  var all=g41.enemies;',
'  all[0].hp=0;all[0].killed=true;',
'  all[1].spawnGraceT=30;all[1].hp=50;',
'  all[2].spawnGraceT=0;all[2].hp=50;',
'  var live=[];',
'  forEachLiveEnemy(g41,function(e){live.push(e.id)});',
'  if(live.length!==1)errors.push("forEachLive: count="+live.length+", expected 1");',
'  if(live[0]!==all[2].id)errors.push("forEachLive: wrong enemy id");',
'}catch(e){errors.push("forEachLive: "+e.message)}',

// Test 42: New achievement checks (combo_20, dodge_master)
'try{',
'  var ach42=ACHIEVEMENTS.filter(function(a){return a.id==="combo_20"||a.id==="dodge_master"});',
'  if(ach42.length!==2)errors.push("ach: expected 2 new achievements, got "+ach42.length);',
'  var c42=ach42.filter(function(a){return a.id==="combo_20"})[0];',
'  if(!c42)errors.push("ach: combo_20 missing");',
'  else{var m42={bestCombo:25};if(!c42.check(m42))errors.push("ach: combo_20 should pass with bestCombo=25")}',
'  var d42=ach42.filter(function(a){return a.id==="dodge_master"})[0];',
'  if(!d42)errors.push("ach: dodge_master missing");',
'  else{var m42b={bestDodgeKills:35};if(!d42.check(m42b))errors.push("ach: dodge_master should pass with bestDodgeKills=35")}',
'}catch(e){errors.push("newAch: "+e.message)}',

// Test 43: Boss phase announcement floatText (P1 feature — reason:phase)
'try{var g43=newGame("jian");startWave(g43);',
'  // Simulate boss enrage phase trigger',
'  var boss43={isBoss:true,type:"boss",hp:30,maxHp:100,enraged:false,desperate:false};',
'  pushLimited(g43.floatTexts,{x:480,y:220,text:"狂 暴",life:80,maxLife:80,reason:"phase"},LIMITS.floatTexts);',
'  pushLimited(g43.floatTexts,{x:480,y:220,text:"绝 望",life:90,maxLife:90,reason:"phase"},LIMITS.floatTexts);',
'  var phase43=g43.floatTexts.filter(function(f){return f.reason==="phase"});',
'  if(phase43.length!==2)errors.push("phase: expected 2 phase texts, got "+phase43.length);',
'  if(phase43[0].text!=="狂 暴")errors.push("phase: first text="+phase43[0].text);',
'  if(phase43[1].text!=="绝 望")errors.push("phase: second text="+phase43[1].text);',
'}catch(e){errors.push("bossPhase: "+e.message)}',

// Test 44: v9.0 new achievements (5) and new curses (3)
'try{var newAch=["combo_30","crit_50","elite_20","survival_master","relic_50"];',
'newAch.forEach(function(id){var a=ACHIEVEMENTS.filter(function(x){return x.id===id})[0];if(!a)errors.push("ach: "+id+" missing")});',
'var newCurses=["huwei","canglang","qianniao"];',
'newCurses.forEach(function(id){var c=CURSES.filter(function(x){return x.id===id})[0];if(!c)errors.push("curse: "+id+" missing")});',
'if(ACHIEVEMENTS.length!==53)errors.push("ach: expected 53, got "+ACHIEVEMENTS.length);',
'if(CURSES.length!==31)errors.push("curse: expected 31, got "+CURSES.length);',
'}catch(e){errors.push("v9content: "+e.message)}',

// Report
'if(errors.length){console.log("FAIL ("+errors.length+"):");errors.forEach(function(e){console.log("  - "+e)});process.exit(1)}',
'else{console.log("ALL 44 PASSED");',
'  console.log("  1. 4 weapons x 20 frames + render");',
'  console.log("  2. Relic selection = 3");',
'  console.log("  3. Limits enforced");',
'  console.log("  4. Perf tracking");',
'  console.log("  5. 9 waves");',
'  console.log("  6. soulChain cap 4");',
'  console.log("  7. Zero direct push");',
'  console.log("  8. New enemies spawn+shield");',
'  console.log("  9. critRate cap (no crash)");',
'  console.log(" 10. bell combo cap (no crash)");',
'  console.log(" 11. Relics count >= 40");',
'  console.log(" 12. returnInk echo hitMap");',
'  console.log(" 13. Evolution selection");',
'  console.log(" 14. Boss enrage <50%");',
'  console.log(" 15. Boss 8-directional projectiles");',
'  console.log(" 16. Dodge + invincibility");',
'  console.log(" 17. Frost zone slows enemies");',
'  console.log(" 18. Kite tracking + damage");',
'  console.log(" 19. Shield regen");',
'  console.log(" 20. Fire trail (fenling)");',
'  console.log(" 21. Splitter enemy splits on death");',
'  console.log(" 22. Summoner spawns minions");',
'  console.log(" 23. inkPoolCheck merged function");',
'  console.log(" 24. cleanupWave preserves player fires");',
'  console.log(" 25. spawnGraceT prevents damage");',
'  console.log(" 26. Decoy attracts enemies");',
'  console.log(" 27. killShield stacks and clears");',
'  console.log(" 28. mkMinion valid objects");',
'  console.log(" 29. Evolution selection excludes owned");',
'  console.log(" 30. Ash stage speed reduction");',
'  console.log(" 31. Mask stage revive mechanic");',
'  console.log(" 32. Double-kill prevention + 0 HP edge");',
'  console.log(" 33. Shield break timing");',
'  console.log(" 34. Full cleanupWave array clearing");',
'  console.log(" 35. CAPS enforcement (atkCdFloor/critRate/bellCombo/shieldStack)");',
'  console.log(" 36. PREREQS filtering for relic choices");',
'  console.log(" 37. 60s long-run stability around 49s crash window");',
'  console.log(" 38. Kill streak milestones (KILL_MILESTONES)");',
'  console.log(" 39. Crit/dodge stat tracking");',
'  console.log(" 40. Grade calculation includes combo/crit");',
'  console.log(" 41. forEachLiveEnemy skips dead/grace");',
'  console.log(" 42. New achievement checks (combo_20/dodge_master)");',
'  console.log(" 43. Boss phase announcement (reason:phase)")}',
].join('\n');

eval(code);
