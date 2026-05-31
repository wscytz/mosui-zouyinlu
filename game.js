(function(){
"use strict";

// ════════════════════════════════════════════════════════════════
// § UTILITIES — math helpers, random, audio bridge
// ════════════════════════════════════════════════════════════════

function dstSq(a,b){var dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy}
function ang(a,b){return Math.atan2(b.y-a.y,b.x-a.x)}
function collideSq(a,b,extraR){var r=(a.r||0)+(b.r||0)+(extraR||0);return dstSq(a,b)<r*r}
function distPointToSegSq(px,py,x1,y1,x2,y2){var dx=x2-x1,dy=y2-y1,ls=dx*dx+dy*dy;if(ls===0)return(px-x1)*(px-x1)+(py-y1)*(py-y1);var t=((px-x1)*dx+(py-y1)*dy)/ls;t=cl(t,0,1);var nx=x1+t*dx,ny=y1+t*dy;return(px-nx)*(px-nx)+(py-ny)*(py-ny)}
function cl(v,lo,hi){return v<lo?lo:v>hi?hi:v}
function findNearestEnemy(g,ox,oy,rSq){var n=null,nd=rSq||Infinity;for(var ei=0;ei<g.enemies.length;ei++){var oe=g.enemies[ei];if(oe.hp<=0||oe.spawnGraceT>0)continue;var dx=ox-oe.x,dy=oy-oe.y,sd=dx*dx+dy*dy;if(sd<nd){nd=sd;n=oe}}return{enemy:n,distSq:nd}}
function forEachLiveEnemy(g,fn){for(var i=0;i<g.enemies.length;i++){var e=g.enemies[i];if(e.hp>0&&e.spawnGraceT<=0)fn(e,i)}}
function rn(a,b){return a+Math.random()*(b-a)}
function ri(a,b){return Math.floor(rn(a,b+1))}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function shuf(a){for(var i=a.length-1;i>0;i--){var j=ri(0,i);var t=a[i];a[i]=a[j];a[j]=t}return a}
function moveScale(p){var m=p.stats.spd;if(p.killSpdTimer>0)m+=TUNING.killSpeedBonus;if(p.speedBurstT>0)m+=TUNING.speedBurstBonus;if(p.lowHpFury&&p.hp<=p.maxHp*TUNING.lowHpFuryThreshold)m+=TUNING.lowHpFuryBonus;return m}
function snd(name){if(window.GameSound&&window.GameSound.play)GameSound.play(name)}
function pushLimited(list,item,max){if(list.length>=max)list.splice(0,list.length-max+1);list.push(item)}
// ════════════════════════════════════════════════════════════════
// § INPUT HELPERS — platform detection, mobile dodge bridge
// ════════════════════════════════════════════════════════════════

function hasMobileDebugFlag(){var q="";try{q=(window.location&&window.location.search)||""}catch(e){}return /(?:[?&](?:mobile|mobileControls)=1(?:&|$))|(?:[?&]controls=mobile(?:&|$))/.test(q)}
function needsMobileUI(){
  if(window.__needsMobileUI){try{return !!window.__needsMobileUI()}catch(e){}}
  try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())return true}catch(e){}
  return hasMobileDebugFlag();
}
function requestMobileDodge(){
  var mob=window._mobileInput;
  if(!mob)return;
  mob.dodging=true;
  mob.dodgeRequest=(mob.dodgeRequest||0)+1;
  try{if(navigator.vibrate)navigator.vibrate(20);else if(window.Capacitor&&Capacitor.Haptics)Capacitor.Haptics.impact({style:'MEDIUM'})}catch(e){}
}
var KILL_MILESTONES=[
  {at:3,text:"三连斩",life:60,pCnt:6,pCol:"accent",sh:5,shA:2,rf:0,gold:0},
  {at:5,text:"五连斩!",life:70,pCnt:8,pCol:"accent",sh:8,shA:3,rf:0,gold:0},
  {at:10,text:"十连斩!!",life:80,pCnt:14,pCol:"accent",sh:12,shA:5,rf:6,gold:0},
  {at:20,text:"二十连斩!!!",life:90,pCnt:20,pCol:"accent",sh:16,shA:7,rf:8,gold:20},
  {at:30,text:"三十连斩!!!!",life:100,pCnt:28,pCol:"fire",sh:20,shA:10,rf:10,gold:12},
  {at:50,text:"五十连斩！！！！",life:120,pCnt:40,pCol:"fire",sh:24,shA:12,rf:15,gold:40}
];
// ════════════════════════════════════════════════════════════════
// § PERFORMANCE — pressure detection, adaptive quality
// ════════════════════════════════════════════════════════════════

function perfPressure(g){
  return Math.max(
    g.particles.length/LIMITS.particles,
    g.fires.length/LIMITS.fires,
    g.attacks.length/LIMITS.attacks,
    g.eProj.length/LIMITS.eProj
  );
}
function perfMul(g){
  var p=perfPressure(g);
  return p>TUNING.perfThreshFull?TUNING.perfMulFull:p>TUNING.perfThreshHigh?TUNING.perfMulHigh:p>TUNING.perfThreshMed?TUNING.perfMulMed:p>TUNING.perfThreshLow?TUNING.perfMulLow:1;
}
function markPerf(g){
  if(!g||!g.perf||!g.perf.peaks)return;
  g.perf.pressure=perfPressure(g);
  g.perf.peaks.enemies=Math.max(g.perf.peaks.enemies,g.enemies.length);
  g.perf.peaks.attacks=Math.max(g.perf.peaks.attacks,g.attacks.length);
  g.perf.peaks.particles=Math.max(g.perf.peaks.particles,g.particles.length);
  g.perf.peaks.fires=Math.max(g.perf.peaks.fires,g.fires.length);
  g.perf.peaks.eProj=Math.max(g.perf.peaks.eProj,g.eProj.length);
  g.perf.peaks.floatTexts=Math.max(g.perf.peaks.floatTexts,g.floatTexts.length);
  g.perf.peaks.decoys=Math.max(g.perf.peaks.decoys,g.decoys.length);
  g.perf.peaks.kites=Math.max(g.perf.peaks.kites,g.kites.length);
  g.perf.peaks.frosts=Math.max(g.perf.peaks.frosts,g.frosts.length);
  g.perf.peaks.inkSpirits=Math.max(g.perf.peaks.inkSpirits||0,g.inkSpirits.length);
}
// ════════════════════════════════════════════════════════════════
// § OBJECT POOLS — add/clear/shake/flash for game arrays
// ════════════════════════════════════════════════════════════════

function addFire(g,f){
  f.maxLife=f.life;
  if(f.tickOffset==null)f.tickOffset=(g.time+g.fires.length)%20;
  if(f.healTickOffset==null)f.healTickOffset=(g.time+g.fires.length*3)%40;
  pushLimited(g.fires,f,LIMITS.fires)
}
function addEProj(g,ep){pushLimited(g.eProj,ep,LIMITS.eProj)}
function shake(g,dur,amp){var si=(g._shakeIntensity||0.8);g.shakeT=Math.max(g.shakeT,dur);g.shakeAmp=Math.max(g.shakeAmp||0,amp*si)}
function setShadow(c,col,blur,g){
    if(!g||!g._pm||g._pm>=0.7){c.shadowColor=col;c.shadowBlur=blur}else{c.shadowBlur=0}}
function clearShadow(c){c.shadowBlur=0}
var _gCache={};
function cachedGradient(c,id,fn){if(!_gCache[id])_gCache[id]=fn(c);return _gCache[id]}
function screenFlash(c,w,h,a,iC,oC,iR,oR){c.globalAlpha=a;var _k="sf"+iR+oR+iC+oC;var g=cachedGradient(c,_k,function(c2){var g2=c2.createRadialGradient(w/2,h/2,w*iR,w/2,h/2,w*oR);g2.addColorStop(0,iC);g2.addColorStop(1,oC);return g2});c.fillStyle=g;c.fillRect(0,0,w,h)}
function pushAttack(g,atk){
  if(!g||!atk)return;
  if(!atk.hitMap)atk.hitMap={};
  if(atk.life==null)atk.life=1;
  if(atk.maxLife==null)atk.maxLife=atk.life;
  if(atk.type==="proj"||atk.type==="spirit"){
    var vx=Number(atk.vx),vy=Number(atk.vy);
    if(!isFinite(vx)||!isFinite(vy)||vx*vx+vy*vy<0.25){
      var p=g.player,a=atk.angle!=null?atk.angle:(p?p.facing:0);
      var sp=atk.type==="spirit"?5.5:5;
      atk.vx=Math.cos(a)*sp;atk.vy=Math.sin(a)*sp;atk._speedRepaired=true;
    }
    // 梭破进化：记录发射点用于距离增伤
    if(atk.spawnX==null){atk.spawnX=atk.x;atk.spawnY=atk.y}
  }
  pushLimited(g.attacks,atk,LIMITS.attacks)
}
function spawnJudgment(g,e,reason){
  var text=pick(JUDGMENTS);
  pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:text,life:50,maxLife:50,reason:reason},LIMITS.floatTexts);
}

// ════════════════════════════════════════════════════════════════
// § GLOBALS — input state, canvas refs, meta-progression
// ════════════════════════════════════════════════════════════════

var keys={},mouse={x:W/2,y:H/2,down:false},nextEnemyId=1;
var canvas,ctx,G=null,bgCanvas=null,_cachedCanvasRect=null;
window.MOSUI=window.MOSUI||{};
window.MOSUI.version=window.MOSUI.version||"3.1";
window.MOSUI.hooks=window.MOSUI.hooks||{beforeUpdate:[],afterUpdate:[],beforeRender:[],afterRender:[]};
window.MOSUI.input=window.MOSUI.input||{};
window.MOSUI.platform=window.MOSUI.platform||{};
window.MOSUI.profiles=window.MOSUI.profiles||{control:{},render:{},ui:{}};
window.MOSUI.profiles.control=window.MOSUI.profiles.control||{};
window.MOSUI.profiles.render=window.MOSUI.profiles.render||{};
window.MOSUI.profiles.ui=window.MOSUI.profiles.ui||{};
window.MOSUI.ui=window.MOSUI.ui||{};
window.MOSUI.debug=window.MOSUI.debug||{};
var MOSUI=window.MOSUI;
function getCanvasRect(){if(!_cachedCanvasRect||!_cachedCanvasRect.width){_cachedCanvasRect=canvas.getBoundingClientRect()}return _cachedCanvasRect}
function invalidateCanvasRect(){_cachedCanvasRect=null}

// --- Meta-progression (localStorage) [GLOBALS section] ---
var META_KEY="mosui_meta";
function loadMeta(){
  var defaults={version:2,totalKills:0,totalRuns:0,bestWave:0,bestGrade:"",bossKills:0,bestCombo:0,bestDodgeKills:0,
    weaponsCleared:{},weaponBestWave:{},weaponTotalKills:{},relicsDiscovered:{},cursesUsed:{},mojiangjunKills:0,
    nightmareWins:0,hardWins:0,eliteKills:0,bestFireKills:0,achievements:{},unlocks:{}};
  try{
    var d=JSON.parse(localStorage.getItem(META_KEY));
    if(d&&d.version===2){
      for(var k in defaults){if(!(k in d))d[k]=defaults[k]};
      return d;
    }
  }catch(e){}
  return defaults}
function saveMeta(m){try{localStorage.setItem(META_KEY,JSON.stringify(m))}catch(e){}}
var meta=loadMeta();
function metaRecordRun(g){
  var won=g.state==="victory";
  meta.totalRuns++;meta.totalKills+=g.kills;
  if(g.wave>meta.bestWave)meta.bestWave=g.wave;
  var grade=calcGrade(g);
  if(grade&&(!meta.bestGrade||gradePriority(grade)>gradePriority(meta.bestGrade)))meta.bestGrade=grade;
  if(won){var wid=g.weapon.id;meta.weaponsCleared[wid]=(meta.weaponsCleared[wid]||0)+1}
  if(wid){meta.weaponBestWave[wid]=Math.max(meta.weaponBestWave[wid]||0,g.wave);meta.weaponTotalKills[wid]=(meta.weaponTotalKills[wid]||0)+g.kills}
  if(g.curse)meta.cursesUsed[g.curse.id]=true;
  if(g.bossKilled){meta.bossKills++}
  if(g.mojiangjunKilled){meta.mojiangjunKills++}
  if(g.moguiwangKilled){meta.moguiwangKills=(meta.moguiwangKills||0)+1}
  if(won&&g.diff==="nightmare")meta.nightmareWins++;
  if(won&&g.diff==="hard")meta.hardWins=(meta.hardWins||0)+1;
  meta.eliteKills=(meta.eliteKills||0)+g.eliteKills;
  if(g.fireKills>(meta.bestFireKills||0))meta.bestFireKills=g.fireKills;
  if((g.killExplodeKills||0)>(meta.bestKillExplodeKills||0))meta.bestKillExplodeKills=g.killExplodeKills;
  if((g.blindKills||0)>(meta.bestBlindKills||0))meta.bestBlindKills=g.blindKills;
  if((g.waveHpHealed||0)>(meta.bestWaveHpHealed||0))meta.bestWaveHpHealed=g.waveHpHealed;
  if((g.lowHpBurstKills||0)>(meta.bestLowHpBurstKills||0))meta.bestLowHpBurstKills=g.lowHpBurstKills;
  if((g.mozhuhouKills||0)>(meta.mozhuhouKills||0))meta.mozhuhouKills=g.mozhuhouKills;
  if((g.executeKills||0)>(meta.bestExecuteKills||0))meta.bestExecuteKills=g.executeKills;
  if((g.dodgeKills||0)>(meta.bestDodgeKills||0))meta.bestDodgeKills=g.dodgeKills;
  // Easter egg tracking
  if(won&&!g.usedMoveKey)meta.noMoveWins=(meta.noMoveWins||0)+1;
  if(won&&g.hurtCount<=3)meta.lowHurtWins=(meta.lowHurtWins||0)+1;
  if(g.fastWaveClear)meta.fastWaveClears=(meta.fastWaveClears||0)+1;
  if(won&&g.player.maxHpOverride&&g.player.maxHpOverride<=60)meta.paperWins=(meta.paperWins||0)+1;
  if(won&&g.relics.length===0)meta.noRelicWins=(meta.noRelicWins||0)+1;
  if(g.kills>(meta.bestSingleRunKills||0))meta.bestSingleRunKills=g.kills;
  if(g.maxCombo>(meta.bestCombo||0))meta.bestCombo=g.maxCombo;
  if((g.moveChargeFires||0)>(meta.bestMoveChargeFires||0))meta.bestMoveChargeFires=g.moveChargeFires;
  if(g.relics.length>(meta.maxRelicsInRun||0))meta.maxRelicsInRun=g.relics.length;
  if(won&&g._isBossWave&&!g.bossHurtThisWave)meta.perfectBossKills=(meta.perfectBossKills||0)+1;
  if(won&&g.player.noEvolution)meta.noEvolveWins=(meta.noEvolveWins||0)+1;
  if(won){var _fa=0;g.fires.forEach(function(f){if(f.owner==="player")_fa+=Math.PI*f.r*f.r});var _fc=_fa/(W*H);if(_fc>(meta.bestFireCoverage||0))meta.bestFireCoverage=_fc}
  var newlyUnlocked=checkAchievements(meta);
  saveMeta(meta);
  return newlyUnlocked;
}

function checkAchievements(m){
  var newlyUnlocked=[];
  ACHIEVEMENTS.forEach(function(a){
    if(!m.achievements[a.id]&&a.check(m)){
      m.achievements[a.id]=true;
      newlyUnlocked.push(a);
      if(a.reward&&!m.unlocks[a.reward])m.unlocks[a.reward]=true;
    }
  });
  return newlyUnlocked;
}
function calcGrade(g){
  var won=g.state==="victory";var score=0;
  if(won)score+=40;score+=Math.min(g.kills,100)*0.3;score+=g.relics.length*2;
  if(g.diff==="hard")score+=10;else if(g.diff==="nightmare")score+=20;
  if(won&&g.player.maxHp>0)score+=Math.floor(g.player.hp/g.player.maxHp*10);score=Math.floor(score);
  if(score>=90)return"S";else if(score>=75)return"甲";else if(score>=60)return"乙";
  else if(score>=40)return"丙";else return"丁";
}
function gradePriority(g){var m={"S":5,"甲":4,"乙":3,"丙":2,"丁":1};return m[g]||0}
function buildEndRoute(g){
  var tagFreq={};
  (g.relics||[]).forEach(function(r){
    (r.tags||[]).forEach(function(t){tagFreq[t]=(tagFreq[t]||0)+1});
  });
  var sortedTags=Object.keys(tagFreq).sort(function(a,b){return tagFreq[b]-tagFreq[a]});
  if(sortedTags.length>=2)return sortedTags[0]+" · "+sortedTags[1]+"流";
  if(sortedTags.length===1)return sortedTags[0]+"流";
  return"孤行流";
}

// ════════════════════════════════════════════════════════════════
// § STATE FACTORY — player creation, game state init, background
// ════════════════════════════════════════════════════════════════

function buildBg(){
  bgCanvas=document.createElement("canvas");bgCanvas.width=W;bgCanvas.height=H;
  var bc=bgCanvas.getContext("2d");
  bc.fillStyle=C.paper;bc.fillRect(0,0,W,H);
  bc.globalAlpha=0.04;
  for(var i=0;i<60;i++){bc.fillStyle=C.ink;
    bc.fillRect(Math.sin(i*7.3)*W*0.5+W/2,Math.cos(i*5.1)*H*0.5+H/2,1,1)}
  bc.globalAlpha=0.06;
  [[120,100,40],[800,520,35],[480,320,50]].forEach(function(d){
    bc.fillStyle=C.ink;bc.beginPath();bc.arc(d[0],d[1],d[2],0,Math.PI*2);bc.fill()});
}

function mkPlayer(){
  return{x:W/2,y:H/2,r:TUNING.playerR,hp:TUNING.playerHp,maxHp:TUNING.playerHp,spd:TUNING.playerSpd,facing:0,
    atkCd:0,atkCount:0,invTimer:0,hurtFlash:0,dashT:0,dashDx:0,dashDy:0,
    dodgeT:0,dodgeDx:0,dodgeDy:0,dodgeCd:0,dodgeQueued:false,justDodgedT:0,dodgeBufferT:0,dodgeBufferDx:0,dodgeBufferDy:0,
    // 基础属性（遗物/强化统一修改）
    stats:{dmg:1,spd:1,range:1,critRate:0.2,critDmg:1.5,
      atkSpd:1,multi:1,projSize:1,def:0,returnInk:0},
    // 连段
    comboCount:0,comboTimer:0,
    comboHitId:null,comboHitCount:0,
    // 蓄力
    chargeTimer:0,charged:false,
    // 击杀增益计时
    killSpdTimer:0,killAtkTimer:0,
    // 机制遗物标记
    tripleBlade:false,decoyHP:0,soulDmg:0,
    bounce:false,fireOnKill:false,lowHpDmg:0,
    slowOnHit:0,soulChain:false,pierceOnDodge:false,justDodged:false,
    killSpeed:false,comboDmg:false,
    thorns:0,killHeal:0,inkTrail:false,
    fearOnCrit:false,chargeDmg:0,weakpointDmg:0,
    revive:false,hasRevived:false,killAtkSpd:false,
    lowHpRange:false,extraDmgTaken:0,
    weakTargets:{},
    wideSlash:false,seekBlade:false,
    projPierce:false,projBurst:false,bigSplit:false,
    ringSlow:false,ringNoDecay:false,dashReturn:false,
    execCritBonus:false,weakSpread:false,meleeCdRefund:false,
    decoyOnDodge:false,fireExpand:false,soulKillChain:false,
    ringSoulHit:false,bounceExplosion:false,guxuePenalty:false,
    killShield:false,shieldStack:0,
    // v1.4 遗物标记
    dodgeSpdScale:false,fireHeal:0,
    lastDx:0,lastDy:0,
    summonKite:false,kiteKills:0,
    frostOnCrit:false,
    eliteKillBurst:false,dodgeSoulGrab:false,projSlowField:false,
    poisonHeal:false,fogBonus:false,soulOrbHeal:false,comboDmgBonus:false,
    hasInkSpirit:false,inkSpiritCount:0,
    leeches:[],
    spiritHpCost:false,spiritDmgBonus:0,mimicFirstCrit:false,leechBuff:false,
    stillT:0,defFormation:false,atkFormation:false,formBoost:false,formDouble:false,atkFormCount:0,
    reflectChance:0,reflectDmgMult:0,healFormation:false,vortexOnKill:false,vortexKills:0,
    autoReflect:false,autoReflectReady:false,autoReflectCd:0,
    formationLeech:false,formDef:false,formationDetonate:false,inkStrings:false,attackPin:false,formClarity:false,killPulse:false,formRipple:false,recallDash:false,speedBurstT:0,scentStreak:false,formDmgBonus:false,critShrapnel:false,corrosive:false,lowHpFury:false,
    execCritT:0,
    nineSealCount:0,nineSealReady:false,hasNineSeal:false,
    // curse flags
    noDodge:false,noWaveHeal:false,noEvolution:false,
    fogCurse:false,soulOrbCurse:false,
    moveSlowTrail:false,stillDmgMult:0,
    moveChargeMax:false,moveChargeT:0,
    killHealChance:0,killHealAmt:0,meleeSplash:false,meleeSplashRatio:0,
    blindT:0,
    comboDmgScale:false,comboVuln:false,
    killExplode:false,killExplodeRatio:0,
    killDotZone:false,killDotDmg:0,
    waveHpBonus:false,waveHpMax:0,waveHpGain:0,waveHpAdded:0,
    hurtFrost:false,
    lowHpWaveHeal:false,
    fireSplash:false,fireSplashRatio:0,
    spiritCapBonus:0,spiritHpPenalty:0,
    critExplosion:false,critExplosionRatio:0,
    hitDot:false,hitDotDmg:0,hitDotLife:0,
    lowHpBurst:false,lowHpBurstUsed:false,lowHpBurstT:0,
    executeExplode:false,executeExplodeRatio:0,
    splashDot:false,splashDotDmg:0,splashDotLife:0,
    healToShield:false,
    splitOnHit:false,splitChance:0,
    hurtRetaliate:false,hurtRetaliateDmg:0,
    blindDmgBoost:0,
    splashDeathBoom:false,splashDeathBoomChance:0,splashDeathBoomRatio:0,
    splashRippleStack:false,splashRippleMax:0,splashRippleBonus:0,_rippleStacks:0,
    maxHpOverride:0,extraStartRelics:0,extraRelicChoice:false,
    enemyHpMult:1,enemySpdMult:1,allElite:false,relicPower:1,_relicPowerApplied:false,
    enemyFlicker:false,inkBrandCurse:false,missChance:0,hitDmgMult:0,
    splitDot:false,
    breathOnKill:false,breathTicks:0,
    hurtSplash:false,hurtSplashDmg:0,
    killBurstHeal:false,
    killSplashHeal:false,
    splitHitHeal:false,
    hurtShieldActive:false,hurtShieldTicks:0,
    killSplashWideHeal:false,
    splitBoomOnHit:false,
    bossHurtGuard:false,
    healOverflowBoom:false,
    dotAccumBoom:false,
    splitShieldActive:false,splitShieldTicks:0,
    fullHpDefense:false,
    splitHealOnHit:false,
    yinFuHeal:false,
    soulKill:false,
    curseSurv:false,
    rangedFire:false,
    summonBurst:false,
    dashRetaliate:false,
    meleeMobility:false,
    killAOE:false,
    critHeal:false,
    dodgeSplash:false,
    curseHeart:false,
    counterSpell:false,
    burstHeal:false,
    burstHealUsed:false,
    splashFire:false,
    killSurvive:false,
    spiritSpeed:false,
    fireBurst:false,
    rangedKillSpirit:false,
    killSummonSpirit:false,
    mozhenlianhuan:false,
    mobaoliansu:false,
    soulHitBoost:false,
    dashFireTrail:false,
    dashCritBoost:false,
    aoeDotHit:false,
    aoeGuardBond:false,
    mosufengBond:false,
    mofanyuBond:false,
    mokuaihunBond:false,
    mochongguangBond:false,
    idleT:0}
}

var DIFF={normal:{hpM:1,spdM:1,dmgM:1},hard:{hpM:1.35,spdM:1.15,dmgM:1.25},nightmare:{hpM:1.8,spdM:1.3,dmgM:1.5}};

function quickRestart(g){
  if(!g||!(g.state==="playing"||g.state==="paused"))return;
  snd("quickRestart");if(window.GameSound)GameSound.stopAmbient();g.ended=true;g.state="over";
  _hide("pauseOverlay");_hide("relicPopup");_hide("cursePopup");
  var w=g.weapon,d=g.diff;
  G=newGame(w.id,d);
  startGame(G);
}

function newGame(wid,diff){
  _lastHp=-1;_lastHpText=-1;
  var w=WEAPONS.filter(function(x){return x.id===wid})[0];
  if(!w){console.warn("Invalid weapon id: "+wid+", defaulting to jian");w=WEAPONS[0];}
  nextEnemyId=1;
  return{state:"playing",weapon:w,wave:0,kills:0,time:0,diff:diff||"normal",
    shakeT:0,shakeAmp:0,shakeX:0,shakeY:0,freezeT:0,hintT:180,ended:false,dmgDir:null,slowMo:0,
    _shakeIntensity:(function(){try{return parseFloat(localStorage.getItem("mosui_shake")||"0.8")}catch(e){return 0.8}})(),
    killStreak:0,killStreakT:0,relicFlash:0,critFlash:0,bossFlash:0,
    bossWaveEntrance:0,deathCircle:null,
    totalDmg:0,maxCombo:0,eliteKills:0,fireKills:0,deathCause:null,totalHealed:0,totalDmgTaken:0,
    hurtCount:0,usedMoveKey:false,bossHurtThisWave:false,fastWaveClear:false,
    waveFirstKillT:0,waveKills:0,waveStartT:0,
    hints:{relic:false,evo:false,boss:false},encountered:{},
    inkWipe:0,bossCelebrationT:0,
    player:mkPlayer(),enemies:[],attacks:[],particles:[],fires:[],eProj:[],
    relics:[],relicPool:shuf(RELICS.slice()),
    stage:null,stageDesc:"",announce:"",announceT:0,execFlash:null,evolution:null,evolution2:null,evolution3:null,floatTexts:[],decoys:[],
    kites:[],frosts:[],waveTotal:0,waveCleared:false,waveClearT:0,
    waveSpecial:null,survivalSpawnTimer:0,survivalCleared:false,
    bossType:pick(["boss","mojiangjun","moguiwang"]),curse:null,pendingDeathbursts:[],bossIntroT:0,bossIntroName:"",_merchantCooldown:0,
    fogTimer:0,soulOrbs:[],
    hazard:null,hazardTimer:0,hazardObjs:[],
    inkSpirits:[],
    formations:[],
    killExplodeKills:0,blindKills:0,waveHpHealed:0,lowHpBurstKills:0,mozhuhouKills:0,executeKills:0,dodgeKills:0,critKills:0,killFeed:[],
    perf:{lastT:0,fps:60,pressure:0,peaks:{enemies:0,attacks:0,particles:0,fires:0,eProj:0,floatTexts:0,decoys:0,kites:0,frosts:0}}}
}

// ════════════════════════════════════════════════════════════════
// § SPAWNERS — particles, enemies, minions
// ════════════════════════════════════════════════════════════════

function showHint(g,key,text){
  if(g.hints[key])return;g.hints[key]=true;
  pushLimited(g.floatTexts,{x:W/2,y:H/2+60,text:text,life:150,maxLife:150,reason:"hint"},LIMITS.floatTexts);
}

function spawnP(g,x,y,type,n){
  n=Math.max(1,Math.floor(n*(g._pm!=null?g._pm:perfMul(g))));
  for(var i=0;i<n;i++){var a=rn(0,Math.PI*2),s=rn(1,4);
    var life=rn(18,40);
    var p={x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
      life:life,maxLife:life,size:rn(2,7),type:type};
    pushLimited(g.particles,p,LIMITS.particles)}
}

function spawnInk(g,x,y,n,col){
  n=Math.max(1,Math.floor(n*(g._pm!=null?g._pm:perfMul(g))));
  for(var i=0;i<n;i++){var a=rn(0,Math.PI*2),s=rn(0.5,3);
    var life=rn(20,50);
    var p={x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
      life:life,maxLife:life,size:rn(3,10),type:col||"ink"};
    pushLimited(g.particles,p,LIMITS.particles)}
}

function spawnEnemy(g,type,opts){
  opts=opts||{};
  var t=ETYPE[type],side=ri(0,3),x,y;
  if(!t)return;
  if(opts.x!=null){x=opts.x;y=opts.y}
  else{if(side===0){x=A.l+10;y=rn(A.t+20,A.b-20)}
  else if(side===1){x=A.r-10;y=rn(A.t+20,A.b-20)}
  else if(side===2){x=rn(A.l+20,A.r-20);y=A.t+10}
  else{x=rn(A.l+20,A.r-20);y=A.b-10}}
  var waveScale=opts.noScale?1:(1+Math.max(0,g.wave)*WAVE_SCALE.hpPerWave);
  var dCfg=DIFF[g.diff]||DIFF.normal;
  var p=g.player;
  var hp=Math.max(1,Math.floor(t.hp*waveScale*(opts.hpMul||1)*dCfg.hpM*(p.enemyHpMult||1)*(opts.midBoss?0.55:1)));
  var spd=t.spd*(1+Math.max(0,g.wave)*WAVE_SCALE.spdPerWave)*(opts.spdMul||1)*dCfg.spdM*(p.enemySpdMult||1);
  var shield=t.hasShield?Math.floor((t.shield||0)*waveScale):0;
  var diffEliteBonus=g.diff==="hard"?TUNING.eliteHardBonus:g.diff==="nightmare"?TUNING.eliteNightmareBonus:0;
  var eliteChance=Math.min(TUNING.eliteMaxChance,TUNING.eliteBaseChance+g.wave*TUNING.eliteWaveScale+diffEliteBonus);
  var elite=(g.wave>=3||p.allElite)&&!t.isBoss&&(p.allElite||Math.random()<eliteChance);
  var eliteAbility=null;
  if(elite){hp=Math.floor(hp*TUNING.eliteHpMult);spd*=TUNING.eliteSpdMult;eliteAbility=pick(["blink","deathburst","enrage","armored","regen","vampire"]);
    if(eliteAbility==="armored")spd*=TUNING.eliteArmoredSpdMult}
  if(g.enemies.length>=LIMITS.enemies)return;
  if(!g.encountered[type]&&t.tip){g.encountered[type]=true;
    pushLimited(g.floatTexts,{x:W/2,y:H/2+40,text:t.name+" — "+t.tip,life:120,maxLife:120,reason:"hint"},LIMITS.floatTexts)}
  g.enemies.push({id:nextEnemyId++,x:x,y:y,type:type,name:t.name,hp:hp,maxHp:hp,spd:spd,r:t.r,
    dmg:Math.max(1,Math.ceil(t.dmg*dCfg.dmgM)),atkR:t.atkR,atkCd:t.atkCd,col:t.col,edge:t.edge,
    ranged:!!t.ranged,pSpd:t.pSpd||0,fireTrail:!!t.fireTrail,poisonTrail:!!t.poisonTrail,buffAura:!!t.buffAura,isBoss:!!t.isBoss,
    fanShot:t.fanShot||1,charge:!!t.charge,chargeCd:t.chargeCd||100,chargeSpeed:t.chargeSpeed||4,
    mimic:!!t.mimic,disguised:!!t.mimic,
    leech:!!t.leech,attached:false,
    swoop:!!t.swoop,swoopPrep:t.swoopPrep||35,webShot:!!t.webShot,blindShot:!!t.blindShot,reviveOnce:!!t.reviveOnce,_revived:false,
    deathBomb:!!t.deathBomb,deathBombR:t.deathBombR||60,deathBombDmg:t.deathBombDmg||12,deathBombDelay:t.deathBombDelay||55,
    deathBuff:!!t.deathBuff,deathBuffR:t.deathBuffR||130,deathBuffT:t.deathBuffT||180,
    deathSlow:!!t.deathSlow,deathSlowR:t.deathSlowR||80,deathSlowT:t.deathSlowT||120,
    spawnsOnDeath:!!t.spawnsOnDeath,spawnType:t.spawnType||"",spawnCount:t.spawnCount||2,
    teleport:!!t.teleport,teleportCd:t.teleportCd||180,teleportT:ri(60,t.teleportCd||180),
    healAura:!!t.healAura,healAuraR:t.healAuraR||100,healAuraCd:t.healAuraCd||150,healAuraT:ri(60,t.healAuraCd||150),healAuraAmt:t.healAuraAmt||8,
    bossChargeT:t.isBoss?0:undefined,bossChargeCdT:t.isBoss?120:undefined,
    bossPrepT:t.isBoss?0:undefined,bossPrepAng:0,
    chargeCdT:ri(45,105),chargeT:0,chargeVx:0,chargeVy:0,prepT:0,stageRevived:false,
    midBoss:!!opts.midBoss,elite:elite,eliteAbility:eliteAbility,spawnPulse:(elite||!!t.isBoss||!!opts.midBoss)?16:0,armorMult:eliteAbility==="armored"?0.5:1,
    blinkCd:480,blinkT:0,enraged:false,
    summoner:!!t.summoner,summonCd:t.summonCd||120,summonMax:t.summonMax||4,summonCdT:ri(30,80),summonCount:0,
    splitter:!!t.splitter,splitCount:t.splitCount||2,splitHpRatio:t.splitHpRatio||0.5,isSplit:!!opts.isSplit,
    hasShield:shield>0,shield:shield,maxShield:shield,shieldCd:0,shieldRegen:t.shieldRegen||300,
    cdT:0,slowT:0,fearT:0,hitFlash:0,bob:rn(0,Math.PI*2),deathT:0,desperate:!!t.desperate,
    isClone:!!opts.isClone,
    spawnGraceT:0});
  if(opts.isClone){var _ce=g.enemies[g.enemies.length-1];_ce.isBoss=false;_ce.desperate=true;_ce.enraged=true;_ce.name=_ce.name+"·影";_ce.col="rgba(107,58,92,0.2)"}
}

function mkMinion(x,y,type,hp,spd,r,dmg,atkR,atkCd,col,edge,overrides){
  var o=overrides||{};
  return{id:nextEnemyId++,x:x,y:y,type:type,name:ETYPE[type]?ETYPE[type].name:type,hp:hp,maxHp:hp,spd:spd,r:r,
    dmg:dmg,atkR:atkR,atkCd:atkCd,col:col,edge:edge,
    ranged:false,pSpd:0,fireTrail:false,isBoss:false,
    fanShot:1,charge:false,chargeCd:100,chargeSpeed:4,
    chargeCdT:o.chargeCdT||100,chargeT:0,chargeVx:0,chargeVy:0,prepT:0,stageRevived:false,
    summoner:false,summonCd:120,summonMax:0,summonCdT:100,summonCount:0,
    splitter:!!o.isSplit,splitCount:0,splitHpRatio:0,isSplit:!!o.isSplit,
    hasShield:false,shield:0,maxShield:0,shieldCd:0,shieldRegen:300,
    cdT:0,slowT:0,fearT:0,hitFlash:0,bob:rn(0,Math.PI*2),deathT:0,
    enraged:false,desperate:false,_summonerId:o._summonerId||0,spawnGraceT:0}
}

// ════════════════════════════════════════════════════════════════
// § STAGE SYSTEM — level modifiers, environmental effects
// ════════════════════════════════════════════════════════════════

function getStageDef(id){return STAGE_MODS[id]||STAGE_MODS.calm}

function addAshZone(g){
  if(!g.stage)return;
  var life=ri(280,460);
  g.stage.zones.push({x:rn(A.l+80,A.r-80),y:rn(A.t+80,A.b-80),
    r:rn(58,96),life:life,maxLife:life,vx:rn(-0.18,0.18),vy:rn(-0.12,0.12)})
}

function startStage(g,w){
  var id=(w&&w.mod)||"calm",def=getStageDef(id);
  g.stage={id:id,name:def.name,desc:def.desc,zones:[],lanterns:[],quietT:0,pulse:0};
  if(window.GameSound&&GameSound.startAmbient)GameSound.startAmbient(id);
  g.stageDesc=def.desc;
  if(id==="ash"){
    for(var i=0;i<3+Math.min(2,Math.floor(g.wave/3));i++)addAshZone(g);
  }else if(id==="well"){
    g.stage.cx=W/2+rn(-70,70);g.stage.cy=H/2+rn(-38,38);g.stage.r=175;
  }else if(id==="lantern"){
    var pts=[[A.l+82,A.t+86],[A.r-82,A.t+86],[A.l+92,A.b-92],[A.r-92,A.b-92]];
    shuf(pts);
    for(var li=0;li<3;li++)g.stage.lanterns.push({x:pts[li][0],y:pts[li][1],
      phase:ri(0,70),cd:105+li*18,bob:rn(0,Math.PI*2)});
  }else if(id==="inkpool"){
    var poolCount=6+ri(0,3);
    for(var pi=0;pi<poolCount;pi++){
      g.stage.zones.push({x:rn(A.l+60,A.r-60),y:rn(A.t+60,A.b-60),r:rn(40,65),
        life:9999,maxLife:9999,purified:false,purifyT:0})
    }
  }else if(id==="guishi"){
    g.merchant={x:W*0.5,y:H*0.4,used:false};
  }
}

function stageSpeedFactor(g,x,y){
  if(!g.stage)return 1;
  if(g.stage.id==="ash"){for(var i=0;i<g.stage.zones.length;i++){
    var z=g.stage.zones[i];var dx=x-z.x,dy=y-z.y;
    if(dx*dx+dy*dy<z.r*z.r)return 0.72;}}
  // v3.4: 墨潮 — pulsing ink ring from center slows player
  if(g.stage.id==="inktide"){
    var tideR=120+60*Math.sin(g.time*0.02);
    var dx2=x-W/2,dy2=y-H/2;
    if(dx2*dx2+dy2*dy2<tideR*tideR)return 0.8;
  }
  return 1;
}

function stageOnEnemyKilled(g,e){
  if(!g.stage)return;
  if(g.stage.id==="ash"){
    g.stage.zones.forEach(function(z){var mr=z.r+70;if(dstSq(e,z)<mr*mr){z.life-=95;z.r*=0.72}});
  }else if(g.stage.id==="lantern"){
    g.stage.quietT=Math.max(g.stage.quietT,70);
  }else if(g.stage.id==="inkpool"){
    g.stage.zones.forEach(function(z){if(!z.purified&&dstSq(e,z)<z.r*z.r){
      z.purified=true;z.purifyT=90;spawnInk(g,z.x,z.y,8,"ash")}});
  }else if(g.stage.id==="mirror"){
    var p=g.player,ddx=p.x-e.x,ddy=p.y-e.y,dd=Math.sqrt(ddx*ddx+ddy*ddy)||1;
    addEProj(g,{x:e.x,y:e.y,vx:ddx/dd*3.5,vy:ddy/dd*3.5,r:6,dmg:4,life:80,col:"rgba(220,210,190,0.5)",kind:"ghost"});snd("ghostProj");
  }
}

function tryStageRevive(g,e){
  if(!g.stage||g.stage.id!=="mask"||e.stageRevived||e.isBoss)return false;
  e.stageRevived=true;e.hp=Math.max(8,Math.floor(e.maxHp*0.38));e.maxHp=e.hp;
  e.spd*=1.12;e.dmg=Math.max(1,Math.floor(e.dmg*0.78));e.r=Math.max(8,e.r*0.9);
  e.col="rgba(23,19,16,0.22)";e.edge=C.accent;e.hitFlash=8;e.deathT=0;e.killed=false;
  spawnInk(g,e.x,e.y,14,"accent");
  pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:"还魂",life:50,maxLife:50,reason:"revive"},LIMITS.floatTexts);
  shake(g,4,3);
  return true;
}

function pullToStageWell(g,obj,power){
  var st=g.stage,dx=st.cx-obj.x,dy=st.cy-obj.y,dSq=dx*dx+dy*dy,rSq=st.r*st.r;
  if(dSq<16||dSq>rSq)return;var d=Math.sqrt(dSq);
  var f=(1-d/st.r)*power;
  obj.x+=dx/d*f;obj.y+=dy/d*f;
  obj.x=cl(obj.x,A.l+obj.r,A.r-obj.r);obj.y=cl(obj.y,A.t+obj.r,A.b-obj.r);
}

function inkPoolCheck(g,x,y){
  if(!g.stage||g.stage.id!=="inkpool"||!g.stage.zones)return 0;
  for(var i=0;i<g.stage.zones.length;i++){var z=g.stage.zones[i];
    var dx=x-z.x,dy=y-z.y;if(dx*dx+dy*dy>=z.r*z.r)continue;
    if(z.purified&&z.purifyT>0)return 2;
    if(!z.purified)return 1}
  return 0;
}

function updateStage(g){
  var st=g.stage,p=g.player;
  if(!st)return;
  if(st.quietT>0)st.quietT--;
  // stage ambient particles (every ~2s at 60fps)
  if(g.time%120===0&&perfMul(g)>0.5){
    var saType={calm:"ink",ash:"ash",well:"moss",mask:"ghost",lantern:"fire",inkpool:"ink"}[st.id]||"ink";
    pushLimited(g.particles,{x:rn(A.l+40,A.r-40),y:rn(A.t+40,A.b-40),
      vx:rn(-0.15,0.15),vy:rn(-0.5,-0.15),life:140,maxLife:140,size:rn(2,4),type:saType},LIMITS.particles);
  }
  if(st.id==="ash"){
    if(g.time%150===0&&st.zones.length<5)addAshZone(g);
    for(var i=st.zones.length-1;i>=0;i--){
      var z=st.zones[i];z.x+=z.vx;z.y+=z.vy;z.life--;
      z.x=cl(z.x,A.l+z.r,A.r-z.r);z.y=cl(z.y,A.t+z.r,A.b-z.r);
      if(z.life<=0||z.r<18)st.zones.splice(i,1);
    }
  }else if(st.id==="well"){
    st.pulse=(Math.sin(g.time/34)+1)/2;
    var power=0.32+st.pulse*0.56;
    pullToStageWell(g,p,p.dodgeT>0?power*0.25:power);
    g.enemies.forEach(function(e){if(e.hp>0)pullToStageWell(g,e,power*0.42)});
    if(g.time%18===0)spawnInk(g,st.cx+rn(-20,20),st.cy+rn(-16,16),1,"moss");
  }else if(st.id==="lantern"&&st.quietT<=0){
    st.lanterns.forEach(function(l){
      l.bob+=0.04;
      if((g.time+l.phase)%l.cd===0){
        var a=ang(l,p),spd=3.1+Math.min(1.4,g.wave*0.08);
        addEProj(g,{x:l.x,y:l.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
          r:5,dmg:5+Math.floor(g.wave*0.5),life:90,_src:null});
        spawnInk(g,l.x,l.y,4,"fire");
      }
    });
  }else if(st.id==="inkpool"){
    // 净化倒计时
    st.zones.forEach(function(z){if(z.purified){z.purifyT--;if(z.purifyT<=0)z.purified=false}});
  }
}

function renderStage(g,c){
  var st=g.stage;
  if(!st)return;
  if(st.id==="ash"){
    st.zones.forEach(function(z){
      var a=cl(z.life/z.maxLife,0,1);
      c.globalAlpha=0.11*a;c.fillStyle=C.ash;c.strokeStyle="rgba(23,19,16,0.05)";c.lineWidth=1;
      drawBlob(c,z.x,z.y,z.r,12);
      c.globalAlpha=0.05*a;c.strokeStyle=C.ink;c.lineWidth=1;c.setLineDash([6,8]);
      c.beginPath();c.arc(z.x,z.y,z.r*0.82,0,Math.PI*2);c.stroke();c.setLineDash([]);
    });
    // wind lines
    c.globalAlpha=0.06;c.strokeStyle=C.ash;c.lineWidth=1;
    for(var wi=0;wi<6;wi++){var wx=(g.time*1.5+wi*180)%W,wy=60+wi*100;
      c.beginPath();c.moveTo(wx,wy);c.lineTo(wx+30,wy-5);c.stroke()}
    c.globalAlpha=1;
  }else if(st.id==="well"){
    var pulse=st.pulse||0,rr=st.r*(0.72+pulse*0.2);
    c.save();c.translate(st.cx,st.cy);
    c.globalAlpha=0.09+0.08*pulse;c.fillStyle=C.ink;
    drawBlob(c,0,0,rr*0.35,10);
    c.globalAlpha=0.2;c.strokeStyle=C.moss;c.lineWidth=2;
    c.beginPath();c.arc(0,0,rr,0,Math.PI*2);c.stroke();
    c.globalAlpha=0.12;c.setLineDash([4,10]);c.beginPath();
    c.arc(0,0,rr*0.62,0,Math.PI*2);c.stroke();c.setLineDash([]);
    // spiral suction lines
    c.globalAlpha=0.1+0.06*pulse;c.strokeStyle=C.moss;c.lineWidth=1;
    for(var si=0;si<3;si++){var sAng=g.time*0.03+si*Math.PI*2/3;
      c.beginPath();
      for(var t=0;t<20;t++){var st2=t/20,sr=rr*st2,sa=sAng+st2*4;
        var sx=Math.cos(sa)*sr,sy=Math.sin(sa)*sr;
        t===0?c.moveTo(sx,sy):c.lineTo(sx,sy)}
      c.stroke()}
    c.restore();c.globalAlpha=1;
  }else if(st.id==="mask"){
    c.globalAlpha=0.06;c.strokeStyle=C.accent;c.fillStyle=C.accent;c.lineWidth=2;
    for(var i=0;i<4;i++){var x=i<2?A.l+90:A.r-90,y=i%2?A.b-90:A.t+90;
      c.beginPath();c.ellipse(x,y,22,30,0,0,Math.PI*2);c.stroke();
      c.beginPath();c.arc(x-7,y-4,2,0,Math.PI*2);c.arc(x+7,y-4,2,0,Math.PI*2);c.fill()}
    c.globalAlpha=1;
  }else if(st.id==="lantern"){
    st.lanterns.forEach(function(l){
      var y=l.y+Math.sin(l.bob)*4;
      c.globalAlpha=st.quietT>0?0.16:0.42;c.fillStyle=C.goldG;c.shadowColor=C.gold;c.shadowBlur=14;
      c.beginPath();c.arc(l.x,y,18,0,Math.PI*2);c.fill();
      c.globalAlpha=st.quietT>0?0.22:0.8;c.strokeStyle=C.gold;c.lineWidth=2;
      c.beginPath();c.arc(l.x,y,10,0,Math.PI*2);c.stroke();c.shadowBlur=0;
      // hanging chain
      c.globalAlpha=0.3;c.strokeStyle=C.gold;c.lineWidth=1;
      c.beginPath();c.moveTo(l.x,l.y-20);c.lineTo(l.x,l.y-45);c.stroke();
      c.globalAlpha=1;
    });
    c.globalAlpha=1;
  }else if(st.id==="inkpool"){
    st.zones.forEach(function(z){
      if(z.purified&&z.purifyT>0){
        c.globalAlpha=0.12*(z.purifyT/90);c.fillStyle=C.paper;
        c.beginPath();c.arc(z.x,z.y,z.r,0,Math.PI*2);c.fill();
        c.globalAlpha=0.2*(z.purifyT/90);c.strokeStyle=C.paper;c.lineWidth=2;
        c.beginPath();c.arc(z.x,z.y,z.r,0,Math.PI*2);c.stroke();
      }else{
        c.globalAlpha=0.18;c.fillStyle=C.ink;
        c.beginPath();c.arc(z.x,z.y,z.r,0,Math.PI*2);c.fill();
        c.globalAlpha=0.08;c.strokeStyle=C.ink;c.lineWidth=1;c.setLineDash([4,6]);
        c.beginPath();c.arc(z.x,z.y,z.r*0.8,0,Math.PI*2);c.stroke();c.setLineDash([]);
        // ink bubble effect
        c.globalAlpha=0.12;
        for(var bi=0;bi<3;bi++){var bx=z.x+Math.cos(g.time*0.05+bi*2.1)*z.r*0.5;
          var by=z.y+Math.sin(g.time*0.04+bi*1.7)*z.r*0.4;
          c.fillStyle=C.ink;c.beginPath();c.arc(bx,by,2+rn(0,2),0,Math.PI*2);c.fill()}
      }
    });
    c.globalAlpha=1;
  }else if(st.id==="mirror"){
    // mirror frame decorations
    c.globalAlpha=0.12;c.strokeStyle=C.ink;c.lineWidth=2;
    var mf=40,mc=[[A.l+mf,A.t+mf,0],[A.r-mf,A.t+mf,1],[A.l+mf,A.b-mf,-1],[A.r-mf,A.b-mf,0.5]];
    mc.forEach(function(m){c.save();c.translate(m[0],m[1]);c.rotate(m[2]);
      c.strokeRect(-18,-24,36,48);c.beginPath();c.moveTo(-14,-20);c.lineTo(14,-20);c.stroke();
      c.restore()});
    // shimmer lines
    c.globalAlpha=0.04+0.03*Math.sin(g.time*0.06);c.strokeStyle=C.paper;c.lineWidth=1;
    for(var mli=0;mli<4;mli++){var mly=A.t+(A.b-A.t)*(0.2+mli*0.2)+Math.sin(g.time*0.03+mli)*8;
      c.beginPath();c.moveTo(A.l+20,mly);c.lineTo(A.r-20,mly);c.stroke()}
    // ghost reflection
    var p=g.player,grx=W/2+(W/2-p.x)*0.3,gry=H/2+(H/2-p.y)*0.3;
    c.globalAlpha=0.06;c.fillStyle=C.paper;
    c.beginPath();c.arc(grx,gry,12,0,Math.PI*2);c.fill();
    c.globalAlpha=1;
  }else if(st.id==="inktide"){
    // v3.4: 墨潮 — pulsing ink ring from center
    var tideR=120+60*Math.sin(g.time*0.02);
    c.globalAlpha=0.12+0.06*Math.sin(g.time*0.02);c.fillStyle="rgba(23,19,16,0.8)";
    c.beginPath();c.arc(W/2,H/2,tideR,0,Math.PI*2);c.fill();
    c.globalAlpha=0.3;c.strokeStyle=C.accent;c.lineWidth=2;
    c.beginPath();c.arc(W/2,H/2,tideR,0,Math.PI*2);c.stroke();
    // inner ripple
    c.globalAlpha=0.15;c.strokeStyle=C.ink;c.lineWidth=1;c.setLineDash([3,6]);
    c.beginPath();c.arc(W/2,H/2,tideR*0.6,0,Math.PI*2);c.stroke();c.setLineDash([]);
    // outward ink drops
    c.globalAlpha=0.08;
    for(var di=0;di<6;di++){var dAng=g.time*0.01+di*Math.PI/3;var dR=tideR+15+Math.sin(g.time*0.05+di)*8;
      c.fillStyle=C.ink;c.beginPath();c.arc(W/2+Math.cos(dAng)*dR,H/2+Math.sin(dAng)*dR,3,0,Math.PI*2);c.fill()}
    c.globalAlpha=1;
  }
}

// ════════════════════════════════════════════════════════════════
// § COMBAT — attacks, damage, kills, dodge, wave management
// ════════════════════════════════════════════════════════════════

function spawnReturnInk(g,atk){
  var p=g.player,a=atk.angle!=null?atk.angle:p.facing;
  var power=Math.max(1,p.stats.returnInk||0);
  var dist=atk.range?atk.range*0.65:(atk.r||80)*0.45;
  var x=atk.x+Math.cos(a)*dist,y=atk.y+Math.sin(a)*dist,spd=5;
  pushAttack(g,{x:x,y:y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
    dmg:Math.max(1,Math.floor(atk.dmg*(0.3+power*0.08))),crit:false,r:5*Math.min(p.stats.projSize,CAPS.projSize),
    life:34,maxLife:34,type:"proj",bounce:true,bounced:false,pierce:false,
    hitMap:{},echo:true});
}

function addAttack(g,atk){
  var p=g.player;
  if(atk.type==="proj"){
    if(atk.bounce==null)atk.bounce=!!p.bounce;
    if(atk.bounced==null)atk.bounced=false;
  }else if((p.bounce||p.stats.returnInk>0)&&!atk.echo){
    spawnReturnInk(g,atk);
  }
  pushAttack(g,atk);
}

function onEnemyKilled(g,e,source,opts){
  var p=g.player;
  if(e.killed)return;
  e.killed=true;e.hp=0;
  snd("enemyDeath");
  if(e.isBoss)snd("bossDeath");
  var baseFreeze=e.isBoss?22:9;
  if(e.isBoss)g.slowMo=30;
  if(baseFreeze===9&&p.killAtkTimer>0)baseFreeze=4;
  g.freezeT=Math.max(g.freezeT,baseFreeze);shake(g,e.isBoss?16:8,e.isBoss?7:4);
  g.kills++;g.killStreak++;g.killStreakT=TUNING.killStreakWindow;
  // Kill streak milestone effects (handled by KILL_MILESTONES loop below)
  g.waveKills++;
  g.killFeed.push({name:e.name,isBoss:e.isBoss,isElite:e.elite,time:g.time});
  if(g.killFeed.length>5)g.killFeed.shift();
  if(g.waveFirstKillT===0)g.waveFirstKillT=g.time;
  if(p.atkFormation)p.atkFormCount++;
  if(p.vortexOnKill)p.vortexKills=(p.vortexKills||0)+1;
  if(p.formationLeech)g.formations.forEach(function(fm){fm.life=Math.min(fm.maxLife,fm.life+15)});
  if(p.killPulse){forEachLiveEnemy(g,function(oe){if(oe===e)return;
    var kd=dstSq(e,oe);if(kd<RANGES.killPulse*RANGES.killPulse){var kdx=oe.x-e.x,kdy=oe.y-e.y,kl=Math.sqrt(kd)||1;
      var kpush=Math.max(1,(RANGES.killPulse-kl)/RANGES.killPulse*6);
      oe.x+=kdx/kl*kpush;oe.y+=kdy/kl*kpush}});
    spawnP(g,e.x,e.y,"ink",14);spawnP(g,e.x,e.y,"accent",6)}
  if(p.killSpeedBurst){p.speedBurstT=TUNING.speedBurstDuration;spawnP(g,p.x,p.y,"moss",6)}
  if(p.yinFuHeal&&source==="soul"){p.hp=Math.min(p.hp+1,p.maxHp);spawnP(g,p.x,p.y,"spirit",3)}
  if(p.breathOnKill){p.breathTicks=360;spawnP(g,p.x,p.y,"moss",4)}
  if(p.killBurstHeal&&p.hp<p.maxHp*0.5){p.hp=Math.min(p.hp+8,p.maxHp);spawnP(g,p.x,p.y,"moss",4)}
  if(p.killSplashHeal&&!e.isBoss){
    var _r=RANGES.splashBoom*RANGES.splashBoom;
    forEachLiveEnemy(g,function(oe){if(oe!==e&&dstSq(e,oe)<_r){
      damageEnemy(g,oe,Math.max(1,Math.ceil(p.stats.dmg*0.2)),"killSplashHeal")}});
    var _heal=2;p.hp=Math.min(p.hp+_heal,p.maxHp);
    spawnP(g,e.x,e.y,"moss",4);spawnP(g,e.x,e.y,"accent",3)}
  // 墨散芝：击杀小怪大范围溅射两次轻伤+回3血
  if(p.killSplashWideHeal&&!e.isBoss){
    var _mwR=RANGES.buffAura*RANGES.buffAura*0.36;var _mwD=Math.max(1,Math.ceil(p.stats.dmg*0.12));
    forEachLiveEnemy(g,function(oe){if(oe!==e&&dstSq(e,oe)<_mwR)damageEnemy(g,oe,_mwD,"wideHeal")});
    forEachLiveEnemy(g,function(oe){if(oe!==e&&dstSq(e,oe)<_mwR)damageEnemy(g,oe,_mwD,"wideHeal")});
    p.hp=Math.min(p.hp+3,p.maxHp);
    spawnP(g,e.x,e.y,"moss",5);spawnP(g,p.x,p.y,"moss",3)}
  if(p.scentStreak){g.killStreakT+=15;if(g.killStreakT>150)g.killStreakT=150}
  // 墨疾风：近战击杀加速
  if(p.meleeMobility&&g.weapon.type==="melee"){p.killSpdTimer=60;p.killAtkTimer=60;spawnP(g,p.x,p.y,"moss",4)}
  // 墨劫环：击杀范围伤害
  if(p.killAOE&&!e.isBoss){
    var _aor=70*70;var _aod=Math.max(1,Math.ceil(p.stats.dmg*0.25));
    forEachLiveEnemy(g,function(oe){if(oe!==e&&dstSq(e,oe)<_aor)damageEnemy(g,oe,_aod,"killAOE")});
    spawnP(g,e.x,e.y,"ink",6);spawnP(g,e.x,e.y,"accent",3)}
  // 墨魂引：击杀追踪弹
  if(p.soulKill&&!e.isBoss){
    var _near=null,_nd=120*120;
    forEachLiveEnemy(g,function(oe){if(oe!==e){var d=dstSq(oe,e);if(d<_nd){_nd=d;_near=oe}}});
    if(_near){
      var _dx=_near.x-e.x,_dy=_near.y-e.y,_dl=Math.sqrt(_dx*_dx+_dy*_dy)||1;
      pushAttack(g,{x:e.x,y:e.y,vx:_dx/_dl*5,vy:_dy/_dl*5,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.3)),r:4,life:50,type:"proj",hitOnce:true,owner:"player"});
      spawnP(g,e.x,e.y,"accent",3);
    }
  }
  // 墨续命：击杀回血+无敌
  if(p.killSurvive&&!e.isBoss){p.hp=Math.min(p.hp+2,p.maxHp);p.invTimer=Math.max(p.invTimer||0,20);spawnP(g,p.x,p.y,"moss",3)}
  if(g.killStreak>g.maxCombo)g.maxCombo=g.killStreak;
  if(e.elite){g.eliteKills++;spawnP(g,e.x,e.y,"gold",3);shake(g,6,4)}
  if(source==="fire")g.fireKills++;
  // 墨焰溅：火焰击杀溅射
  if(p.fireSplash&&source==="fire"&&!e.isBoss){
    var fsR=55;var fsDmg=Math.max(1,Math.ceil(p.stats.dmg*(p.fireSplashRatio||0.2)));
    forEachLiveEnemy(g,function(oe){if(dstSq(e,oe)<fsR*fsR)damageEnemy(g,oe,fsDmg,"fire")});
    spawnP(g,e.x,e.y,"fire",6)}
  // 墨涟爆：溅射源击杀时概率二次爆炸
  if(p.splashDeathBoom&&!e.isBoss&&(source==="splash"||source==="fire"||source==="killExplode"||source==="critShrapnel"||source==="executeExplode")){
    if(Math.random()<(p.splashDeathBoomChance||0.4)){
      var sbR=RANGES.splashBoom*RANGES.splashBoom;var sbDmg=Math.max(1,Math.ceil(p.stats.dmg*(p.splashDeathBoomRatio||0.35)));
      var boomHit=0;
      forEachLiveEnemy(g,function(oe){if(dstSq(e,oe)<sbR){damageEnemy(g,oe,sbDmg,"splashBoom");boomHit++}});
      if(boomHit>0)pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:"爆",life:25,maxLife:25,reason:"hint"},LIMITS.floatTexts);
      spawnP(g,e.x,e.y,"ink",8);spawnP(g,e.x,e.y,"accent",4);shake(g,4,3);snd("hit")}}
  if(source==="killExplode")g.killExplodeKills++;
  if(source==="executeExplode")g.executeKills=(g.executeKills||0)+1;
  if(p.blindT>0)g.blindKills++;
  if(p.lowHpBurstT>0)g.lowHpBurstKills=(g.lowHpBurstKills||0)+1;
  if(e.type==="mozhuhou")g.mozhuhouKills=(g.mozhuhouKills||0)+1;
  if(g.kills===10||g.kills===25||g.kills===50||g.kills===100)snd("killMilestone");
  // 回斩进化：击杀后下次攻击增伤
  if(p.killDmgBoost)p._killBoost=true;
  // 墨召魂引：击杀召唤墨魂
  if(p.killSummonSpirit&&Math.random()<(p.killSummonChance||0.25)){
    p.inkSpiritCount=(p.inkSpiritCount||0)+1;
    p.inkSpiritMax=(p.inkSpiritMax||0)+1;
    spawnP(g,e.x,e.y,"accent",6);snd("summon")}
  // kill streak milestones
  var ks=g.killStreak;
  for(var kmi=0;kmi<KILL_MILESTONES.length;kmi++){var k=KILL_MILESTONES[kmi];if(ks===k.at){
    pushLimited(g.floatTexts,{x:W/2,y:H/2,text:k.text,life:k.life,maxLife:k.life,reason:"streak"},LIMITS.floatTexts);
    spawnP(g,p.x,p.y,k.pCol,k.pCnt);if(k.gold)spawnP(g,p.x,p.y,"gold",k.gold);
    if(k.sh)shake(g,k.sh,k.shA);if(k.rf)g.relicFlash=k.rf;snd("comboMilestone");break}}
  if(e.deathBuff){forEachLiveEnemy(g,function(oe){if(oe===e)return;
    if(dstSq(e,oe)<e.deathBuffR*e.deathBuffR){oe.buffed=e.deathBuffT;oe.buffSrc=e}})}
  var dcol=DEATH_COLOR[e.type]||"ink";spawnInk(g,e.x,e.y,16,dcol);spawnInk(g,e.x,e.y,8,"accent");
  spawnP(g,e.x,e.y,dcol,e.isBoss?12:6);
  if(e.elite){spawnInk(g,e.x,e.y,12,"gold");for(var ei=0;ei<8;ei++){var ea=ei*Math.PI/4;
    spawnP(g,e.x+Math.cos(ea)*16,e.y+Math.sin(ea)*16,"gold",2)}
    // 墨将令：精英击杀爆发墨汁
    if(p.eliteKillBurst){g.enemies.forEach(function(nb){if(nb.hp<=0||nb===e||nb.isBoss)return;
      if(dstSq(e,nb)<80*80)damageEnemy(g,nb,Math.ceil(p.stats.dmg*8),"eliteBurst")});
      spawnP(g,e.x,e.y,"ink",10);spawnP(g,e.x,e.y,"accent",6)}
    // Elite deathburst: damage zone after frame-based delay
    if(e.eliteAbility==="deathburst"){
      pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:"爆",life:25,maxLife:25,reason:"deathburst"},LIMITS.floatTexts);
      g.pendingDeathbursts=g.pendingDeathbursts||[];
      g.pendingDeathbursts.push({x:e.x,y:e.y,dmg:Math.ceil(e.dmg*1.5),timer:30,maxTimer:30,r:50})}
    // 精英击杀奖励：随机临时buff
    var eliteBuff=pick(["spd","atk","heal"]);
    if(eliteBuff==="spd"){p.killSpdTimer=Math.max(p.killSpdTimer,180);
      pushLimited(g.floatTexts,{x:p.x,y:p.y-20,text:"疾",life:40,maxLife:40,reason:"eliteBuff"},LIMITS.floatTexts)}
    else if(eliteBuff==="atk"){p.killAtkTimer=Math.max(p.killAtkTimer,180);
      pushLimited(g.floatTexts,{x:p.x,y:p.y-20,text:"锐",life:40,maxLife:40,reason:"eliteBuff"},LIMITS.floatTexts)}
    else{p.hp=Math.min(p.maxHp,p.hp+8);
      pushLimited(g.floatTexts,{x:p.x,y:p.y-20,text:"愈",life:40,maxLife:40,reason:"eliteBuff"},LIMITS.floatTexts)}
    spawnP(g,p.x,p.y,"gold",4);snd("relicPickup");
  }
  // 鬼火诅咒：死亡产生追踪魂球
  if(p.soulOrbCurse&&!e.isBoss){g.soulOrbs.push({x:e.x,y:e.y,r:6,spd:1.5,dmg:Math.max(3,Math.ceil(e.dmg*0.4)),life:180})}
  // 墨师珠：击杀产生减速墨池
  if(p.killSlowPool&&!e.isBoss){pushLimited(g.fires,{x:e.x,y:e.y,r:28,life:60,maxLife:60,dmg:0,owner:"player",slow:true},LIMITS.fires)}
  // 墨罐死后减速墨池
  if(e.deathSlow){pushLimited(g.frosts,{x:e.x,y:e.y,r:e.deathSlowR||80,life:e.deathSlowT||120,maxLife:e.deathSlowT||120},LIMITS.frosts);
    spawnInk(g,e.x,e.y,12,"ink");spawnP(g,e.x,e.y,"ink",6)}
  // 墨爆印：近战击杀爆炸
  if(p.killExplode&&g.weapon.type==="melee"&&!e.isBoss){
    var keR=50;var keDmg=Math.max(1,Math.ceil(p.stats.dmg*(p.killExplodeRatio||0.4)));
    forEachLiveEnemy(g,function(oe){if(dstSq(e,oe)<keR*keR)damageEnemy(g,oe,keDmg,"killExplode")});
    spawnP(g,e.x,e.y,"ink",8);spawnP(g,e.x,e.y,"accent",4);shake(g,4,3);snd("hit")}
  // 蚀墨池：击杀留持续伤害区
  if(p.killDotZone&&!e.isBoss){
    pushLimited(g.frosts,{x:e.x,y:e.y,r:40,life:90,maxLife:90,dmg:p.killDotDmg||1},LIMITS.frosts);
    spawnInk(g,e.x,e.y,6,"ink")}
  // 武器特化击杀粒子
  var wt=g.weapon.type;
  if(wt==="melee"){for(var wi=0;wi<5;wi++)spawnP(g,e.x+rn(-8,8),e.y+rn(-8,8),"ink",1)}
  else if(wt==="ranged"){for(var wi=0;wi<3;wi++)spawnP(g,e.x,e.y,"moss",2)}
  else if(wt==="aoe"){for(var wi=0;wi<4;wi++){var wa=wi*Math.PI/2;spawnP(g,e.x+Math.cos(wa)*10,e.y+Math.sin(wa)*10,"moss",1)}}
  else if(wt==="dash"){for(var wi=0;wi<4;wi++)spawnP(g,e.x+rn(-10,10),e.y+rn(-10,10),"accent",2)}
  else if(wt==="summon"){for(var wi=0;wi<3;wi++)spawnP(g,e.x+rn(-8,8),e.y+rn(-8,8),"accent",1);spawnP(g,e.x,e.y,"ink",2)}
  // Boss死亡额外爆发
  if(e.isBoss){for(var bi=0;bi<16;bi++){var ba=bi*Math.PI*2/16;
    spawnP(g,e.x+Math.cos(ba)*15,e.y+Math.sin(ba)*15,"accent",2);
    spawnP(g,e.x+Math.cos(ba)*30,e.y+Math.sin(ba)*30,"gold",1)}
    for(var bi2=0;bi2<24;bi2++){var ba2=bi2*Math.PI*2/24;
      spawnInk(g,e.x+Math.cos(ba2)*rn(20,50),e.y+Math.sin(ba2)*rn(20,50),2,"boss")}
    g.freezeT=Math.max(g.freezeT,30);shake(g,20,10);g.slowMo=Math.max(g.slowMo||0,30);
    pushLimited(g.floatTexts,{x:e.x,y:e.y-40,text:"邪祟伏诛",life:80,maxLife:80,reason:"bossDeath"},LIMITS.floatTexts)}
  g.execFlash=e;
  stageOnEnemyKilled(g,e);
  if(e.isBoss&&!e.midBoss){g.bossKilled=true;if(e.type==="mojiangjun")g.mojiangjunKilled=true;
    if(e.type==="moguiwang")g.moguiwangKilled=true;
    // Boss kill celebration
    g.bossCelebrationT=120;g.freezeT=Math.max(g.freezeT,120);
    shake(g,28,14);if(g.freezeT<8)g.freezeT=8;
    for(var bpi2=0;bpi2<10;bpi2++)spawnP(g,W/2+rn(-50,50),H/2+rn(-40,40),"gold",1);
    for(var bci=0;bci<20;bci++){var bca=bci*Math.PI*2/20;
      spawnP(g,e.x+Math.cos(bca)*e.r,e.y+Math.sin(bca)*e.r,"gold",3)}
    spawnInk(g,e.x,e.y,20,"gold");spawnInk(g,e.x,e.y,12,"accent");}
  if(g.waveSpecial==="survival"&&g.survivalKillsNeeded>0)g.survivalKillsNeeded--;
  if(e.isBoss)spawnJudgment(g,e,"boss");
  else if(opts&&opts.crit&&g.weapon.type==="melee")spawnJudgment(g,e,"crit");
  else if(opts&&opts.weakpoint)spawnJudgment(g,e,"weak");
  else if(opts&&opts.combo3)spawnJudgment(g,e,"combo");
  if(p.fireOnKill&&source!=="fire")addFire(g,{x:e.x,y:e.y,r:28,life:120,dmg:2,
    owner:"player",kind:"phosphor",expanded:false});
  // 墨童：死亡延迟爆炸
  if(e.deathBomb){g.pendingDeathbursts=g.pendingDeathbursts||[];
    g.pendingDeathbursts.push({x:e.x,y:e.y,dmg:e.deathBombDmg,timer:e.deathBombDelay,maxTimer:e.deathBombDelay,r:e.deathBombR,type:"motong"})}
  if(p.killHeal>0){var oldHp=p.hp;p.hp=Math.min(p.maxHp,p.hp+p.killHeal);
    var healed=p.hp-oldHp;if(healed>0){g.totalHealed+=healed;pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-12,text:"+"+healed,life:30,maxLife:30,reason:"heal"},LIMITS.floatTexts)}}
  if(p.killHealChance>0&&Math.random()<p.killHealChance){var oldHp2=p.hp;var healAmt2=p.killHealAmt||2;
    p.hp=Math.min(p.maxHp,p.hp+healAmt2);g.totalHealed+=(p.hp-oldHp2);
    var healed2=p.hp-oldHp2;if(healed2>0)pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-18,text:"+"+healed2,life:30,maxLife:30,reason:"heal"},LIMITS.floatTexts);
    // 续命墨：溢出治疗转护盾
    if(p.healToShield){var overflow=healAmt2-healed2;if(overflow>0){p.shieldStack=(p.shieldStack||0)+overflow;pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-24,text:"盾+"+overflow,life:30,maxLife:30,reason:"shield"},LIMITS.floatTexts);spawnP(g,p.x,p.y,"accent",3)}}
    // 墨盈溢：溢出治疗转爆炸AOE(3倍)
    if(p.healOverflowBoom){var ovb=healAmt2-healed2;if(ovb>0){var obDmg=ovb*3;var obR=RANGES.splashBoom*RANGES.splashBoom*0.64;
      forEachLiveEnemy(g,function(oe){if(dstSq(oe,p)<obR)damageEnemy(g,oe,obDmg,"healBoom")});
      pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-28,text:"溢"+obDmg,life:30,maxLife:30,reason:"dmg"},LIMITS.floatTexts);
      spawnP(g,p.x,p.y,"fire",5);spawnP(g,p.x,p.y,"accent",3);shake(g,4,3)}}}
  if(p.killSpeed)p.killSpdTimer=45;
  if(p.killAtkSpd)p.killAtkTimer=90;
  // v1.3 遗物触发
  if(p.execCritBonus&&opts&&opts.crit)p.execCritT=60;
  if(p.weakSpread&&opts&&opts.weakpoint){
    var spreadN=0;
    g.enemies.forEach(function(o){if(o!==e&&o.hp>0&&dstSq(o,e)<RANGES.weakSpread*RANGES.weakSpread){p.weakTargets[o.id]=90;spreadN++}});
    if(spreadN>0)pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:"散",life:35,maxLife:35,reason:"spread"},LIMITS.floatTexts)}
  if(p.meleeCdRefund&&g.weapon.type==="melee"&&source==="hit")p.atkCd=Math.max(0,p.atkCd-8);
  if(p.soulKillChain&&source==="soul"){
    var nr=findNearestEnemy(g,e.x,e.y);
    if(nr.enemy)damageEnemy(g,nr.enemy,Math.floor(8+p.stats.dmg*3),"soul");
  }
  if(p.fireExpand&&source==="fire"){
    g.fires.forEach(function(f){if(f.owner==="player"&&f.kind==="phosphor"&&!f.expanded&&dstSq(f,e)<RANGES.fireExpand*RANGES.fireExpand){
      f.r=Math.max(f.r,42);f.expanded=true;spawnInk(g,f.x,f.y,4,"fire");
      pushLimited(g.floatTexts,{x:f.x,y:f.y-15,text:"扩",life:20,maxLife:20,reason:"hint"},LIMITS.floatTexts)}})}
  // 分身鬼分裂
  if(e.splitter&&!e.isSplit){
    for(var si=0;si<e.splitCount;si++){
      var sa=rn(0,Math.PI*2),sd=e.r*2;
      var splitHp=Math.max(1,Math.floor(e.maxHp*e.splitHpRatio));
      if(g.enemies.length<LIMITS.enemies)g.enemies.push(mkMinion(e.x+Math.cos(sa)*sd,e.y+Math.sin(sa)*sd,e.type,
        splitHp,e.spd*1.2,10,Math.floor(e.dmg*0.5),e.atkR,e.atkCd,e.col,e.edge,{isSplit:true}));
    }
    spawnInk(g,e.x,e.y,10,"soul");snd("splitPop");
  }
  if(e.spawnsOnDeath&&!e.isSplit){for(var spi=0;spi<e.spawnCount;spi++){var sa=rn(0,Math.PI*2);spawnEnemy(g,e.spawnType,{x:e.x+Math.cos(sa)*e.r*2,y:e.y+Math.sin(sa)*e.r*2,noScale:true});};spawnInk(g,e.x,e.y,8,"accent")}
  // v3.4: mogu revive once (like mask stage mod but enemy-intrinsic)
  if(e.reviveOnce&&!e._revived){e._revived=true;e.hp=Math.max(8,Math.floor(e.maxHp*(ETYPE[e.type]&&ETYPE[e.type].reviveHpRatio||0.4)));e.maxHp=e.hp;
    e.spd*=1.1;e.dmg=Math.max(1,Math.floor(e.dmg*0.8));e.r=Math.max(8,e.r*0.9);
    e.col="rgba(180,170,155,0.2)";e.edge=C.accent;e.hitFlash=8;e.deathT=0;e.killed=false;
    spawnInk(g,e.x,e.y,12,"accent");
    pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:"重组",life:50,maxLife:50,reason:"revive"},LIMITS.floatTexts);
    return}
  // 纸鸢匠死亡清场
  if(e.summoner){
    g.enemies.forEach(function(o){if(o.hp>0&&o._summonerId===e.id){o.hp=0;o.killed=true;o.deathT=12}});
  }
  if(p.killShield){p.shieldStack=Math.min(p.shieldStack+1,CAPS.shieldStack)}
  // 纸鸢引：击杀计数
  if(p.summonKite){p.kiteKills++;
    if(p.kiteKills>=5){p.kiteKills=0;
      pushLimited(g.kites,{x:p.x,y:p.y,targetId:0,life:180,maxLife:180,
        dmg:Math.floor(g.weapon.dmg*p.stats.dmg*0.8),speed:3.5,r:8,angle:p.facing},LIMITS.kites);
      spawnInk(g,p.x,p.y,6,"accent")}}
}

function damageEnemy(g,e,dmg,source,opts){
  if(!e||e.hp<=0||e.killed)return false;
  var p=g.player;
  // v3.4 curse: 镜花 — miss chance + hit damage multiplier (only for direct hits)
  if(source==="hit"&&p.missChance&&Math.random()<p.missChance){spawnP(g,e.x,e.y-15,"ash",3);return false}
  if(source==="hit"&&p.hitDmgMult)dmg=Math.floor(dmg*p.hitDmgMult);
  // kill streak bonus: 5+ → +10%, 10+ → +20%
  if(g.killStreak>=10)dmg=Math.floor(dmg*TUNING.killStreak10Dmg);
  else if(g.killStreak>=5)dmg=Math.floor(dmg*TUNING.killStreak5Dmg);
  if(e.hasShield&&e.shield>0)dmg=Math.floor(dmg*0.5);
  dmg=Math.floor(dmg*(e.armorMult||1));
  var actualDmg=Math.max(1,dmg);
  e.hp-=actualDmg;e.hitFlash=6;
  // 墨焚域：持续伤害累计30后引爆
  if(p.dotAccumBoom&&(source==="frost"||source==="fire"||source==="dot"||source==="splitDot"||source==="wideHeal")&&!e._dotBoomed){
    e._dotAccum=(e._dotAccum||0)+actualDmg;
    if(e._dotAccum>=30){e._dotBoomed=true;var dbDmg=Math.ceil(e._dotAccum*0.5);var dbR=RANGES.splashBoom*RANGES.splashBoom*0.5;
      forEachLiveEnemy(g,function(oe){if(oe!==e&&dstSq(e,oe)<dbR)damageEnemy(g,oe,dbDmg,"dotBoom")});
      spawnP(g,e.x,e.y,"fire",6);spawnP(g,e.x,e.y,"accent",4);shake(g,3,2)}}
  // 墨爆弹：敌人HP低于30%时自动引爆
  if(p.executeExplode&&e.hp>0&&e.hp<e.maxHp*0.3&&!e._execExploded){
    e._execExploded=true;
    var eeR=50;var eeDmg=Math.max(1,Math.ceil(p.stats.dmg*(p.executeExplodeRatio||0.5)));
    forEachLiveEnemy(g,function(oe){if(oe!==e&&dstSq(e,oe)<eeR*eeR)damageEnemy(g,oe,eeDmg,"executeExplode")});
    spawnP(g,e.x,e.y,"ink",8);spawnP(g,e.x,e.y,"accent",4);shake(g,4,3);snd("hit")}
  if(g)g.totalDmg+=actualDmg;
  if(e.hasShield&&e.shield>0){
    e.shield-=Math.max(1,Math.floor(dmg));
    if(e.shield<=0){e.shield=0;e.hasShield=false;e.shieldCd=e.shieldRegen;snd("shieldBreak");spawnInk(g,e.x,e.y,8,"ink");shake(g,5,3);if(g.freezeT<2)g.freezeT=2}
  }
  if(p.attackPin&&e.hp>0){e.pinned=30;spawnP(g,e.x,e.y,"accent",3)}
  if(p.corrosive&&e.hp>0){e.corrode=Math.min(3,(e.corrode||0)+1);e.corrodeT=100}
  if(e.hp<=0){
    if(tryStageRevive(g,e))return false;
    onEnemyKilled(g,e,source,opts);return true
  }
  return false;
}

function cleanupWave(g){
  g.eProj.length=0;
  g.attacks.length=0;
  g.particles.length=0;
  g.floatTexts.length=0;
  g.decoys.length=0;
  g.pendingDeathbursts.length=0;
  if(g.soulOrbs)g.soulOrbs.length=0;
  if(g.formations)g.formations.length=0;
  g.fires=g.fires.filter(function(f){return f.owner==="player"});
  g.merchant=null;
}

function startWave(g){
  snd("waveStart");
  cleanupWave(g);
  g.bossKilled=false;
  var w;
  if(g.wave<WAVE_BUDGETS.length&&WAVE_BUDGETS[g.wave]>0){
    // Procedural wave
    w=generateWave(g.wave,g.diff||"normal");
  }
  if(!w){
    // Mid-boss at wave 6 (halfway point) — 50% chance
    if(g.wave===6&&Math.random()<0.5&&g.diff!=="nightmare"){
      var midBoss=g.bossType||"boss";
      var midSupport=["zhikui","youhun","jiangshi","gudeng"];
      var midSup=[];
      for(var msi=0;msi<ri(1,2);msi++)midSup.push({t:pick(midSupport),n:1});
      w={label:"中阵 · "+(midBoss==="mojiangjun"?"墨将巡殿":midBoss==="moguiwang"?"墨渊涌动":"画皮小堂"),mod:pick(["ash","well","lantern"]),
        flavor:midBoss==="mojiangjun"?"墨将军的副将巡守此地，虽是分身，亦不可小觑。":midBoss==="moguiwang"?"墨渊深处涌出的古老存在，连空间都在颤抖。":"画皮娘子留下的一面在此拦路。",
        list:[{t:midBoss,n:1,midBoss:true}].concat(midSup)};
    }
  }
  if(!w){
    // Boss wave (last wave)
    var bossT=g.bossType||"boss";
    var supportPool=["gudeng","jiangshi","fenshen","zhikuang","zhikui","youhun"];
    var sup=[];
    for(var si=0;si<2+ri(0,2);si++)sup.push({t:pick(supportPool),n:1});
    w={label:"镇守 · "+(bossT==="mojiangjun"?"墨阵殿":bossT==="moguiwang"?"墨渊殿":"画皮堂"),mod:pick(["lantern","mask","inkpool","inktide"]),
      flavor:bossT==="mojiangjun"?"墨将军镇守此地。以墨为甲，以书为兵。":bossT==="moguiwang"?"墨鬼王从深渊中浮现。它是墨的本源，你的笔只是它的碎片。":"画皮娘子镇守此地。她有千面，你的刀只有一面。",
      list:[{t:bossT,n:1}].concat(sup)};
  }
  if(!w){g.state="victory";return}
  startStage(g,w);
  var enemyCount=w.list.reduce(function(s,e){return s+e.n},0);
  g.announce=w.label+" · "+getStageDef(w.mod).name+" · "+enemyCount+"敌";g.announceT=110;
  g.waveCleared=false;g.waveClearT=0;
  g._isBossWave=!!(w.list&&w.list.some(function(e){return e.t==="boss"||e.t==="mojiangjun"||e.t==="moguiwang"}));
  if(g._isBossWave){g.bossHurtThisWave=false;
    var bossT2=g.bossType||"boss";
    var bossName=bossT2==="mojiangjun"?"墨将军":bossT2==="moguiwang"?"墨鬼王":"画皮娘子";
    var bossSub=bossT2==="mojiangjun"?"以墨为甲，以书为兵":bossT2==="moguiwang"?"墨渊深处，万物归寂":"千面之下，你的刀只有一面";
    g.bossIntroT=110;g.bossIntroName=bossName;g.bossIntroSub=bossSub;
    // Load boss portrait
    var bp=document.getElementById("bossPortrait");
    if(bp&&window._bossPortraitBase){
      var pSrc=window._bossPortraitBase+"portrait-"+bossT2+".png";
      var pi=new Image();pi.onload=function(){bp.src=pSrc};pi.onerror=function(){bp.removeAttribute("src")};pi.src=pSrc;
    }
    // Shorten announce for boss waves — boss card takes priority
    g.announceT=70;}
  g.waveFirstKillT=0;g.waveKills=0;g.waveStartT=g.time;
  g.player.nineSealCount=0;g.player.nineSealReady=false;
  g.survivalCleared=false;g.survivalSpawnTimer=0;
  g.waveFlavor=w.flavor||"";
  if(g.wave>0)g.inkWipe=30;
  if(g.wave===0&&g.time===0)g.hintT=360;
  // Special wave handling
  var specialWave=w.special||null;
  g.waveSpecial=specialWave;
  var isAllEliteWave=false;
  if(specialWave==="elite"||specialWave==="elite_horde"){
    isAllEliteWave=true;g.player.allElite=true;
    g.announce=w.label+" · 精英潮";g.announceT=110;
    showHint(g,"boss","精英潮涌！所有敌人皆为精英。");
  }else if(specialWave==="horde"){
    g.announce=w.label+" · 群魔潮";g.announceT=110;
    showHint(g,"boss","群魔蜂拥而至！杀出一条血路。");
  }else if(specialWave==="survival"){
    g.announce=w.label+" · 生存";g.announceT=110;
    showHint(g,"boss","撑住！敌人源源不断。");
    g.survivalSpawnTimer=100;
    g.survivalKillsNeeded=Math.max(8,Math.floor(w.list.reduce(function(s,e){return s+e.n},0)*1.5));
  }
  // Boss wave — activate screen effect + entrance cinematic
  var hasBoss=w.list.some(function(e){return ETYPE[e.t]&&ETYPE[e.t].isBoss});
  var isMidBoss=w.list.some(function(e){return e.midBoss});
  if(hasBoss){g.bossWaveEntrance=isMidBoss?25:50;if(!isMidBoss)snd("bossIntro");
    var bossName=w.list.filter(function(e){return ETYPE[e.t]&&ETYPE[e.t].isBoss})[0];
    var bInfo=bossName?ETYPE[bossName.t]:null;
    showHint(g,"boss",(isMidBoss?"中Boss":"Boss战")+" — "+(bInfo?bInfo.tip:"小心应战"));}
  var frame=document.querySelector&&document.querySelector(".game-frame");
  if(frame){if(hasBoss)frame.classList.add("is-boss-wave");else frame.classList.remove("is-boss-wave")}
  w.list.forEach(function(e){for(var i=0;i<e.n;i++)spawnEnemy(g,e.t,e)});
  if(isAllEliteWave)g.player.allElite=false; // only reset if wave-set, preserve curse
  // 环境事件：wave 3+ 30%概率触发
  g.hazard=null;g.hazardTimer=0;g.hazardObjs=[];
  if(g.wave>=3&&Math.random()<0.3&&!hasBoss){var hz=pick(STAGE_HAZARDS);g.hazard=hz;g.hazardTimer=hz.interval;
    pushLimited(g.floatTexts,{x:W/2,y:60,text:"环境: "+hz.name+" — "+hz.desc,life:120,maxLife:120,reason:"hazard"},LIMITS.floatTexts)}
  // 灵噬：每波开始每只墨灵扣2HP
  if(g.player.spiritHpCost&&g.inkSpirits.length>0){var sc2=g.inkSpirits.length*2;g.player.hp=Math.max(1,g.player.hp-sc2);
    pushLimited(g.floatTexts,{x:g.player.x,y:g.player.y-g.player.r-14,text:"-"+sc2,life:25,maxLife:25,reason:"dmg"},LIMITS.floatTexts)}
  g.waveTotal=g.enemies.length;
  if(g.player.vortexOnKill)g.player.vortexKills=0;
  g.enemies.forEach(function(en){en.spawnGraceT=Math.max(en.spawnGraceT||0,TUNING.spawnGraceDuration)});
}

function pAtk(g){
  var p=g.player,w=g.weapon,s=p.stats;
  var fastAtk=p.killAtkSpd&&p.killAtkTimer>0;
  var cdMult=fastAtk?TUNING.fastAtkCdMult:1;
  var pMul=fastAtk?TUNING.fastAtkParticleMult:1;
  if(p.atkCd>0)return;
  if(p.formClarity){for(var fci=0;fci<g.formations.length;fci++){if(dstSq(g.formations[fci],p)<g.formations[fci].r*g.formations[fci].r){cdMult*=0.8;break}}}
  p.atkCd=Math.max(CAPS.atkCdFloor,Math.floor(w.cd*cdMult*s.atkSpd));p.atkCdMax=p.atkCd;p.atkCount++;
  if(p.atkHpCost&&p.hp>1){p.hp--;if(p.hp%10===0)snd("playerHurt")}
  // Combo window stays open while attacking, but count only increments on actual hits
  p.comboTimer=TUNING.comboWindow;
  // 蓄力（墨龙珠）
  var chargeBonus=1;
  if(p.chargeDmg>0&&p.chargeTimer>=TUNING.chargeThreshold){chargeBonus=1+p.chargeDmg;p.charged=true}
  p.chargeTimer=0;

  var rng=w.range*s.range;
  if(p.blindT>0)rng=Math.floor(rng*0.6);
  var effectiveSoul=p.soulDmg+(p.soulDmgPerRelic?g.relics.length:0);
  var dmg=Math.floor(w.dmg*s.dmg)+effectiveSoul;
  if(p.blindDmgBoost>0&&p.blindT>0)dmg=Math.floor(dmg*(1+p.blindDmgBoost));
  if(p.formDmgBonus&&g.formations.length>0)dmg=Math.floor(dmg*(1+g.formations.length*0.06));
  // 低血增伤（祟面香灰）
  if(p.lowHpDmg>0&&p.hp<=p.maxHp*TUNING.lowHpThreshold)dmg=Math.floor(dmg*(1+p.lowHpDmg));
  if(p.lowHpFury&&p.hp<=p.maxHp*0.5)dmg=Math.floor(dmg*TUNING.lowHpFuryDmgMult);
  // 低血增范围（血墨混染）
  if(p.lowHpRange&&p.hp<=p.maxHp*TUNING.lowHpRangeThreshold)rng*=TUNING.lowHpRangeMult;
  // 蓄力增伤
  dmg=Math.floor(dmg*chargeBonus);
  // 回斩进化：击杀后下次攻击增伤
  if(p._killBoost){dmg=Math.floor(dmg*TUNING.killBoostDmgMult);p._killBoost=false}
  // 暴击
  var effectiveCrit=Math.min(s.critRate+(p.execCritT>0?0.2:0)+(p.comboDmgBonus&&g.killStreak>=10?0.15:0),CAPS.critRate);
  var crit=Math.random()<effectiveCrit;
  if(crit)dmg=Math.floor(dmg*s.critDmg);
  else if(p.guxuePenalty)dmg=Math.floor(dmg*0.88);
  // justDodged bonus: all weapons get +20% damage after a successful dodge
  if(p.justDodged)dmg=Math.floor(dmg*1.2);
  // 夜行衣：迷雾中增伤+30%
  if(p.fogBonus&&g.fogActive)dmg=Math.floor(dmg*1.3);
  // 魂锁链：连斩加伤
  if(p.comboDmgBonus&&g.killStreak>0)dmg=Math.floor(dmg*(1+g.killStreak*0.03));
  // 蛭反：被吸附时增伤
  if(p.leechBuff&&p.leeches.length>0){dmg=Math.floor(dmg*1.25);p.atkCd=Math.max(CAPS.atkCdFloor,Math.floor(p.atkCd*0.65))}

  // 斩妖剑：multi决定同劈几刀
  if(w.type==="melee"){
    var comboArc=w.arc,comboRng=rng,comboDmg=dmg;
    if((p.comboCount+1)%3===0){comboArc=w.arc*TUNING.combo3Arc;comboRng=rng*TUNING.combo3Range;comboDmg=Math.floor(dmg*TUNING.combo3Dmg)}
    if(p.wideSlash)comboArc*=1.2;
    for(var si=0;si<s.multi;si++){
      var sOff=(si-(s.multi-1)/2)*0.18;
      addAttack(g,{x:p.x,y:p.y,angle:p.facing+sOff,arc:comboArc,range:comboRng,
        dmg:comboDmg,crit:crit,life:12,maxLife:12,type:"slash",
        pierce:(p.pierceOnDodge&&p.justDodged)||((p.comboCount+1)%3===0),
        hitMap:{}});
    }
    spawnInk(g,p.x+Math.cos(p.facing)*rng*0.6,p.y+Math.sin(p.facing)*rng*0.6,
      Math.max(2,Math.floor(((p.comboCount+1)%3===0?8:4)*pMul)),"ink");
  // 符骨笔：multi决定扇形弹数
  }else if(w.type==="ranged"){
    var basePSpd=w.spd||7,basePSize=8*Math.min(s.projSize,CAPS.projSize);
    var isBig=(p.comboCount+1)%5===0;
    for(var pi=0;pi<s.multi;pi++){
      var spread=(pi-(s.multi-1)/2)*0.13;
      var pa=p.facing+spread;
      var pSize=basePSize,pDmg=dmg,projSpd=basePSpd;
      if(isBig){pSize=basePSize*1.75;pDmg=Math.floor(dmg*1.6);projSpd*=0.85}
      addAttack(g,{x:p.x,y:p.y,vx:Math.cos(pa)*projSpd,
        vy:Math.sin(pa)*projSpd,dmg:pDmg,crit:crit,r:pSize,
        life:60,maxLife:60,type:"proj",bounce:p.bounce,bounced:false,
        pierce:p.projPierce||(p.pierceOnDodge&&p.justDodged)||isBig,
        burst:p.projBurst,split:p.bigSplit&&isBig,
        hitMap:{}});
    }
  // 镇魂铃：连段扩大范围，multi加额外圈
  }else if(w.type==="aoe"){
    var bellCombo=Math.min(p.comboCount,CAPS.bellCombo);
    for(var ringI=0;ringI<s.multi;ringI++){
      var decay=ringI>0?(p.ringNoDecay?0:0.25):0;
      var ar=rng*(1+bellCombo*0.06)*(1-ringI*0.2);
      addAttack(g,{x:p.x,y:p.y,r:ar,dmg:Math.floor(dmg*(1-decay)),crit:crit,
        life:20,maxLife:20,type:"ring",expand:ar/20,
        slow:p.ringSlow});
    }
    spawnInk(g,p.x,p.y,Math.max(2,Math.floor((4+Math.min(bellCombo,6))*pMul)),"moss");
  // 伏魔伞：宽弧线扫击，受伤后反击加伤
  }else if(w.type==="dash"){
    // 墨移：再闪回标记位置
    if(p.recallDash&&p.recallMark&&p.recallMark.life>0){
      spawnInk(g,p.x,p.y,10,"accent");spawnP(g,p.x,p.y,"ink",8);
      p.x=p.recallMark.x;p.y=p.recallMark.y;
      spawnInk(g,p.x,p.y,12,"accent");spawnP(g,p.x,p.y,"ink",8);shake(g,6,3);
      snd("playerDodge");p.recallMark.life=0;p.justDodged=true;p.justDodgedT=18;p.dashT=0;p.dodgeKills=(p.dodgeKills||0)+1;
      p.invTimer=Math.max(p.invTimer,TUNING.dodgeInvFrames);p.atkCd=0;return}
    var dashDmg=dmg,spdPower=moveScale(p);
    dashDmg=Math.floor(dashDmg*(1+Math.max(0,spdPower-1)*0.45));
    if(p.justDodged)dashDmg=Math.floor(dashDmg*1.8);
    var dashRng=rng*(0.9+spdPower*0.1);
    if(p.recallDash){p.recallMark={x:p.x,y:p.y,life:180};spawnP(g,p.x,p.y,"moss",4)}
    p.dashT=Math.floor(9+Math.min(5,Math.max(0,spdPower-1)*7));
    p.dashDx=Math.cos(p.facing)*12*spdPower;p.dashDy=Math.sin(p.facing)*12*spdPower;
    p.invTimer=Math.max(p.invTimer,TUNING.dodgeInvFrames);
    for(var di=0;di<s.multi;di++){
      var dOff=(di-(s.multi-1)/2)*0.16;
      addAttack(g,{x:p.x,y:p.y,angle:p.facing+dOff,arc:Math.PI*0.8,range:dashRng,
        dmg:dashDmg,crit:crit||p.justDodged,life:14,maxLife:14,type:"dashSlash",pierce:true});
    }
    spawnInk(g,p.x+Math.cos(p.facing)*dashRng*0.5,p.y+Math.sin(p.facing)*dashRng*0.5,Math.max(2,Math.floor((6+Math.floor(spdPower))*pMul)),"accent");
    if(p.dashReturn){
      addAttack(g,{x:p.x,y:p.y,angle:p.facing+Math.PI,arc:Math.PI*0.6,range:dashRng*0.8,
        dmg:Math.floor(dashDmg*0.7),crit:false,life:10,maxLife:10,type:"dashSlash",
        pierce:false,delay:8});
      spawnInk(g,p.x-Math.cos(p.facing)*dashRng*0.4,p.y-Math.sin(p.facing)*dashRng*0.4,4,"ink");
    }
  // 召魂幡：竖幡，自动发射追踪魂弹
  }else if(w.type==="summon"){
    var bx=p.x+Math.cos(p.facing)*50,by=p.y+Math.sin(p.facing)*50;
    var banR=36+(p.bannerRangeBonus||0);
    var banDmg=Math.floor(dmg*(p.bannerDmgMult||1));
    pushLimited(g.fires,{x:bx,y:by,r:banR,life:200,maxLife:200,dmg:banDmg,owner:"player",
      tickOffset:ri(0,15),healTickOffset:0,isBanner:true,bannerPierce:!!p.bannerPierce,
      bannerBurst:!!p.bannerBurst},LIMITS.fires);
    spawnInk(g,bx,by,6,"accent");spawnP(g,bx,by,"accent",4);
    addAttack(g,{x:bx,y:by,r:banR,life:12,maxLife:12,type:"ring",dmg:0});
    if(p.bannerDouble){
      var bx2=p.x+Math.cos(p.facing+Math.PI)*50,by2=p.y+Math.sin(p.facing+Math.PI)*50;
      pushLimited(g.fires,{x:bx2,y:by2,r:banR,life:200,maxLife:200,dmg:banDmg,owner:"player",
        tickOffset:ri(0,15),healTickOffset:0,isBanner:true,bannerPierce:!!p.bannerPierce,
        bannerBurst:!!p.bannerBurst},LIMITS.fires);
      spawnP(g,bx2,by2,"accent",3);
    }
  }
  // 墨刃遗物
  if(p.tripleBlade&&p.atkCount%3===0){
    addAttack(g,{x:p.x,y:p.y,vx:Math.cos(p.facing)*5,vy:Math.sin(p.facing)*5,
      dmg:Math.floor(dmg*0.6),crit:false,r:6*Math.min(s.projSize,CAPS.projSize),life:30,maxLife:30,type:"proj",
      bounce:p.bounce,bounced:false,pierce:false});
  }
  // 斩魔进化：每3击追踪墨刃
  if(p.seekBlade&&p.atkCount%3===0){
    var nr=findNearestEnemy(g,p.x,p.y);
    if(nr.enemy){
      var sa=Math.atan2(nr.enemy.y-p.y,nr.enemy.x-p.x);
      addAttack(g,{x:p.x,y:p.y,vx:Math.cos(sa)*6,vy:Math.sin(sa)*6,
        dmg:Math.floor(dmg*0.5),crit:false,r:5,life:35,maxLife:35,type:"proj",
        seek:true,seekTarget:nr.enemy});
    }
  }
  // 九转墨符：命中6次后触发全方向AOE爆发
  if(p.nineSealReady){
    var nsDmg=Math.floor(dmg*1.2);var nsR=100;
    forEachLiveEnemy(g,function(oe){if(dstSq(p,oe)<nsR*nsR)damageEnemy(g,oe,nsDmg,"nineSeal")});
    spawnP(g,p.x,p.y,"accent",12);spawnInk(g,p.x,p.y,8,"accent");
    shake(g,8,6);snd("bossEnrage");
    pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-20,text:"九转!",life:40,maxLife:40,reason:"critDmg"},LIMITS.floatTexts);
    p.nineSealReady=false;
  }
  if(p.charged){spawnInk(g,p.x,p.y,10,"accent");p.charged=false}
  if(w.type==="melee")snd("swordSlash");
  else if(w.type==="ranged")snd("brushShot");
  else if(w.type==="aoe")snd("bellRing");
  else if(w.type==="dash")snd("umbrellaDash");
  else if(w.type==="summon")snd("bannerPlace");
  p.justDodged=false;p.justDodgedT=0;
}

function hurtP(g,dmg,src){
  var p=g.player;
  if(p.invTimer>0)return;
  // 墨守阵：在守阵内减伤
  var inDefForm=false;
  for(var fi=0;fi<g.formations.length;fi++){var fm=g.formations[fi];
    if(fm.type==="def"&&dstSq(fm,p)<fm.r*fm.r){inDefForm=true;break}}
  if(inDefForm)dmg=Math.floor(dmg*TUNING.defFormReduction);
  if(p.formDef){for(var ffi=0;ffi<g.formations.length;ffi++){if(dstSq(g.formations[ffi],p)<g.formations[ffi].r*g.formations[ffi].r){dmg=Math.floor(dmg*TUNING.formDefReduction);break}}}
  // 墨魂甲：受伤3秒内再受伤减伤50%
  if(p.hurtShieldActive){
    if(p.hurtShieldTicks>0){dmg=Math.ceil(dmg*0.5);
      spawnP(g,p.x,p.y,"frost",3)}
    p.hurtShieldTicks=180}
  // 墨震甲：Boss命中减伤+爆裂反击
  if(p.bossHurtGuard&&src&&src.isBoss){
    dmg=Math.ceil(dmg*0.7);
    var _bgR=RANGES.splashBoom*RANGES.splashBoom*0.5;
    forEachLiveEnemy(g,function(oe){if(dstSq(oe,p)<_bgR)damageEnemy(g,oe,6,"bossGuard")});
    spawnP(g,p.x,p.y,"fire",6);spawnP(g,p.x,p.y,"accent",3);shake(g,5,3)}
  // 墨裂盛甲：分裂命中窗口内减伤35%
  if(p.splitShieldActive&&p.splitShieldTicks>0){dmg=Math.ceil(dmg*0.65);spawnP(g,p.x,p.y,"frost",3)}
  // 墨生防：满血时减伤25%
  if(p.fullHpDefense&&p.hp>=p.maxHp*0.9){dmg=Math.ceil(dmg*0.75);spawnP(g,p.x,p.y,"ash",3)}
  // 墨池加成：敌人在墨池中攻击力+30%
  if(src&&inkPoolCheck(g,src.x,src.y)===1)dmg=Math.floor(dmg*TUNING.inkPoolDmgMult);
  // 伤害减免
  dmg=Math.floor(dmg*(1-p.stats.def));
  // 墨旋誓印：静止受伤+30%
  if(p.stillDmgMult>0&&p.idleT>3)dmg=Math.floor(dmg*p.stillDmgMult);
  // 以血换血誓印：额外受伤倍率
  if(p.dmgTakenMult&&p.dmgTakenMult>1)dmg=Math.floor(dmg*p.dmgTakenMult);
  // 额外受伤（血墨混染）
  if(p.extraDmgTaken>0)dmg=Math.floor(dmg*(1+p.extraDmgTaken));
  // 墨血誓印：连击越高受伤越重（每层+5%，上限10层）
  if(p.comboVuln){var cvl=Math.min(g.killStreak,10);if(cvl>0)dmg=Math.floor(dmg*(1+cvl*0.05))}
  // 收阴袋护盾（在扣血前生效）
  if(p.killShield&&p.shieldStack>0){dmg=Math.max(1,dmg-p.shieldStack*4);p.shieldStack=0;
    snd("shieldBreak");spawnInk(g,p.x,p.y,6,"gold")}
  snd("playerHurt");
  // 冰墨壁：受伤生成冰墨区域
  if(p.hurtFrost){pushLimited(g.frosts,{x:p.x,y:p.y,r:50,life:60,maxLife:60},LIMITS.frosts);
    spawnP(g,p.x,p.y,"accent",4);snd("frostCreate")}
  // 墨铁壁：受击后短暂无敌+反击波
  if(p.hurtRetaliate){
    p.invTimer=Math.max(p.invTimer||0,60);
    var retDmg=p.hurtRetaliateDmg||5;
    forEachLiveEnemy(g,function(oe){if(dstSq(oe,p)<RANGES.retaliate*RANGES.retaliate)damageEnemy(g,oe,retDmg,"retaliate")});
    spawnP(g,p.x,p.y,"accent",8);shake(g,5,3);snd("shieldBreak")}
  // 墨咒铠：受击反伤
  if(p.curseSurv){
    p.invTimer=Math.max(p.invTimer||0,30);
    var _r=80*80;var _d=Math.max(1,Math.ceil(p.stats.dmg*0.4));
    forEachLiveEnemy(g,function(oe){if(dstSq(oe,p)<_r)damageEnemy(g,oe,_d,"curseSurv")});
    spawnP(g,p.x,p.y,"ink",6);shake(g,3,2);snd("shieldBreak")}
  // 墨棘盾：受伤溅射反击
  if(p.hurtSplash){
    var _r=RANGES.splashBoom*RANGES.splashBoom;var _d=p.hurtSplashDmg||5;
    forEachLiveEnemy(g,function(oe){if(dstSq(oe,p)<_r)damageEnemy(g,oe,_d,"hurtSplash")});
    spawnP(g,p.x,p.y,"accent",6);shake(g,4,3)}
  // 墨逆咒：受击发射追踪弹
  if(p.counterSpell){
    var _tn=null,_td=150*150;
    forEachLiveEnemy(g,function(oe){var d=dstSq(oe,p);if(d<_td){_td=d;_tn=oe}});
    if(_tn){var _tx=_tn.x-p.x,_ty=_tn.y-p.y,_tl=Math.sqrt(_tx*_tx+_ty*_ty)||1;
      pushAttack(g,{x:p.x,y:p.y,vx:_tx/_tl*6,vy:_ty/_tl*6,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.3)),r:5,life:45,type:"proj",hitOnce:true,owner:"player"});
      spawnP(g,p.x,p.y,"accent",3)}}
  if(p.decoyHP>0){var oldDecoy=p.decoyHP;p.decoyHP-=dmg;
    if(p.decoyHP<0){p.hp+=p.decoyHP;p.decoyHP=0}
    if(p.decoyHP<oldDecoy)spawnInk(g,p.x,p.y,4,"ghost")}
  else{p.hp-=dmg;pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-10,text:"-"+dmg,life:35,maxLife:35,reason:"dmg"},LIMITS.floatTexts)}
  // Elite vampire: attacker heals 30% of damage dealt
  if(src&&src.elite&&src.eliteAbility==="vampire"&&src.hp>0){
    var vh=Math.max(1,Math.floor(dmg*0.3));
    src.hp=Math.min(src.maxHp,src.hp+vh);spawnInk(g,src.x,src.y,3,"fire");snd("heal")}
  // 墨生莲：濒死爆发回血
  if(p.burstHeal&&!p.burstHealUsed&&p.hp>0&&p.hp<p.maxHp*0.25){
    p.burstHealUsed=true;p.hp=Math.ceil(p.maxHp*0.5);
    var _bd=Math.max(1,Math.ceil(p.stats.dmg*0.5));
    forEachLiveEnemy(g,function(oe){if(dstSq(oe,p)<90*90)damageEnemy(g,oe,_bd,"burstHeal")});
    spawnP(g,p.x,p.y,"moss",8);shake(g,8,5);snd("heal")}
  // 反伤（镇墓兽首）
  if(p.thorns>0&&src){damageEnemy(g,src,Math.floor(dmg*p.thorns),"thorns");
    spawnInk(g,src.x,src.y,4,"accent")}
  p.invTimer=TUNING.hurtInvFrames;shake(g,4,4);p.hurtFlash=12;
  g.hurtCount++;g.totalDmgTaken+=dmg;if(g._isBossWave)g.bossHurtThisWave=true;
  if(src)g.dmgDir={ang:ang(p,src),t:20};
  spawnInk(g,p.x,p.y,5,"accent");
  // 复活（招魂残幡）
  if(p.hp<=0){
    if(p.revive&&!p.hasRevived){p.hasRevived=true;p.hp=Math.floor(p.maxHp*TUNING.reviveHpRatio);
      p.invTimer=TUNING.reviveInvFrames;snd("revive");spawnInk(g,p.x,p.y,20,"accent");return}
    p.hp=0;g.freezeT=50;shake(g,16,10);
    var killerName=src&&src.name?src.name:(src&&src.type?src.type:"未知");
    g.deathCause=killerName;
    g.deathCircle={x:p.x,y:p.y,r:0,maxR:180,life:22,killer:killerName,wave:g.wave};
    spawnInk(g,p.x,p.y,35,"ink");spawnInk(g,p.x,p.y,20,"accent");
    for(var di=0;di<16;di++){var da=di*Math.PI*2/16;
      spawnP(g,p.x+Math.cos(da)*24,p.y+Math.sin(da)*24,"ink",2)}
    g.state="dying";snd("playerDeath")}
}

function hitE(g,atk,e){
  var p=g.player;
  if(p.comboTimer>0)p.comboCount++;else p.comboCount=1;
  var dmg=atk.dmg;
  // 连击递增（墨池残砚）
  if(p.comboDmg){
    if(p.comboHitId===e){p.comboHitCount=Math.min(p.comboHitCount+1,8);
      dmg=Math.floor(dmg*(1+p.comboHitCount*0.08))}
    else p.comboHitCount=0;
    p.comboHitId=e}
  // 墨血誓印：连击增伤（每层+8%，上限10层）
  if(p.comboDmgScale){var cbs=Math.min(p.comboCount-1,10);if(cbs>0)dmg=Math.floor(dmg*(1+cbs*0.08))}
  // 弱点标记（铜镜照妖）
  if(atk.crit&&p.weakpointDmg>0){p.weakTargets[e.id]=90}
  // 破妄瞳：首次攻击现形画皮必暴击+50%伤害
  var mimicFirstHit=false;
  if(p.mimicFirstCrit&&e.mimicRevealT>0){mimicFirstHit=true;atk.crit=true;dmg=Math.floor(dmg*1.5);e.mimicRevealT=0}
  var isWeak=p.weakTargets[e.id]&&p.weakTargets[e.id]>0;
  if(isWeak)dmg=Math.floor(dmg*(1+p.weakpointDmg));
  // 梭破进化：弹射物飞行距离增伤（最多+50%）
  if(p.projTravelDmg&&atk.spawnX!=null&&(atk.type==="proj"||atk.type==="spirit")){
    var travelDist=Math.sqrt((atk.x-atk.spawnX)*(atk.x-atk.spawnX)+(atk.y-atk.spawnY)*(atk.y-atk.spawnY));
    var distBonus=Math.min(0.5,travelDist/400);dmg=Math.floor(dmg*(1+distBonus));
  }
  var killed=damageEnemy(g,e,dmg,"hit",{crit:!!atk.crit,weakpoint:isWeak,combo3:p.comboCount%3===0});
  if(killed&&p.comboHitId===e)p.comboHitId=null;
  if(p.slowOnHit>0)e.slowT=Math.max(e.slowT,30);
  // 仙螺纹：幡魂弹减速
  if(p.bannerSpiritSlow&&atk.type==="spirit")e.slowT=Math.max(e.slowT,18);
  // 九转墨符：命中计数，6次后下次攻击AOE
  if(p.hasNineSeal){p.nineSealCount++;if(p.nineSealCount>=6){p.nineSealReady=true;p.nineSealCount=0}}
  // 墨散淬：近战溅射
  if(p.meleeSplash&&g.weapon.type==="melee"){var splashR=50;var splashDmg=Math.max(1,Math.floor(dmg*(p.meleeSplashRatio||0.3)));
    forEachLiveEnemy(g,function(oe){if(oe!==e&&!oe.killed&&dstSq(e,oe)<splashR*splashR)damageEnemy(g,oe,splashDmg,"splash")});
    spawnP(g,e.x,e.y,"ink",3)}
  // 墨契：暴击回血
  if(atk.crit&&p.critHeal){var _ch=Math.min(3,p.maxHp-p.hp);if(_ch>0){p.hp+=_ch;snd("critHeal");pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-12,text:"+"+_ch,life:30,maxLife:30,reason:"heal"},LIMITS.floatTexts)}}
  // 裂冰诀：暴击留冰冻区
  if(atk.crit&&p.frostOnCrit){
    pushLimited(g.frosts,{x:e.x,y:e.y,r:45,life:60,maxLife:60},LIMITS.frosts);snd("frostCreate");pushLimited(g.floatTexts,{x:e.x,y:e.y-18,text:"冻",life:20,maxLife:20,reason:"hint"},LIMITS.floatTexts)}
  // 墨火眼：暴击爆炸
  if(atk.crit&&p.critExplosion){
    var ceR=45;var ceDmg=Math.max(1,Math.ceil(p.stats.dmg*(p.critExplosionRatio||0.25)));
    var ceHit=0;
    forEachLiveEnemy(g,function(oe){if(oe!==e&&dstSq(e,oe)<ceR*ceR){damageEnemy(g,oe,ceDmg,"critExplosion");ceHit++}});
    spawnP(g,e.x,e.y,"accent",5);if(ceHit>0)pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:"爆",life:25,maxLife:25,reason:"critDmg"},LIMITS.floatTexts)}
  // 单次遍历：恐惧 + 魂链 + 爆裂
  if((atk.crit&&p.fearOnCrit)||p.soulChain||atk.burst){
    var doFear=atk.crit&&p.fearOnCrit;
    var fearR=RANGES.fear*RANGES.fear;
    var doSoul=!!p.soulChain,sc=0,soulR=RANGES.soulChain*RANGES.soulChain;
    g.enemies.forEach(function(o){
      if(o===e||o.hp<=0)return;
      var dSq=dstSq(o,e);
      if(doFear&&dSq<fearR)o.fearT=60;
      if(doSoul&&dSq<soulR&&sc<CAPS.soulChain){damageEnemy(g,o,Math.floor(atk.dmg*0.3),"soul");spawnP(g,o.x,o.y,"soul",3);if(sc===0)snd("soulChain");sc++}
      if(atk.burst&&dSq<RANGES.burst*RANGES.burst){damageEnemy(g,o,Math.floor(atk.dmg*0.4),"burst")}
    });
  }
  spawnInk(g,e.x,e.y,atk.crit?8:4,"ink");
  // 墨符坛：命中留DOT区
  if(p.hitDot){
    pushLimited(g.frosts,{x:e.x,y:e.y,r:35,life:p.hitDotLife||60,maxLife:p.hitDotLife||60,dmg:p.hitDotDmg||1},LIMITS.frosts);pushLimited(g.floatTexts,{x:e.x,y:e.y-15,text:"蚀",life:18,maxLife:18,reason:"hint"},LIMITS.floatTexts)}
  // 墨焚弹：远程点燃
  if(p.rangedFire&&atk&&atk.type==="proj"&&Math.random()<0.15){
    addFire(g,{x:e.x,y:e.y,r:24,life:80,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.15)),owner:"player",kind:"rangedFire"});
    spawnP(g,e.x,e.y,"accent",3)}
  // 墨焰爆：命中生火
  if(p.splashFire&&Math.random()<0.2){addFire(g,{x:e.x,y:e.y,r:20,life:60,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.15)),owner:"player",kind:"splashFire"});spawnP(g,e.x,e.y,"accent",3)}
  // 墨焚心：低血火焰爆发
  if(p.fireBurst&&p.hp<p.maxHp*0.3){addFire(g,{x:e.x,y:e.y,r:30,life:50,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.2)),owner:"player",kind:"fireBurst"});spawnP(g,e.x,e.y,"accent",4)}
  // 墨蚀域：命中留大范围持续溅射区
  if(p.splashDot){
    pushLimited(g.frosts,{x:e.x,y:e.y,r:50,life:p.splashDotLife||180,maxLife:p.splashDotLife||180,dmg:p.splashDotDmg||1},LIMITS.frosts);
    spawnP(g,e.x,e.y,"ink",4)}
  // 墨裂符：命中几率分裂弹幕
  if(p.splitOnHit&&Math.random()<(p.splitChance||0.2)){
    var nearE=null,nearD=RANGES.split*RANGES.split;
    forEachLiveEnemy(g,function(oe){if(oe!==e){var d=dstSq(oe,e);if(d<nearD){nearD=d;nearE=oe}}});
    if(nearE){
      var sd=nearE.x-e.x,sl2=Math.sqrt(sd*sd+(nearE.y-e.y)*(nearE.y-e.y))||1;
      pushLimited(g.attacks,{x:e.x,y:e.y,vx:sd/sl2*6,vy:(nearE.y-e.y)/sl2*6,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.4)),r:4,life:40,type:"proj",hitOnce:true,owner:"player"},LIMITS.attacks);
      spawnP(g,e.x,e.y,"accent",4);
      pushLimited(g.floatTexts,{x:e.x,y:e.y-18,text:"裂",life:20,maxLife:20,reason:"hint"},LIMITS.floatTexts)}}
  // 墨化蜂：命中几率分裂弹+留DOT区
  if(p.splitDot&&Math.random()<(0.2*(p.relicPower||1))){
    var _near=null,_nd=RANGES.split*RANGES.split;
    forEachLiveEnemy(g,function(oe){if(oe!==e){var d=dstSq(oe,e);if(d<_nd){_nd=d;_near=oe}}});
    if(_near){
      var _dx=_near.x-e.x,_dy=_near.y-e.y,_dl=Math.sqrt(_dx*_dx+_dy*_dy)||1;
      pushAttack(g,{x:e.x,y:e.y,vx:_dx/_dl*6,vy:_dy/_dl*6,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.35)),r:4,life:40,type:"proj",hitOnce:true,owner:"player"});
      spawnP(g,e.x,e.y,"accent",3)}
    pushLimited(g.frosts,{x:e.x,y:e.y,r:28,life:90,maxLife:90,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.2))},LIMITS.frosts)}
  if(atk.crit){g.critFlash=18;g.critKills=(g.critKills||0)+1;for(var ci=0;ci<8;ci++){var ca=ci*Math.PI/4;
    spawnP(g,e.x+Math.cos(ca)*10,e.y+Math.sin(ca)*10,"accent",2)}
    // 暴击额外浮字提示
    pushLimited(g.floatTexts,{x:e.x,y:e.y-e.r-22,text:"暴",life:25,maxLife:25,reason:"critHint"},LIMITS.floatTexts)}
  // 墨血刃：暴击回血
  if(p.critHeal&&atk.crit){p.hp=Math.min(p.hp+2,p.maxHp);spawnP(g,p.x,p.y,"moss",3)}
  if(atk.crit&&p.critShrapnel){var splDmg=Math.floor(atk.dmg*0.35);var shrapHit=0;forEachLiveEnemy(g,function(oe){if(oe===e)return;if(dstSq(e,oe)<RANGES.critShrapnel*RANGES.critShrapnel){damageEnemy(g,oe,splDmg,"shrapnel");shrapHit++}});spawnP(g,e.x,e.y,"accent",5);if(shrapHit>0)pushLimited(g.floatTexts,{x:e.x,y:e.y-18,text:"碎",life:22,maxLife:22,reason:"hint"},LIMITS.floatTexts)}
  shake(g,atk.crit?6:3,atk.crit?5:3);
  // floating damage number
  var dn=dmg,dr=atk.crit?"critDmg":(isWeak?"weakDmg":"dmg");
  pushLimited(g.floatTexts,{x:e.x+rn(-8,8),y:e.y-e.r-6,text:""+dn,life:30,maxLife:30,reason:dr},LIMITS.floatTexts);
  if(atk.type!=="ring"){
    if(atk.crit&&g.freezeT<3)g.freezeT=g.player.killAtkTimer>0?1:3;
    else if(g.freezeT<1)g.freezeT=1;
  }
  if(e.isBoss)g.bossFlash=8;
  // 爆裂粒子效果
  if(atk.burst){spawnInk(g,e.x,e.y,6,"fire")}
  // 分墨进化：大弹分裂
  if(atk.split){
    for(var si=0;si<3;si++){
      var sa=Math.atan2(atk.vy,atk.vx)+(si-1)*0.5;
      addAttack(g,{x:e.x,y:e.y,vx:Math.cos(sa)*5,vy:Math.sin(sa)*5,
        dmg:Math.floor(atk.dmg*0.35),crit:false,r:5,life:30,maxLife:30,
        type:"proj",bounce:null,bounced:false,pierce:false});
    }
  }
  // 墨生芝：分裂命中 15% 回血 1
  if(p.splitHealOnHit&&atk.split&&Math.random()<0.15){
    p.hp=Math.min(p.hp+1,p.maxHp);
    pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-18,text:"+1",life:25,maxLife:25,reason:"heal"},LIMITS.floatTexts);
    spawnP(g,p.x,p.y,"moss",3)}
  // 墨裂生符：分裂弹命中时18%几率回血
  if(p.splitHitHeal&&atk.split){
    if(Math.random()<0.18){p.hp=Math.min(p.hp+1,p.maxHp);
      pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-18,text:"+1",life:25,maxLife:25,reason:"heal"},LIMITS.floatTexts);
      spawnP(g,p.x,p.y,"moss",3)}}
  // 墨烈符爆：分裂命中25%几率小范围爆裂
  if(p.splitBoomOnHit&&atk.split){
    if(Math.random()<0.25){var _sr=RANGES.splashBoom*RANGES.splashBoom*0.64;var _sd=Math.max(1,Math.ceil(atk.dmg*0.45));
      forEachLiveEnemy(g,function(oe){if(oe!==e&&dstSq(e,oe)<_sr)damageEnemy(g,oe,_sd,"splitBoom")});
      spawnP(g,e.x,e.y,"fire",5);spawnP(g,e.x,e.y,"accent",3)}}
  // 墨裂盛甲：分裂命中刷新减伤窗口
  if(p.splitShieldActive&&atk.split){p.splitShieldTicks=120;spawnP(g,p.x,p.y,"frost",2)}
  // 铃木鱼：ring命中减速敌人追加魂伤（每ring限6次）
  if(p.ringSoulHit&&atk.type==="ring"&&e.slowT>0){
    if(!atk._soulHits)atk._soulHits=0;
    if(atk._soulHits<CAPS.ringSoul){atk._soulHits++;
      var soulDmg=Math.floor(3+p.stats.dmg*2);
      damageEnemy(g,e,soulDmg,"soul");
      spawnP(g,e.x,e.y,"soul",2);
      pushLimited(g.floatTexts,{x:e.x+rn(-6,6),y:e.y-e.r-14,text:"魂+"+soulDmg,life:30,maxLife:30,reason:"soul"},LIMITS.floatTexts);
    }
  }
  // 返照铜片：折返弹命中留墨爆
  if(p.bounceExplosion&&atk.bounced){
    addFire(g,{x:e.x,y:e.y,r:24,life:50,dmg:1,owner:"player",kind:"inkburst"});
    spawnInk(g,e.x,e.y,6,"ink");
  }
  if(!killed)snd("enemyHit");
}

function ptInArc(px,py,cx,cy,a,arc,range){
  var dx=px-cx,dy=py-cy,dSq=dx*dx+dy*dy;
  if(dSq>range*range)return false;
  var da=Math.atan2(dy,dx)-a;
  while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
  return Math.abs(da)<arc/2
}

function startDodge(g,dx,dy){
  var p=g.player;
  if(p.noDodge){p.dodgeQueued=false;return}
  if(p.dodgeT>0){p.dodgeQueued=false;return}
  // 输入缓冲：冷却最后8帧内按键会自动排队
  if(p.dodgeCd>8){p.dodgeQueued=false;return}
  if(p.dodgeCd>0){p.dodgeBufferT=8;p.dodgeBufferDx=dx;p.dodgeBufferDy=dy;p.dodgeQueued=false;return}
  var len=Math.sqrt(dx*dx+dy*dy),a=p.facing;
  if(len>0.1)a=Math.atan2(dy,dx);
  else if(p.lastDx||p.lastDy){a=Math.atan2(p.lastDy,p.lastDx)}
  p.dodgeT=TUNING.dodgeDuration;var cd=TUNING.dodgeCooldown;
  if(p.dodgeSpdScale){var excess=Math.round((p.stats.spd-1)*10)/10;if(excess>0)cd-=Math.min(10,Math.floor(excess/0.1)*2)}
  p.dodgeCd=cd;
  var sp=moveScale(p);
  p.dodgeDx=Math.cos(a)*9*sp;p.dodgeDy=Math.sin(a)*9*sp;
  p.invTimer=Math.max(p.invTimer,TUNING.dodgeInvFrames);
  p.justDodged=true;p.justDodgedT=TUNING.justDodgedWindow;p.dodgeQueued=false;p.dodgeKills=(p.dodgeKills||0)+1;
  // 墨冲影：冲刺反伤
  if(p.dashRetaliate){
    var _dr=90*90;var _dd=Math.max(1,Math.ceil(p.stats.dmg*0.35));
    forEachLiveEnemy(g,function(oe){if(dstSq(oe,p)<_dr)damageEnemy(g,oe,_dd,"dashRetaliate")});
    spawnP(g,p.x,p.y,"ink",5)}
  // 墨旋步：闪避留溅射区
  if(p.dodgeSplash){pushLimited(g.frosts,{x:p.x,y:p.y,r:35,life:60,maxLife:60,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.2))},LIMITS.frosts);spawnP(g,p.x,p.y,"ink",4)}
  // 甩脱墨蛭
  if(p.leeches.length>0){p.leeches.forEach(function(le){le.hp=0;le.attached=false;spawnInk(g,le.x,le.y,6,"accent")});p.leeches=[]}
  snd("playerDodge");spawnInk(g,p.x,p.y,7,"ink");
  for(var di=0;di<8;di++){var da=a+Math.PI+(di-3.5)*0.35,s=rn(1.5,3.5);
    pushLimited(g.particles,{x:p.x+Math.cos(a+Math.PI)*4,y:p.y+Math.sin(a+Math.PI)*4,
      vx:Math.cos(da)*s,vy:Math.sin(da)*s,life:rn(16,28),maxLife:28,size:rn(1,4),type:"ink"},LIMITS.particles)}
  if(p.decoyOnDodge){
    pushLimited(g.decoys,{x:p.x,y:p.y,life:50,maxLife:50,r:p.r},LIMITS.decoys);
  }
  // 鬼手印：完美闪避吸取最近敌人灵魂
  if(p.dodgeSoulGrab){var closest=null,closestD=RANGES.dodgeSoulGrab*RANGES.dodgeSoulGrab;
    forEachLiveEnemy(g,function(ne){var ds=dstSq(p,ne);
      if(ds<closestD){closestD=ds;closest=ne}});
    if(closest){var sDmg=p.soulDmg+(p.soulDmgPerRelic?g.relics.length:0)+5;
      damageEnemy(g,closest,sDmg,"soulGrab");
      p.hp=Math.min(p.maxHp,p.hp+3);
      spawnP(g,closest.x,closest.y,"moss",4);
      pushLimited(g.floatTexts,{x:closest.x,y:closest.y-16,text:"+3",life:20,maxLife:20,reason:"heal"},LIMITS.floatTexts)}}
}

// ════════════════════════════════════════════════════════════════
// § INPUT FRAME — unified desktop/mobile input → single frame
// ════════════════════════════════════════════════════════════════

// === UNIFIED INPUT FRAME ===
// Merges desktop (keys/mouse) and mobile (_mobileInput) into one structure.
// update() reads only this frame — never keys/mouse/_mobileInput directly.
function buildInputFrame(g){
  var p=g.player,mob=window._mobileInput,isMobile=!!(mob&&mob.active);
  var dx=0,dy=0;
  if(isMobile){dx=mob.dx;dy=mob.dy}
  else{
    if(keys["w"]||keys["arrowup"])dy=-1;
    if(keys["s"]||keys["arrowdown"])dy=1;
    if(keys["a"]||keys["arrowleft"])dx=-1;
    if(keys["d"]||keys["arrowright"])dx=1;
  }
  // facing angle
  if(isMobile&&(mob.attacking||mob.autoAtk)){p.facing=mob.aimAngle;p._lastMobileAim=mob.aimAngle}
  else if(isMobile&&p._lastMobileAim!==undefined){p.facing=p._lastMobileAim}
  else{var rect=getCanvasRect();var mx=rect.width>0?(mouse.x-rect.left)*(W/rect.width):p.x,my=rect.height>0?(mouse.y-rect.top)*(H/rect.height):p.y;p.facing=Math.atan2(my-p.y,mx-p.x);p._lastMobileAim=undefined}
  // dodge
  var dodgeQueued=false;
  if(isMobile&&(mob.dodgeRequest>0||mob.dodging)){dodgeQueued=true;mob.dodging=false;mob.dodgeRequest=0}
  else if(keys[" "]||keys["shift"]||keys["space"])dodgeQueued=true;
  // attack
  var attacking=isMobile?(mob.attacking||mob.autoAtk):mouse.down;
  var frame={dx:dx,dy:dy,aimAngle:p.facing,attacking:attacking,dodgeQueued:dodgeQueued,isMobile:isMobile};
  MOSUI.input.lastFrame=frame;
  return frame;
}
MOSUI.input.buildFrame=buildInputFrame;

// ════════════════════════════════════════════════════════════════
// § UPDATE — per-frame game logic
// ════════════════════════════════════════════════════════════════

function update(g){
  if(g.state==="dying"){g.time++;
    g.freezeT--;if(g.deathCircle)g.deathCircle.r+=g.deathCircle.maxR/g.deathCircle.life;
    if(g.freezeT<=0)g.state="over";
    return}
  if(g.state==="victory"){g.time++;g.freezeT--;
    if(g.freezeT<=0)g.freezeT=0;
    return}
  if(g.state!=="playing")return;
  g.time++;
  if(IS_TOUCH&&window._tickMobileAutoAim)window._tickMobileAutoAim();
  if(g.announceT>0)g.announceT--;
  if(g.bossIntroT>0)g.bossIntroT--;
  if(g.bossCelebrationT>0)g.bossCelebrationT--;
  if(g.hintT>0)g.hintT--;
  if(g.killStreakT>0){g.killStreakT--;if(g.killStreakT<=0)g.killStreak=0}
  if(g.relicFlash>0)g.relicFlash--;
  if(g.critFlash>0)g.critFlash--;
  if(g.dmgDir&&g.dmgDir.t>0){g.dmgDir.t--;if(g.dmgDir.t<=0)g.dmgDir=null}
  if(g.bossFlash>0)g.bossFlash--;
  if(g.shakeT>0){g.shakeT--;var si=g.shakeAmp||3;g.shakeX=rn(-si,si);g.shakeY=rn(-si,si)}
  else{g.shakeX=0;g.shakeY=0;g.shakeAmp=0}
  // 墨灵位置始终更新（不受顿帧影响）
  {var _sp=g.player;for(var _si=g.inkSpirits.length-1;_si>=0;_si--){var _isp=g.inkSpirits[_si];
    _isp.orbitAngle+=0.028;_isp.x=_sp.x+Math.cos(_isp.orbitAngle)*_isp.orbitR;
    _isp.y=_sp.y+Math.sin(_isp.orbitAngle)*_isp.orbitR;}}
  if(g.freezeT>0){g.freezeT--;return}
  // slow motion: skip every other frame
  if(g.slowMo>0){g.slowMo--;if(g.time%2===0)return}
  if(g.inkWipe>0)g.inkWipe--;
  if(g.bossWaveEntrance>0){g.bossWaveEntrance--;shake(g,4,3)}

  var p=g.player,dx=0,dy=0;
  if(p.recallMark&&p.recallMark.life>0)p.recallMark.life--;
  // 清理已死的墨蛭
  for(var li=p.leeches.length-1;li>=0;li--){if(p.leeches[li].hp<=0)p.leeches.splice(li,1)}

  // 墨灵玉：生成墨灵
  if(p.hasInkSpirit&&g.inkSpirits.length<p.inkSpiritCount&&g.bossWaveEntrance<=0&&g.announceT<=0){
    while(g.inkSpirits.length<p.inkSpiritCount){
      g.inkSpirits.push({orbitAngle:rn(0,Math.PI*2),orbitR:42+rn(-5,5),atkTimer:0,atkCd:38,dmg:Math.max(3,Math.ceil(4*(p.relicPower||1)*(1+(p.spiritDmgBonus||0)))),r:8,spiritExplode:!!p.spiritExplode,spiritSlow:!!p.spiritSlow})
    }
  }
  // 迷雾诅咒：周期性视野缩小
  if(p.fogCurse){if(g.fogTimer===0)g.fogTimer=300;
    g.fogTimer--;g.fogActive=(g.fogTimer<90&&g.fogTimer>0);
    if(g.fogTimer<=0)g.fogTimer=300}
  // 鬼火诅咒：魂球追踪
  for(var soi=g.soulOrbs.length-1;soi>=0;soi--){var so=g.soulOrbs[soi];so.life--;
    if(so.life<=0){g.soulOrbs.splice(soi,1);continue}
    var sdx=p.x-so.x,sdy=p.y-so.y,sl=Math.sqrt(sdx*sdx+sdy*sdy)||1;so.x+=sdx/sl*so.spd;so.y+=sdy/sl*so.spd;
    if(dstSq(so,p)<(so.r+p.r)*(so.r+p.r)){
      if(p.soulOrbHeal){p.hp=Math.min(p.maxHp,p.hp+3);pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-14,text:"+3",life:20,maxLife:20,reason:"heal"},LIMITS.floatTexts)}
      else if(p.invTimer<=0)hurtP(g,so.dmg);g.soulOrbs.splice(soi,1)}}
  // 环境事件更新
  if(g.hazard){g.hazardTimer--;
    if(g.hazardTimer<=0){g.hazardTimer=g.hazard.interval;snd("hazardWarn");
      if(g.hazard.id==="yinfeng"){var wAngle=rn(0,Math.PI*2),wForce=rn(1.5,3);
        p.x+=Math.cos(wAngle)*wForce;p.y+=Math.sin(wAngle)*wForce;
        g.enemies.forEach(function(en){if(en.hp>0){en.x+=Math.cos(wAngle)*wForce*0.7;en.y+=Math.sin(wAngle)*wForce*0.7}});
        pushLimited(g.particles,{x:W/2,y:H/2,vx:Math.cos(wAngle)*3,vy:Math.sin(wAngle)*3,life:30,maxLife:30,size:8,type:"ink"},LIMITS.particles)}
      else if(g.hazard.id==="moyu"){var rx=rn(A.l+20,A.r-20),ry=rn(A.t+20,A.b-20);
        g.hazardObjs.push({x:rx,y:ry,r:8,life:40,dmg:5,type:"moyu"});pushLimited(g.particles,{x:rx,y:ry,vx:0,vy:2,life:15,maxLife:15,size:4,type:"ink"},LIMITS.particles)}
      else if(g.hazard.id==="guihuoyan"){var fx=rn(A.l+40,A.r-40),fy=rn(A.t+40,A.b-40);
        g.hazardObjs.push({x:fx,y:fy,r:6,life:120,dmg:3,spd:1.2,type:"guihuoyan",target:p})}
      else if(g.hazard.id==="mozhang"){var mx=rn(A.l+50,A.r-50),my=rn(A.t+50,A.b-50);
        g.hazardObjs.push({x:mx,y:my,r:30,life:220,dmg:2,type:"mozhang",vx:rn(-0.5,0.5),vy:rn(-0.5,0.5)})}
      else if(g.hazard.id==="yinbing"){
        var ybFromLeft=Math.random()<0.5;var ybY=rn(A.t+30,A.b-30);var ybCount=6+ri(0,2);
        for(var ybi=0;ybi<ybCount;ybi++){
          g.hazardObjs.push({x:ybFromLeft?A.l-10-ybi*24:A.r+10+ybi*24,y:ybY,life:60,dmg:4,r:8,
            spd:ybFromLeft?6:(-6),type:"yinbing",sweepY:ybY})
        }}
      else if(g.hazard.id==="zhijian"){
        var zjx=rn(A.l+20,A.r-20);g.hazardObjs.push({x:zjx,y:A.t-10,r:6,life:50,dmg:6,
          vy:4+rn(0,2),type:"zhijian"})
      }}}
  for(var hoi=g.hazardObjs.length-1;hoi>=0;hoi--){var ho=g.hazardObjs[hoi];ho.life--;
    if(ho.life<=0){g.hazardObjs.splice(hoi,1);continue}
    if(ho.type==="guihuoyan"){var hdx=p.x-ho.x,hdy=p.y-ho.y,hl=Math.sqrt(hdx*hdx+hdy*hdy)||1;ho.x+=hdx/hl*ho.spd;ho.y+=hdy/hl*ho.spd;
      if(dstSq(ho,p)<(ho.r+p.r)*(ho.r+p.r)&&p.invTimer<=0){hurtP(g,ho.dmg,{name:"鬼火焰"});g.hazardObjs.splice(hoi,1);continue}}
    else if(ho.type==="moyu"){if(dstSq(ho,p)<(ho.r+p.r)*(ho.r+p.r)&&p.invTimer<=0){hurtP(g,ho.dmg,{name:"墨雨"});g.hazardObjs.splice(hoi,1);continue}}
    else if(ho.type==="mozhang"){ho.x+=ho.vx;ho.y+=ho.vy;
      if(ho.x<A.l+ho.r||ho.x>A.r-ho.r)ho.vx*=-1;if(ho.y<A.t+ho.r||ho.y>A.b-ho.r)ho.vy*=-1;
      if(dstSq(ho,p)<(ho.r+p.r)*(ho.r+p.r)&&p.invTimer<=0&&g.time%20===0)hurtP(g,ho.dmg,{name:"墨瘴"})}
    else if(ho.type==="yinbing"){ho.x+=ho.spd;
      if(ho.x<A.l-20||ho.x>A.r+20){g.hazardObjs.splice(hoi,1);continue}
      if(dstSq(ho,p)<(ho.r+p.r)*(ho.r+p.r)&&p.invTimer<=0){hurtP(g,ho.dmg,{name:"阴兵过境"});g.hazardObjs.splice(hoi,1);continue}}
    else if(ho.type==="zhijian"){ho.y+=ho.vy;
      if(ho.y>A.b+10){g.hazardObjs.splice(hoi,1);continue}
      if(dstSq(ho,p)<(ho.r+p.r)*(ho.r+p.r)&&p.invTimer<=0){hurtP(g,ho.dmg,{name:"纸剑"});g.hazardObjs.splice(hoi,1);continue}}}
  // === INPUT ===
  var inp=buildInputFrame(g);
  var dx=inp.dx,dy=inp.dy;

  var movedThisFrame=false;
  if(inp.dodgeQueued&&!p.dodgeQueued)p.dodgeQueued=true;
  else if(!inp.dodgeQueued)p.dodgeQueued=false;
  if(p.dodgeQueued)startDodge(g,dx,dy);
  if(p.dodgeT>0){p.x+=p.dodgeDx;p.y+=p.dodgeDy;p.dodgeT--;movedThisFrame=true;
    if(g.time%2===0)spawnP(g,p.x+rn(-6,6),p.y+rn(-6,6),"ink",2)}
  else if(p.dashT>0){p.x+=p.dashDx;p.y+=p.dashDy;p.dashT--;movedThisFrame=true;
    if(g.time%2===0)spawnP(g,p.x+rn(-4,4),p.y+rn(-4,4),"accent",2);
    // 影迹进化：冲刺路径留下减速冰霜
    if(p.dashTrail&&g.time%4===0){
      pushLimited(g.frosts,{x:p.x+rn(-10,10),y:p.y+rn(-10,10),r:40,life:70,maxLife:70,dmg:2},LIMITS.frosts)
    }
  }
  else if(dx||dy){var spdMul=moveScale(p)*stageSpeedFactor(g,p.x,p.y);
    if(inkPoolCheck(g,p.x,p.y)===2)spdMul*=1.2;
    var len=Math.sqrt(dx*dx+dy*dy)||1;
    var mx=(dx/len)*p.spd*spdMul,my=(dy/len)*p.spd*spdMul;
    p.x+=mx;p.y+=my;p.lastDx=mx;p.lastDy=my;movedThisFrame=true;
  }
  p.x=cl(p.x,A.l+p.r,A.r-p.r);p.y=cl(p.y,A.t+p.r,A.b-p.r);
  // expose positions for mobile auto-aim
  window._playerPos={x:p.x,y:p.y};window._lastEnemies=g.enemies;
  if(movedThisFrame){p.idleT=0}else{p.idleT++}
  if(movedThisFrame&&p.inkTrail&&g.time%12===0){addFire(g,{x:p.x,y:p.y,r:18,life:90,dmg:0,slow:true});
    spawnP(g,p.x+rn(-8,8),p.y+rn(-8,8),"ink",1)}
  // 墨旋誓印：移动留减速墨迹
  if(movedThisFrame&&p.moveSlowTrail&&g.time%20===0){pushLimited(g.frosts,{x:p.x,y:p.y,r:22,life:70,maxLife:70},LIMITS.frosts)}
  // 墨迹残步：移动充能，停止释放墨爆
  if(p.moveChargeMax){
    if(movedThisFrame){p.moveChargeT=Math.min(120,p.moveChargeT+1)}
    else if(p.moveChargeT>0){
      var mcRatio=p.moveChargeT/120;var mcR=40+mcRatio*80;var mcDmg=Math.ceil(p.stats.dmg*mcRatio*2);
      forEachLiveEnemy(g,function(oe){if(dstSq(p,oe)<mcR*mcR)damageEnemy(g,oe,mcDmg,"moveCharge")});
      spawnP(g,p.x,p.y,"ink",Math.floor(6+mcRatio*10));spawnInk(g,p.x,p.y,Math.floor(4+mcRatio*8),"ink");
      if(mcRatio>0.5){spawnP(g,p.x,p.y,"accent",4);shake(g,Math.floor(mcRatio*6),4);snd("bossEnrage")}
      else{snd("hit")}
      if(mcRatio>0.3)g.moveChargeFires=(g.moveChargeFires||0)+1;
      p.moveChargeT=0}}
  if((dx||dy)&&g.time%4===0){
    var trvx=p.lastDx?p.lastDx*0.3+rn(-0.3,0.3):rn(-0.3,0.3);
    var trvy=p.lastDy?p.lastDy*0.3+rn(-0.3,0.3):rn(-0.3,0.3);
    var trailType=g.weapon.type==="dash"?"accent":g.weapon.type==="ranged"?"moss":g.weapon.type==="summon"?"accent":"ink";
    pushLimited(g.particles,{x:p.x+rn(-4,4),y:p.y+rn(-4,4),
    vx:trvx,vy:trvy,life:rn(25,50),maxLife:50,size:rn(1.5,4),type:trailType},LIMITS.particles)}
  // dash trail ink splatter
  if(p.dashT>0&&g.time%2===0){
    pushLimited(g.particles,{x:p.x+rn(-5,5),y:p.y+rn(-5,5),
      vx:rn(-1.2,1.2),vy:rn(-0.6,0.6),life:rn(16,24),maxLife:24,size:rn(2,6),type:"accent"},LIMITS.particles);
    if(g.time%5===0)pushLimited(g.particles,{x:p.x-p.dashDx*0.3+rn(-3,3),y:p.y-p.dashDy*0.3+rn(-3,3),
      vx:rn(-0.5,0.5),vy:rn(-0.3,0.3),life:rn(12,20),maxLife:20,size:rn(1,3),type:"ink"},LIMITS.particles)}

  if(inp.attacking&&p.atkCd<=0)pAtk(g);
  if(p.atkCd>0)p.atkCd--;
  if(p.invTimer>0)p.invTimer--;
  if(p.blindT>0)p.blindT--;
  // 墨魂丹：低血爆发
  if(p.lowHpBurstT>0){p.lowHpBurstT--;if(p.lowHpBurstT<=0){p.stats.dmg-=0.5;p.lowHpBurstUsed=false}}
  if(p.lowHpBurst&&!p.lowHpBurstUsed&&p.hp>0&&p.hp<p.maxHp*0.25){
    p.stats.dmg+=0.5;p.lowHpBurstUsed=true;p.lowHpBurstT=300;
    pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-20,text:"爆",life:40,maxLife:40,reason:"burst"},LIMITS.floatTexts);
    spawnP(g,p.x,p.y,"accent",8);snd("bossEnrage")}
  if(p.hurtFlash>0)p.hurtFlash--;
  if(p.dodgeCd>0)p.dodgeCd--;
  // 闪避输入缓冲
  if(p.dodgeBufferT>0){p.dodgeBufferT--;
    if(p.dodgeCd<=0&&p.dodgeT<=0){startDodge(g,p.dodgeBufferDx,p.dodgeBufferDy);p.dodgeBufferT=0}}
  if(p.justDodgedT>0){p.justDodgedT--;if(p.justDodgedT<=0)p.justDodged=false}
  // 连段计时器
  if(p.comboTimer>0){p.comboTimer--;
    if(p.comboTimer<=0){
      if(p.comboCount>1)pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-18,text:p.comboCount+"连",life:25,maxLife:25,reason:"comboBreak"},LIMITS.floatTexts);
      p.comboCount=0;p.comboHitId=null;p.comboHitCount=0}}
  // 蓄力计时（停顿且不攻击时积累）
  if(p.atkCd<=0&&!movedThisFrame){p.chargeTimer++;
    if(p.chargeDmg>0&&p.chargeTimer===TUNING.chargeThreshold){snd("chargeReady");spawnInk(g,p.x,p.y,6,"accent")}}
  else if(movedThisFrame&&p.chargeDmg>0)p.chargeTimer=0;
  // 击杀增益计时
  if(p.killSpdTimer>0)p.killSpdTimer--;
  if(p.speedBurstT>0)p.speedBurstT--;
  if(p.killAtkTimer>0)p.killAtkTimer--;
  if(p.hurtShieldTicks>0)p.hurtShieldTicks--;
  if(p.splitShieldTicks>0)p.splitShieldTicks--;
  // 墨息珠：击杀后持续回血
  if(p.breathOnKill&&p.breathTicks>0){
    p.breathTicks--;
    if(p.breathTicks%60===0){p.hp=Math.min(p.hp+2,p.maxHp);spawnP(g,p.x,p.y,"moss",2)}}
  // 墨镜碎影：站定0.5秒激活自动反射（stillT由下方统一管理）
  if(p.autoReflect){
    if(p.autoReflectCd>0)p.autoReflectCd--;
    if(p.autoReflectCd<=0&&p.stillT>=30&&!p.autoReflectReady)p.autoReflectReady=true;
    if(movedThisFrame)p.autoReflectReady=false;
    if(p.autoReflectReady){for(var ari=g.eProj.length-1;ari>=0;ari--){var aep=g.eProj[ari];if(collideSq(aep,p,p.r+40)){aep.vx*=-1;aep.vy*=-1;aep.dmg=Math.floor(aep.dmg*2);aep._reflected=true;snd("reflect");pushAttack(g,{x:aep.x,y:aep.y,vx:aep.vx,vy:aep.vy,life:aep.life,dmg:aep.dmg,r:5,type:"proj",hitMap:{}});g.eProj.splice(ari,1);spawnP(g,aep.x,aep.y,"accent",6);p.autoReflectReady=false;p.autoReflectCd=240;p.stillT=0;break}}}
  }
  if(p.execCritT>0)p.execCritT--;
  // 弱点标记计时
  Object.keys(p.weakTargets).forEach(function(k){if(p.weakTargets[k]>0)p.weakTargets[k]--;if(p.weakTargets[k]<=0)delete p.weakTargets[k]})
  updateStage(g);

  // 墨阵系统：静止计时
  if(!movedThisFrame&&!p.dashT&&!p.dodgeT){p.stillT++}else{p.stillT=0}
  // 墨守阵：静止触发
  var stillThresh=p.formBoost?30:60;
  if(p.defFormation&&p.stillT>=stillThresh){
    p.stillT=0;
    var fr=p.formDouble?70:50;var fl=p.formDouble?150:90;
    var mul=(p.formBoost?1.4:1)*(p.formDouble?2:1);
    g.formations.push({x:p.x,y:p.y,r:Math.floor(fr*mul),life:fl,maxLife:fl,type:"def"})
  }
  // 墨攻阵：击杀触发（在onEnemyKilled中计数）
  if(p.atkFormation&&p.atkFormCount>=(p.formBoost?2:3)){
    p.atkFormCount=0;
    var ar=p.formDouble?112:80;var mul2=(p.formBoost?1.4:1)*(p.formDouble?2:1);
    g.formations.push({x:p.x,y:p.y,r:Math.floor(ar*mul2),life:8,maxLife:8,type:"atk",dmg:Math.floor(g.weapon.dmg*p.stats.dmg*2)});pushLimited(g.floatTexts,{x:p.x,y:p.y-25,text:"攻",life:22,maxLife:22,reason:"hint"},LIMITS.floatTexts);spawnP(g,p.x,p.y,"ink",5)
  }
  // 回春阵：静止触发
  var healThresh=p.formBoost?36:72;
  if(p.healFormation&&p.stillT>=healThresh){
    p.stillT=0;
    var hr=p.formDouble?56:40;var hl=p.formDouble?120:80;
    var hmul=(p.formBoost?1.4:1)*(p.formDouble?2:1);
    g.formations.push({x:p.x,y:p.y,r:Math.floor(hr*hmul),life:hl,maxLife:hl,type:"heal"});pushLimited(g.floatTexts,{x:p.x,y:p.y-25,text:"愈",life:22,maxLife:22,reason:"heal"},LIMITS.floatTexts);spawnP(g,p.x,p.y,"moss",5)
  }
  // 墨涡：击杀触发
  if(p.vortexOnKill&&(p.vortexKills||0)>=5){
    p.vortexKills=0;
    g.formations.push({x:p.x,y:p.y,r:90,life:40,maxLife:40,type:"vortex",dmg:Math.floor(g.weapon.dmg*p.stats.dmg*1.5)});pushLimited(g.floatTexts,{x:p.x,y:p.y-30,text:"涡",life:25,maxLife:25,reason:"hint"},LIMITS.floatTexts);spawnP(g,p.x,p.y,"ink",6)
  }
  // 墨阵生命周期
  for(var fi=g.formations.length-1;fi>=0;fi--){var fm=g.formations[fi];fm.life--;
    if(fm.type==="atk"&&fm.life===4){forEachLiveEnemy(g,function(oe){
      if(dstSq(fm,oe)<fm.r*fm.r)damageEnemy(g,oe,fm.dmg,"formation")});
      spawnP(g,fm.x,fm.y,"ink",10)}
    if(fm.type==="heal"&&g.time%60===0&&dstSq(fm,p)<fm.r*fm.r){
      p.hp=Math.min(p.maxHp,p.hp+3);spawnP(g,p.x,p.y,"moss",2)}
    if(fm.type==="vortex"){
      forEachLiveEnemy(g,function(oe){
        var dd=dstSq(fm,oe);if(dd<fm.r*fm.r){
          var vdx=fm.x-oe.x,vdy=fm.y-oe.y,vl=Math.sqrt(vdx*vdx+vdy*vdy)||1;
          var pull=Math.max(0.5,(fm.r-Math.sqrt(dd))/fm.r*3);
          oe.x+=vdx/vl*pull;oe.y+=vdy/vl*pull;
          if(g.time%12===0)damageEnemy(g,oe,Math.ceil(fm.dmg*0.35),"formation")}});
      spawnP(g,fm.x,fm.y,"ink",1)}
    if(fm.life<=0){
      if(p.formationDetonate){
        var detDmg=Math.floor((g.weapon.dmg||12)*p.stats.dmg*1.2);
        var detHit=0;
        forEachLiveEnemy(g,function(oe){
          if(dstSq(fm,oe)<fm.r*fm.r){damageEnemy(g,oe,detDmg,"formation");detHit++}});
        if(detHit>0)pushLimited(g.floatTexts,{x:fm.x,y:fm.y-20,text:"阵",life:25,maxLife:25,reason:"dmg"},LIMITS.floatTexts);
        spawnP(g,fm.x,fm.y,"accent",12);spawnP(g,fm.x,fm.y,"ink",8);shake(g,5,2)}
      g.formations.splice(fi,1)}}
  // 墨弦：墨阵间生成伤害弦线
  if(p.inkStrings&&g.formations.length>=2&&g.time%12===0){
    for(var si=0;si<g.formations.length;si++){var fa=g.formations[si];
      for(var sj=si+1;sj<g.formations.length;sj++){var fb=g.formations[sj];
        var strHit=0;
        forEachLiveEnemy(g,function(oe){
          var dSq=distPointToSegSq(oe.x,oe.y,fa.x,fa.y,fb.x,fb.y);
          if(dSq<(oe.r+7)*(oe.r+7)){damageEnemy(g,oe,Math.ceil((g.weapon.dmg||12)*p.stats.dmg*0.25),"formation");strHit++}});
        if(strHit>0)pushLimited(g.floatTexts,{x:p.x,y:p.y-35,text:"弦",life:20,maxLife:20,reason:"hint"},LIMITS.floatTexts)}}}
  // 墨涟：阵内周期性波纹伤害
  if(p.formRipple&&g.time%30===0){for(var rippleI=0;rippleI<g.formations.length;rippleI++){var rf=g.formations[rippleI];
    if(dstSq(rf,p)<rf.r*rf.r){var ripDmg=Math.ceil((g.weapon.dmg||12)*p.stats.dmg*0.18);
      forEachLiveEnemy(g,function(oe){
        if(dstSq(rf,oe)<rf.r*rf.r)damageEnemy(g,oe,ripDmg,"formation")});
      spawnP(g,rf.x,rf.y,"moss",4);break}}}
  // enemies
  var slowAmt=Math.max(p.slowOnHit,TUNING.defaultSlowAmount);
  for(var i=g.enemies.length-1;i>=0;i--){
    var e=g.enemies[i];
    if(e.hp<=0){if(!e.deathT)e.deathT=TUNING.deathAnimDuration;e.deathT--;if(e.deathT<=0){g.enemies.splice(i,1);continue}continue}
    if(e.hitFlash>0)e.hitFlash--;
    if(e.slowT>0)e.slowT--;
    if(e.buffed>0)e.buffed--;
    if(e.mimicRevealT>0)e.mimicRevealT--;
    if(e.fearT>0)e.fearT--;
    if(e.pinned>0)e.pinned--;
    if(e.spawnGraceT>0)e.spawnGraceT--;
    if(e.cdT>0)e.cdT--;
    if(e.corrodeT>0){e.corrodeT--;if(g.time%60===0){var corDmg=Math.max(1,Math.floor((e.corrode||0)*2));damageEnemy(g,e,corDmg,"corrosive");if(g.time%12===0)spawnP(g,e.x+rn(-4,4),e.y+rn(-4,4),"moss",1)}if(e.corrodeT<=0)e.corrode=0}
    if(e.chargeCdT>0)e.chargeCdT--;
    if(e.bossChargeCdT>0)e.bossChargeCdT--;
    e.bob+=0.06;
    // 画皮：伪装检测
    if(e.mimic&&e.disguised&&dstSq(e,p)<RANGES.mimicReveal*RANGES.mimicReveal){e.disguised=false;e.mimicRevealT=20;snd("bossEnrage");shake(g,4,5);
      pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:"现形！",life:35,maxLife:35,reason:"mimic"},LIMITS.floatTexts);
      spawnP(g,e.x,e.y,"accent",8)}
    if(e.spawnGraceT>0)continue;
    if(e.leech&&e.attached)continue;
    var spd=e.pinned>0?0:e.spd*(e.slowT>0?(1-slowAmt):1)*(e.buffed>0?TUNING.buffedSpdMult:1);
    // v3.4: 墨潮 — enemies in ink ring move faster
    if(g.stage&&g.stage.id==="inktide"){var etR=120+60*Math.sin(g.time*0.02);var edx=e.x-W/2,edy=e.y-H/2;if(edx*edx+edy*edy<etR*etR)spd*=1.2;}
    if(e.isBoss&&e.type!=="mojiangjun"&&e.type!=="moguiwang"&&!e.midBoss&&e.hp<e.maxHp*TUNING.bossEnrageHp&&!e.enraged){e.enraged=true;spd*=TUNING.bossEnrageSpdMult;
      snd("bossEnrage");shake(g,10,8);g.bossFlash=8;
      spawnInk(g,e.x,e.y,20,"fire");g.freezeT=Math.max(g.freezeT,6);
      pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:e.name+" · 怒",life:80,maxLife:80,reason:"streak"},LIMITS.floatTexts)}
    else if(e.isBoss&&e.type!=="mojiangjun"&&e.type!=="moguiwang"&&!e.midBoss&&e.enraged)spd*=TUNING.bossEnrageSpdMult;
    if(e.isBoss&&e.type!=="mojiangjun"&&e.type!=="moguiwang"&&!e.midBoss&&e.hp<e.maxHp*TUNING.bossDesperateHp&&!e.desperate){e.desperate=true;
      e.atkCd=Math.max(18,Math.floor(e.atkCd*0.6));e.fanShot=Math.min(7,e.fanShot+2);
      snd("bossEnrage");shake(g,14,10);
      spawnInk(g,e.x,e.y,28,"fire");spawnInk(g,e.x,e.y,16,"accent");
      for(var di=0;di<12;di++){var da=di*Math.PI*2/12;
        spawnP(g,e.x+Math.cos(da)*30,e.y+Math.sin(da)*30,"fire",2)}
      g.freezeT=Math.max(g.freezeT,10);g.bossFlash=12;
      pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:e.name+" · 绝望",life:90,maxLife:90,reason:"streak"},LIMITS.floatTexts);
      pushLimited(g.floatTexts,{x:e.x,y:e.y-30,text:"回光返照",life:60,maxLife:60,reason:"desperate"},LIMITS.floatTexts);
      // A1: 画皮分身 — spawn 2 low-HP clones
      for(var ci=0;ci<2;ci++){
        var ca=ci*Math.PI+Math.random()*0.5;
        var cx=e.x+Math.cos(ca)*50,cy=e.y+Math.sin(ca)*50;
        spawnEnemy(g,"boss",{x:cx,y:cy,hpMul:0.12,noScale:true,isClone:true});
      }
    }
    var toP=ang(e,p),dToPSq=dstSq(e,p),specialMove=false;
    // decoy attraction: affect movement AND attack targeting
    var targetX=p.x,targetY=p.y;
    var decoyTarget=null,decoyDist=Infinity;
    if(g.decoys.length>0)for(var di=0;di<g.decoys.length;di++){var dd=dstSq(e,g.decoys[di]);
      if(dd<decoyDist){decoyDist=dd;decoyTarget=g.decoys[di]}}
    var drawnToDecoy=false;if(decoyTarget&&decoyDist<RANGES.decoyAttract*RANGES.decoyAttract){toP=ang(e,decoyTarget);dToPSq=dstSq(e,decoyTarget);targetX=decoyTarget.x;targetY=decoyTarget.y;drawnToDecoy=true}
    if(e.chargeT>0){
      e.x+=e.chargeVx;e.y+=e.chargeVy;e.chargeT--;specialMove=true;
      if(g.time%3===0)spawnInk(g,e.x,e.y,1,"accent");
      {var mr=e.r+p.r+4;if(dstSq(e,p)<mr*mr&&p.invTimer<=0)hurtP(g,Math.floor(e.dmg*1.25),e)}
    }else if(e.prepT>0){
      e.prepT--;spd*=0.12;
      if(e.prepT<=0){var cdx=targetX-e.x,cdy=targetY-e.y,cl2=Math.sqrt(cdx*cdx+cdy*cdy)||1;
        e.chargeVx=cdx/cl2*e.chargeSpeed;e.chargeVy=cdy/cl2*e.chargeSpeed;e.chargeT=18}
    }else if(e.charge&&e.chargeCdT<=0&&dToPSq<RANGES.chargeMax*RANGES.chargeMax&&dToPSq>RANGES.chargeMin*RANGES.chargeMin){
      e.prepT=16;e.chargeCdT=e.chargeCd;spawnInk(g,e.x,e.y,5,"accent");
    }
    if(!specialMove){
      if(e.fearT>0){e.x-=Math.cos(toP)*spd*1.2;e.y-=Math.sin(toP)*spd*1.2}
      else if(!e.ranged||dToPSq>RANGES.rangedMin*RANGES.rangedMin){e.x+=Math.cos(toP)*spd;e.y+=Math.sin(toP)*spd}
    }
    e.x=cl(e.x,A.l+e.r,A.r-e.r);e.y=cl(e.y,A.t+e.r,A.b-e.r);
    if(g.time%2===0&&g.enemies.length>3)g.enemies.forEach(function(o){if(o===e||o.hp<=0)return;
      var dSq=dstSq(e,o),minD=e.r+o.r;
      if(dSq<minD*minD&&dSq>0.01){
        var d=Math.sqrt(dSq),pd=(e.x-o.x)/d,pp=(e.y-o.y)/d,push=(minD-d)*0.25;
        e.x+=pd*push;e.y+=pp*push}});
    e.x=cl(e.x,A.l+e.r,A.r-e.r);e.y=cl(e.y,A.t+e.r,A.b-e.r);
    // 墨蛭：接触吸附
    if(e.leech&&!e.attached&&p.invTimer<=0&&collideSq(e,p,4)){e.attached=true;p.leeches.push(e);
      pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-14,text:"吸附！",life:25,maxLife:25,reason:"leech"},LIMITS.floatTexts);
      snd("playerHurt")}
    // 墨蛭：已吸附则跟随玩家
    if(e.leech&&e.attached){var _li=g.time*0.15+Math.max(0,p.leeches.indexOf(e));e.x=p.x+Math.cos(_li)*12;e.y=p.y+Math.sin(_li)*12;
      if(g.time%30===0&&p.invTimer<=0)hurtP(g,2,e)}
    if(e.fireTrail&&g.time%20===0)addFire(g,{x:e.x,y:e.y,r:16,life:80,dmg:2});
    if(e.poisonTrail&&g.time%25===0)addFire(g,{x:e.x,y:e.y,r:14,life:70,dmg:1,poison:true});
    if(e.buffAura&&g.time%60===0){g.enemies.forEach(function(ally){if(ally===e||ally.hp<=0||ally.isBoss)return;
      if(dstSq(e,ally)<RANGES.buffAura*RANGES.buffAura){ally.buffed=60;ally.buffSrc=e}})}
    // 墨蝠：俯冲攻击
    if(e.swoop){
      if(!e.swoopState)e.swoopState="idle";
      if(e.swoopState==="idle"&&dToPSq<RANGES.swoop*RANGES.swoop){
        e.swoopState="prep";e.swoopTimer=e.swoopPrep||35;spawnP(g,e.x,e.y,"ink",3)}
      if(e.swoopState==="prep"){
        e.swoopTimer--;e.x+=Math.cos(toP)*0.5;e.y+=Math.sin(toP)*0.5;
        if(e.swoopTimer<=0){e.swoopState="swoop";e.swoopTimer=22;
          var sdx=p.x-e.x,sdy=p.y-e.y,sl=Math.sqrt(sdx*sdx+sdy*sdy)||1;e.swoopVx=sdx/sl*e.spd*2.8;e.swoopVy=sdy/sl*e.spd*2.8;
          snd("bossEnrage");spawnP(g,e.x,e.y,"accent",5)}}
      if(e.swoopState==="swoop"){
        e.swoopTimer--;e.x+=e.swoopVx;e.y+=e.swoopVy;
        var smr=e.r+p.r+4;if(dstSq(e,p)<smr*smr&&p.invTimer<=0)hurtP(g,Math.floor(e.dmg*1.5),e);
        if(e.swoopTimer<=0||e.x<A.l-e.r||e.x>A.r+e.r||e.y<A.t-e.r||e.y>A.b+e.r){e.swoopState="idle";spawnP(g,e.x,e.y,"ink",3)}}
    }
    dToPSq=drawnToDecoy?(function(){var ddx=e.x-targetX,ddy=e.y-targetY;return ddx*ddx+ddy*ddy})():dstSq(e,p);
    if(e.cdT<=0){
      if(e.ranged&&dToPSq<e.atkR*e.atkR&&dToPSq>RANGES.rangedMin*RANGES.rangedMin){var a=Math.atan2(targetY-e.y,targetX-e.x);
        for(var fs=0;fs<e.fanShot;fs++){
          var fa=a+(fs-(e.fanShot-1)/2)*0.24;
          addEProj(g,{x:e.x,y:e.y,vx:Math.cos(fa)*e.pSpd,vy:Math.sin(fa)*e.pSpd,
            r:5,dmg:Math.max(1,Math.floor(e.dmg*(e.fanShot>1?0.82:1)*(e.buffed>0?1.35:1))),life:58,_src:e});
        }
        e.cdT=e.atkCd}
      else if(!e.ranged&&!(e.swoop&&e.swoopState==="swoop")&&dToPSq<(e.atkR+p.r)*(e.atkR+p.r)){if(p.invTimer<=0)hurtP(g,Math.ceil(e.dmg*(e.buffed>0?1.35:1)),e);e.cdT=e.atkCd}}
    if(e.isBoss&&e.type!=="mojiangjun"&&e.type!=="moguiwang"&&g.time%90===0){for(var ba=0;ba<8;ba++){var baA=ba*Math.PI/4;
      addEProj(g,{x:e.x,y:e.y,vx:Math.cos(baA)*3,vy:Math.sin(baA)*3,
      r:6,dmg:e.dmg*0.6,life:60,_src:e})}}
    // boss enraged: spiral bullets every 60 frames
    if(e.isBoss&&e.type!=="mojiangjun"&&e.type!=="moguiwang"&&e.enraged&&g.time%60===0){var spBase=g.time*0.12;
      for(var spi=0;spi<5;spi++){var spA=spBase+spi*Math.PI*2/5;
        addEProj(g,{x:e.x,y:e.y,vx:Math.cos(spA)*2.5,vy:Math.sin(spA)*2.5,
        r:4,dmg:Math.max(1,Math.floor(e.dmg*0.4)),life:48,_src:e})}}
    // boss desperate: charge attack every 180 frames
    if(e.isBoss&&e.type==="boss"&&e.desperate&&e.bossChargeT>0){
      e.x+=e.bossChargeVx;e.y+=e.bossChargeVy;e.bossChargeT--;specialMove=true;
      if(g.time%2===0)addFire(g,{x:e.x,y:e.y,r:14,life:60,dmg:3});
      {var bmr=e.r+p.r+4;if(dstSq(e,p)<bmr*bmr&&p.invTimer<=0)hurtP(g,Math.floor(e.dmg*1.4),e)}
    }else if(e.isBoss&&e.type==="boss"&&e.desperate&&e.bossPrepT>0){
      e.bossPrepT--;spd*=0.15;
      if(e.bossPrepT<=0){var bdx=targetX-e.x,bdy=targetY-e.y,bl3=Math.sqrt(bdx*bdx+bdy*bdy)||1;e.bossChargeVx=bdx/bl3*5.5;e.bossChargeVy=bdy/bl3*5.5;e.bossChargeT=14}
    }else if(e.isBoss&&e.type==="boss"&&e.desperate&&e.bossChargeCdT<=0&&dToPSq<TUNING.bossChargeRange*TUNING.bossChargeRange){
      e.bossPrepT=20;snd("bossEnrage");shake(g,4,3);
      e.bossPrepAng=Math.atan2(targetY-e.y,targetX-e.x);
    }
    // --- 墨将军 Boss AI ---
    if(e.type==="mojiangjun"){
      var mjjPhase=e.hp>e.maxHp*TUNING.bossPhase2Hp?1:e.hp>e.maxHp*TUNING.bossPhase3Hp?2:3;
      if(!e._mjjPhase||e._mjjPhase!==mjjPhase){
        e._mjjPhase=mjjPhase;
        if(mjjPhase===2){snd("bossEnrage");shake(g,10,6);g.freezeT=Math.max(g.freezeT,4);g.bossFlash=6;e.enraged=true;
          spawnInk(g,e.x,e.y,16,"fire");spawnInk(g,e.x,e.y,10,"ink");
          pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:"墨将军 · 召书",life:80,maxLife:80,reason:"streak"},LIMITS.floatTexts)}
        if(mjjPhase===3){snd("bossEnrage");shake(g,14,10);e.spd=1.6;g.bossFlash=10;e.enraged=true;
          spawnInk(g,e.x,e.y,24,"fire");spawnInk(g,e.x,e.y,16,"accent");
          pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:"墨将军 · 狂书",life:90,maxLife:90,reason:"streak"},LIMITS.floatTexts);
          g.freezeT=Math.max(g.freezeT,8);
          e._mjjShieldReady=true;e.maxShield=50;e.shield=50;e.hasShield=true;e.shieldRegen=300;e.shieldCd=0;
          pushLimited(g.floatTexts,{x:e.x,y:e.y-30,text:"墨阵护体",life:60,maxLife:60,reason:"bossShield"},LIMITS.floatTexts)}
      }
      // Phase 1: ring slam every 120 frames
      if(mjjPhase===1&&g.time%120===0){
        for(var ri2=0;ri2<3;ri2++){var ra2=ri2*Math.PI*2/3;
          addEProj(g,{x:e.x,y:e.y,vx:Math.cos(ra2)*2.5,vy:Math.sin(ra2)*2.5,r:8,dmg:Math.max(1,Math.floor(e.dmg*0.5)),life:50,_src:e})}}
      // Phase 2: summon + double ring
      if(mjjPhase===2){
        if(g.time%150===0&&g.enemies.length<LIMITS.enemies-2){
          for(var si=0;si<2;si++){var sa2=rn(0,Math.PI*2);
            g.enemies.push(mkMinion(e.x+Math.cos(sa2)*30,e.y+Math.sin(sa2)*30,"zhikui",
              Math.max(1,Math.floor(ETYPE.zhikui.hp*(1+g.wave*WAVE_SCALE.hpPerWave))),
              ETYPE.zhikui.spd,10,ETYPE.zhikui.dmg,ETYPE.zhikui.atkR,ETYPE.zhikui.atkCd,C.ghost,C.ghostE,{chargeCdT:ri(30,60)}))}
          snd("summon")}
        if(g.time%100===0){for(var ri3=0;ri3<5;ri3++){var ra3=ri3*Math.PI*2/5;
          addEProj(g,{x:e.x,y:e.y,vx:Math.cos(ra3)*2.2,vy:Math.sin(ra3)*2.2,r:7,dmg:Math.max(1,Math.floor(e.dmg*0.4)),life:45,_src:e})}}
      }
      // Phase 3: spiral + charge
      if(mjjPhase===3){
        if(g.time%60===0){var spA2=g.time*0.15;
          for(var spi2=0;spi2<8;spi2++){var spAng=spA2+spi2*Math.PI/4;
            addEProj(g,{x:e.x,y:e.y,vx:Math.cos(spAng)*2.8,vy:Math.sin(spAng)*2.8,r:5,dmg:Math.max(1,Math.floor(e.dmg*0.35)),life:40,_src:e})}}
        if(g.time%TUNING.bossNormalAtkInterval===0&&!specialMove&&dToPSq<TUNING.bossChargeRange*TUNING.bossChargeRange){
          var mdx=p.x-e.x,mdy=p.y-e.y,ml=Math.sqrt(mdx*mdx+mdy*mdy)||1;e.chargeVx=mdx/ml*5.5;e.chargeVy=mdy/ml*5.5;e.chargeT=14;
          snd("playerDodge");shake(g,4,3)}
      }
    }
    // --- 墨鬼王 Boss AI ---
    if(e.type==="moguiwang"){
      var mgwPhase=e.hp>e.maxHp*TUNING.bossPhase2Hp?1:e.hp>e.maxHp*TUNING.bossPhase3Hp?2:3;
      if(!e._mgwPhase||e._mgwPhase!==mgwPhase){
        e._mgwPhase=mgwPhase;
        if(mgwPhase===2){snd("bossEnrage");shake(g,10,6);g.freezeT=Math.max(g.freezeT,4);g.bossFlash=6;e.enraged=true;
          spawnInk(g,e.x,e.y,18,"ink");spawnInk(g,e.x,e.y,12,"accent");
          pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:"墨鬼王 · 墨渊",life:80,maxLife:80,reason:"streak"},LIMITS.floatTexts)}
        if(mgwPhase===3){snd("bossEnrage");shake(g,16,12);e.spd=1.5;g.bossFlash=12;e.enraged=true;
          spawnInk(g,e.x,e.y,28,"ink");spawnInk(g,e.x,e.y,20,"fire");
          pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:"墨鬼王 · 蚀天",life:90,maxLife:90,reason:"streak"},LIMITS.floatTexts);
          g.freezeT=Math.max(g.freezeT,10);
          e._mgwPulseReady=true}
      }
      // Phase 1: 4-directional ink bolts every 90 frames
      if(mgwPhase===1&&g.time%90===0){
        for(var ri4=0;ri4<4;ri4++){var ra4=ri4*Math.PI/2+g.time*0.02;
          addEProj(g,{x:e.x,y:e.y,vx:Math.cos(ra4)*2.8,vy:Math.sin(ra4)*2.8,r:7,dmg:Math.max(1,Math.floor(e.dmg*0.45)),life:50,_src:e})}}
      // Phase 2: summon moyong + 8-directional ring
      if(mgwPhase===2){
        if(g.time%180===0&&g.enemies.length<LIMITS.enemies-2){
          for(var si2=0;si2<2;si2++){var sa3=rn(0,Math.PI*2);
            g.enemies.push(mkMinion(e.x+Math.cos(sa3)*35,e.y+Math.sin(sa3)*35,"moyong",
              Math.max(1,Math.floor(ETYPE.moyong.hp*(1+g.wave*WAVE_SCALE.hpPerWave))),
              ETYPE.moyong.spd,0,ETYPE.moyong.dmg,ETYPE.moyong.atkR,ETYPE.moyong.atkCd,"rgba(23,19,16,0.4)",C.ink,{chargeCdT:ri(30,60)}))}
          snd("summon")}
        if(g.time%110===0){for(var ri5=0;ri5<8;ri5++){var ra5=ri5*Math.PI/4;
          addEProj(g,{x:e.x,y:e.y,vx:Math.cos(ra5)*2.2,vy:Math.sin(ra5)*2.2,r:6,dmg:Math.max(1,Math.floor(e.dmg*0.35)),life:42,_src:e})}}
      }
      // Phase 3: spiral + ink trail + charge + slow pulse
      if(mgwPhase===3){
        if(g.time%50===0){var spA3=g.time*0.12;
          for(var spi3=0;spi3<6;spi3++){var spAng2=spA3+spi3*Math.PI/3;
            addEProj(g,{x:e.x,y:e.y,vx:Math.cos(spAng2)*3.0,vy:Math.sin(spAng2)*3.0,r:5,dmg:Math.max(1,Math.floor(e.dmg*0.3)),life:38,_src:e})}}
        if(g.time%10===0&&g.fires.length<LIMITS.fires&&g._pm>=0.5)pushLimited(g.fires,{x:e.x+rn(-8,8),y:e.y+rn(-8,8),r:18,life:120,maxLife:120,dmg:2,owner:"enemy",tickOffset:ri(0,15),healTickOffset:0},LIMITS.fires);
        // A3: 墨潮脉冲 — 每180帧释放一圈减速墨池
        if(e._mgwPulseReady&&g.time%180===0){
          for(var pi=0;pi<8;pi++){var pa=pi*Math.PI/4;
            pushLimited(g.fires,{x:e.x+Math.cos(pa)*60,y:e.y+Math.sin(pa)*60,r:24,life:90,maxLife:90,dmg:0,owner:"enemy",slow:true,tickOffset:0,healTickOffset:0},LIMITS.fires)}
          spawnP(g,e.x,e.y,"ink",10);snd("hit")}
        if(g.time%TUNING.bossNormalAtkInterval===0&&!specialMove&&dToPSq<TUNING.bossChargeRange*TUNING.bossChargeRange){
          var mdx2=p.x-e.x,mdy2=p.y-e.y,ml2=Math.sqrt(mdx2*mdx2+mdy2*mdy2)||1;e.chargeVx=mdx2/ml2*5.0;e.chargeVy=mdy2/ml2*5.0;e.chargeT=16;
          snd("playerDodge");shake(g,5,4)}
      }
    }
    // --- Elite abilities ---
    if(e.elite&&e.eliteAbility){
      // Blink: teleport near player
      if(e.eliteAbility==="blink"){
        if(e.blinkT>0)e.blinkT--;
        if(e.blinkT<=0&&!e.isBoss){e.blinkT=e.blinkCd;
          var bAngle=rn(0,Math.PI*2),bDist=rn(60,120);
          e.x=cl(p.x+Math.cos(bAngle)*bDist,A.l+e.r,A.r-e.r);
          e.y=cl(p.y+Math.sin(bAngle)*bDist,A.t+e.r,A.b-e.r);
          spawnInk(g,e.x,e.y,6,"ink");shake(g,2,2)}
      }
      // Enrage: below 30% hp -> speed x2, damage x1.3
      if(e.eliteAbility==="enrage"&&!e.enraged&&e.hp<e.maxHp*0.3){
        e.enraged=true;e.spd*=2;e.dmg=Math.ceil(e.dmg*1.3);
        snd("bossEnrage");spawnInk(g,e.x,e.y,8,"fire")}
      // Regen: heal 5% maxHp every 120 frames, double rate below 30%
      if(e.eliteAbility==="regen"){
        if(!e.regenT)e.regenT=120;
        e.regenT--;
        if(e.regenT<=0){e.regenT=e.hp<e.maxHp*0.3?60:120;
          var healAmt=Math.max(1,Math.floor(e.maxHp*0.05));
          e.hp=Math.min(e.maxHp,e.hp+healAmt);
          spawnInk(g,e.x,e.y,4,"moss");snd("heal")}}
      // Vampire: tracked via damagePlayer hook
      if(e.eliteAbility==="vampire"&&!e._vampTag){e._vampTag=true}
    }
    // summoner AI
    if(e.summoner){
      if(e.summonCdT>0)e.summonCdT--;
      if(e.summonCdT<=0&&e.summonCount<e.summonMax){
        for(var si=0;si<2;si++){
          var sa=rn(0,Math.PI*2),sd=e.r+12;
          var minionHp=Math.max(1,Math.floor(ETYPE.zhikui.hp*0.5*(1+g.wave*WAVE_SCALE.hpPerWave)));
          if(g.enemies.length<LIMITS.enemies)g.enemies.push(mkMinion(e.x+Math.cos(sa)*sd,e.y+Math.sin(sa)*sd,"zhikui",
            minionHp,e.spd*1.1,10,Math.floor(ETYPE.zhikui.dmg*0.6),28,ETYPE.zhikui.atkCd,
            C.ghost,C.ghostE,{_summonerId:e.id,chargeCdT:ri(30,60)}));
        }
        e.summonCount+=2;e.summonCdT=e.summonCd;snd("summon");spawnInk(g,e.x,e.y,8,"ghost");
      }
    }
    // shield regen
    if(e.hp>0&&!e.hasShield&&e.shieldCd>0){e.shieldCd--;if(e.shieldCd<=0){e.shield=e.maxShield;e.hasShield=true;
      spawnInk(g,e.x,e.y,5,"ink");snd("chargeReady")}}
    // teleport: blink behind player
    if(e.teleport&&e.hp>0){
      if(e.teleportT>0)e.teleportT--;
      if(e.teleportT<=0){e.teleportT=e.teleportCd;
        snd("ghostProj");spawnInk(g,e.x,e.y,6,"ghost");
        var tAng=p.facing+Math.PI+rn(-0.5,0.5),tDist=rn(50,90);
        e.x=cl(p.x+Math.cos(tAng)*tDist,A.l+e.r,A.r-e.r);
        e.y=cl(p.y+Math.sin(tAng)*tDist,A.t+e.r,A.b-e.r);
        spawnInk(g,e.x,e.y,6,"ghost");shake(g,2,2)}
    }
    // healAura: periodically heal nearby enemies
    if(e.healAura&&e.hp>0){
      if(e.healAuraT>0)e.healAuraT--;
      if(e.healAuraT<=0){e.healAuraT=e.healAuraCd;
        var healed=false;
        forEachLiveEnemy(g,function(oe){if(oe===e||oe.isBoss)return;
          if(dstSq(e,oe)<e.healAuraR*e.healAuraR){
            oe.hp=Math.min(oe.maxHp,oe.hp+e.healAuraAmt);
            spawnP(g,oe.x,oe.y,"moss",2);healed=true}});
        if(healed){spawnInk(g,e.x,e.y,4,"moss");spawnP(g,e.x,e.y,"moss",3);snd("heal")}
      }
    }
  }

  // enemy projectiles + off-screen warnings
  for(var i=g.eProj.length-1;i>=0;i--){
    var ep=g.eProj[i];ep.x+=ep.vx;ep.y+=ep.vy;ep.life--;
    // enemy projectile trail (every 4 frames)
    if(g.time%4===0&&perfMul(g)>0.4){
      pushLimited(g.particles,{x:ep.x+rn(-1,1),y:ep.y+rn(-1,1),
        vx:rn(-0.2,0.2),vy:rn(-0.2,0.2),life:6,maxLife:6,size:rn(1,2.5),type:"ink"},LIMITS.particles)}
    if(ep.life<=0||ep.x<A.l||ep.x>A.r||ep.y<A.t||ep.y>A.b){g.eProj.splice(i,1);continue}
    {if(collideSq(ep,p)&&p.invTimer<=0){
      if(p.reflectChance&&Math.random()<p.reflectChance){
        ep.vx*=-1;ep.vy*=-1;ep.dmg=Math.floor(ep.dmg*(1+(p.reflectDmgMult||0)));ep._reflected=true;snd("reflect");
        pushAttack(g,{x:ep.x,y:ep.y,vx:ep.vx,vy:ep.vy,life:ep.life,dmg:ep.dmg,r:5,type:"proj",hitMap:{}});
        g.eProj.splice(i,1);spawnP(g,ep.x,ep.y,"accent",4);snd("playerDodge");continue}
      hurtP(g,ep.dmg,ep._src);if(ep._src&&ep._src.webShot)p.slowT=Math.max(p.slowT||0,60);
      if(ep._src&&ep._src.blindShot){p.blindT=90;pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-14,text:"盲",life:25,maxLife:25,reason:"blind"},LIMITS.floatTexts)}
      g.eProj.splice(i,1);continue}}}

  // player attacks
  for(var i=g.attacks.length-1;i>=0;i--){
    var atk=g.attacks[i];atk.life--;
    if(atk.life<=0){g.attacks.splice(i,1);continue}
    if(atk.type==="proj"){
      if(atk.seek&&atk.seekTarget&&atk.seekTarget.hp>0){
        var tdx=atk.seekTarget.x-atk.x,tdy=atk.seekTarget.y-atk.y;
        var cross=atk.vx*tdy-atk.vy*tdx;
        var dot=atk.vx*tdx+atk.vy*tdy;
        var turn=0.08;if(cross<0)turn=-turn;
        var cs=Math.cos(turn),sn=Math.sin(turn);
        var nvx=atk.vx*cs-atk.vy*sn,nvy=atk.vx*sn+atk.vy*cs;
        atk.vx=nvx;atk.vy=nvy;
      }
      atk.x+=atk.vx;atk.y+=atk.vy;
      // projectile trail particle (every 3 frames)
      if(g.time%3===0&&perfMul(g)>0.4){
        pushLimited(g.particles,{x:atk.x+rn(-2,2),y:atk.y+rn(-2,2),
          vx:rn(-0.3,0.3),vy:rn(-0.3,0.3),life:8,maxLife:8,size:rn(1.5,3),type:"accent"},LIMITS.particles)}
      if(atk.bounce&&!atk.bounced&&atk.life<atk.maxLife*0.4){atk.vx*=-1;atk.vy*=-1;atk.bounced=true;snd("bounce")}
      if(atk.vx*atk.vx+atk.vy*atk.vy<0.25){g.attacks.splice(i,1);continue}
      if(atk.x<A.l||atk.x>A.r||atk.y<A.t||atk.y>A.b){g.attacks.splice(i,1);continue}
      var hitR=(atk.r||8);
      forEachLiveEnemy(g,function(e){if(atk.life<=0||atk.hitMap[e.id])return;
        var tr=hitR+e.r;if(dstSq(atk,e)<tr*tr){hitE(g,atk,e);atk.hitMap[e.id]=true;
          if(p.projSlowField&&!atk._slowFieldDone){addFire(g,{x:atk.x,y:atk.y,r:22,life:50,dmg:0,slow:true});atk._slowFieldDone=true}
          if(!atk.pierce)atk.life=0}});
      if(atk.life<=0){g.attacks.splice(i,1);continue}
    }else if(atk.type==="slash"||atk.type==="dashSlash"){
      if(atk.delay&&atk.delay>0){atk.delay--;continue}
      forEachLiveEnemy(g,function(e){if(atk.hitMap[e.id])return;
        if(ptInArc(e.x,e.y,atk.x,atk.y,atk.angle,atk.arc,atk.range)){hitE(g,atk,e);
          atk.hitMap[e.id]=true}});
    }else if(atk.type==="ring"){
      atk.r=atk.expand*(atk.maxLife-atk.life);
      var ringR=atk.r;
      forEachLiveEnemy(g,function(e){if(atk.hitMap[e.id])return;
        if(collideSq(atk,e)){
          if(atk.slow)e.slowT=Math.max(e.slowT,45);
          hitE(g,atk,e);atk.hitMap[e.id]=true;
          // 回鸣进化：铃铛每命中一个敌人恢复1HP
          if(p.ringHeal){p.hp=Math.min(p.maxHp,p.hp+1);
            pushLimited(g.floatTexts,{x:p.x+rn(-8,8),y:p.y-p.r-10,text:"+1",life:20,maxLife:20,reason:"heal"},LIMITS.floatTexts)}
        }});
    }else if(atk.type==="spirit"){
      // 追踪最近敌人
      var sNr=findNearestEnemy(g,atk.x,atk.y,200*200);
      if(sNr.enemy){var sdx=sNr.enemy.x-atk.x,sdy=sNr.enemy.y-atk.y,sl=Math.sqrt(sdx*sdx+sdy*sdy)||1;
        var curA=Math.atan2(atk.vy,atk.vx),tgtA=Math.atan2(sdy,sdx);
        var da=tgtA-curA;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
        curA+=da*0.12;atk.vx=Math.cos(curA)*5;atk.vy=Math.sin(curA)*5}
      atk.x+=atk.vx;atk.y+=atk.vy;
      if(atk.x<A.l||atk.x>A.r||atk.y<A.t||atk.y>A.b){g.attacks.splice(i,1);continue}
      forEachLiveEnemy(g,function(e){if(atk.life<=0||atk.hitMap[e.id])return;
        var mr=atk.r+e.r;if(dstSq(atk,e)<mr*mr){hitE(g,atk,e);
          if(p.spiritHeal&&e.hp<=0){p.hp=Math.min(p.maxHp,p.hp+3);
            pushLimited(g.floatTexts,{x:p.x+rn(-8,8),y:p.y-p.r-10,text:"+3",life:20,maxLife:20,reason:"heal"},LIMITS.floatTexts)}
          atk.life=0}});
      if(atk.life<=0){g.attacks.splice(i,1);continue}
    }
  }

  // fires / ink trails
  for(var i=g.fires.length-1;i>=0;i--){var f=g.fires[i];f.life--;
    if(f.life<=0){g.fires.splice(i,1);continue}
    if(f.slow){g.enemies.forEach(function(e){if(e.hp>0){if(collideSq(f,e))e.slowT=Math.max(e.slowT,15)}})}
    else if(f.owner==="player"&&!f.isBanner){
      forEachLiveEnemy(g,function(e){var mr=f.r+e.r;if(dstSq(f,e)<mr*mr&&((g.time+f.tickOffset)%TUNING.fireTickInterval===0)){
        if(damageEnemy(g,e,f.dmg,"fire"))spawnInk(g,e.x,e.y,10,"fire");
      }})}
    else if(f.poison){var mr=f.r+p.r;if(dstSq(f,p)<mr*mr&&((g.time+f.tickOffset)%TUNING.fireTickInterval===0)){
      if(p.poisonHeal){p.hp=Math.min(p.maxHp,p.hp+2);pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-14,text:"+2",life:20,maxLife:20,reason:"heal"},LIMITS.floatTexts)}
      else if(p.invTimer<=0){hurtP(g,f.dmg);p.slowT=Math.max(p.slowT,30)}}}
    else if(!f.isBanner){var mr=f.r+p.r;if(dstSq(f,p)<mr*mr&&p.invTimer<=0&&((g.time+f.tickOffset)%15===0))hurtP(g,f.dmg)}
    // 召魂幡：周期发射追踪魂弹
    if(f.isBanner&&((g.time+f.tickOffset)%25===0)){
      var nr=findNearestEnemy(g,f.x,f.y);
      var bannerRange=200+(p.bannerRangeBonus||0);
      if(nr.enemy&&nr.distSq<bannerRange*bannerRange){
        var bdx=nr.enemy.x-f.x,bdy=nr.enemy.y-f.y,bl=Math.sqrt(bdx*bdx+bdy*bdy)||1;
        pushAttack(g,{x:f.x+bdx/bl*12,y:f.y+bdy/bl*12,
          vx:bdx/bl*5,vy:bdy/bl*5,life:50,dmg:f.dmg,r:6,type:"spirit",
          pierce:!!f.bannerPierce,burst:!!f.bannerBurst,hitMap:{}});
        spawnP(g,f.x,f.y,"accent",1);
      }
      // 归将回血
      if(p.bannerHeal&&dstSq(f,p)<(f.r+p.r)*(f.r+p.r)){
        p.hp=Math.min(p.maxHp,p.hp+1);
      }
    }
    // 灯油旧芯：站在火场回血
    if(p.fireHeal>0&&f.owner==="player"){var fmr=f.r+p.r;if(dstSq(f,p)<fmr*fmr&&((g.time+f.healTickOffset)%40===0)){
      p.hp=Math.min(p.maxHp,p.hp+p.fireHeal);
      pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-14,text:"+"+p.fireHeal,life:25,maxLife:25,reason:"heal"},LIMITS.floatTexts);
      pushLimited(g.particles,{x:p.x+rn(-8,8),y:p.y+rn(-12,-4),
        vx:rn(-0.3,0.3),vy:rn(-1.5,-0.5),life:20,maxLife:20,size:rn(2,4),type:"accent"},LIMITS.particles)}}}


  // particles
  for(var i=g.particles.length-1;i>=0;i--){var pt=g.particles[i];
    pt.x+=pt.vx;pt.y+=pt.vy;pt.vx*=0.96;pt.vy*=0.96;pt.life--;
    if(pt.life<=0)g.particles.splice(i,1)}

  // floatTexts
  for(var i=g.floatTexts.length-1;i>=0;i--){var ft=g.floatTexts[i];
    ft.life--;ft.y-=(ft.reason==="dmg"||ft.reason==="critDmg"||ft.reason==="weakDmg")?0.7:0.5;
    if(ft.life<=0)g.floatTexts.splice(i,1)}

  // decoys
  for(var i=g.decoys.length-1;i>=0;i--){g.decoys[i].life--;
    if(g.decoys[i].life<=0)g.decoys.splice(i,1)}

  // kites (纸鸢引)
  for(var i=g.kites.length-1;i>=0;i--){var k=g.kites[i];k.life--;
    if(k.life<=0){g.kites.splice(i,1);continue}
    // 追踪最近敌人
    var nr=findNearestEnemy(g,k.x,k.y);
    if(nr.enemy){var kdx=nr.enemy.x-k.x,kdy=nr.enemy.y-k.y,kl=Math.sqrt(kdx*kdx+kdy*kdy)||1;k.angle=Math.atan2(kdy,kdx);
      k.x+=kdx/kl*k.speed;k.y+=kdy/kl*k.speed;
      if(nr.distSq<(nr.enemy.r+k.r)*(nr.enemy.r+k.r)){
        var killed=damageEnemy(g,nr.enemy,k.dmg,"kite");
        snd("kiteHit");spawnInk(g,k.x,k.y,6,"accent");shake(g,2,3);g.kites.splice(i,1);continue}}
    else{k.x+=Math.cos(k.life*0.1)*k.speed*0.3;k.y+=Math.sin(k.life*0.1)*k.speed*0.3}
    k.x=cl(k.x,A.l,A.r);k.y=cl(k.y,A.t,A.b)}

  // frosts (裂冰诀)
  for(var i=g.frosts.length-1;i>=0;i--){var fr=g.frosts[i];fr.life--;
    if(fr.life<=0){g.frosts.splice(i,1);continue}
    var frR=fr.r*(fr.life/fr.maxLife);g.enemies.forEach(function(e){if(e.hp>0){var mr=frR+e.r;if(dstSq(fr,e)<mr*mr){e.slowT=Math.max(e.slowT,20);if(fr.dmg&&g.time%30===0)damageEnemy(g,e,fr.dmg,"frost")}}})}

  g._pm=perfMul(g);
  markPerf(g);

  // Elite wave ambient particles
  if((g.waveSpecial==="elite"||g.waveSpecial==="elite_horde")&&g.announceT<=0&&g.time%8===0){
    for(var ei=0;ei<2;ei++){
      var epx=rn(A.l,A.r),epy=rn(A.t,A.b);
      pushLimited(g.particles,{x:epx,y:epy,vx:rn(-0.3,0.3),vy:rn(-0.5,-0.2),life:rn(40,80),maxLife:80,size:rn(1.5,3),type:"gold"},LIMITS.particles);
    }
  }

  // Survival wave persistent spawning
  if(g.waveSpecial==="survival"&&!g.survivalCleared&&g.announceT<=0){
    g.survivalSpawnTimer--;
    if(g.survivalSpawnTimer<=0&&g.enemies.length<TUNING.survivalMaxEnemies){
      g.survivalSpawnTimer=TUNING.survivalSpawnBase+ri(0,TUNING.survivalSpawnJitter);
      var sTiers=WAVE_TIERS[Math.min(WAVE_TIERS.length-1,Math.floor(g.wave/2))]||WAVE_TIERS[0];
      var sType=sTiers[ri(0,sTiers.length-1)];
      var sEt=ETYPE[sType];
      var sCount=1+Math.floor(Math.random()*2);
      if(sEt&&sEt.isBoss&&g.enemies.some(function(e){return e.isBoss&&e.hp>0}))sCount=0;
      for(var si=0;si<sCount;si++)spawnEnemy(g,sType,null);
      if(g.waveFlavor)showHint(g,"survival","又有敌人涌来！撑住！");
    }
    // Clear if quota met and few enemies remain
    if(g.survivalKillsNeeded<=0&&g.enemies.length<10){
      g.survivalCleared=true;
    }
    // Also clear if all enemies dead and spawn timer still has time (player cleared too fast)
    if(g.enemies.length===0&&g.survivalSpawnTimer>20){
      g.survivalCleared=true;
    }
  }

  // 墨灵AI：自动攻击（位置更新已移至顿帧之前）
  for(var si=g.inkSpirits.length-1;si>=0;si--){var isp=g.inkSpirits[si];
    isp.atkTimer--;
    if(isp.atkTimer<=0){
      var nr=findNearestEnemy(g,isp.x,isp.y);
      if(nr.enemy&&nr.distSq<RANGES.inkSpirit*RANGES.inkSpirit){
        isp.atkTimer=isp.atkCd;
        var bdx=nr.enemy.x-isp.x,bdy=nr.enemy.y-isp.y,bl=Math.sqrt(bdx*bdx+bdy*bdy)||1;
        pushAttack(g,{x:isp.x+bdx/bl*12,y:isp.y+bdy/bl*12,
          vx:bdx/bl*5.5,vy:bdy/bl*5.5,life:50,dmg:isp.dmg,r:7,type:"spirit"});
        if(isp.spiritExplode){
          forEachLiveEnemy(g,function(oe){if(oe===nr.enemy)return;
            if(dstSq(nr.enemy,oe)<RANGES.spiritExplode*RANGES.spiritExplode)damageEnemy(g,oe,Math.floor(isp.dmg*0.4),"spiritExplode")});
          spawnInk(g,nr.enemy.x,nr.enemy.y,5,"accent")
        }
        if(isp.spiritSlow)nr.enemy.slowT=Math.max(nr.enemy.slowT,40)
      }
    }
  }

  // wave check (survival waves only clear after quota met or enemies cleared too fast)
  if(g.waveSpecial==="survival"&&!g.survivalCleared){
    // wave continues — enemies keep spawning until quota met
  }else if(g.enemies.length===0&&g.announceT<=0&&!g.waveCleared){
    g.waveCleared=true;g.waveClearT=80;
    // Wave clear stats float
    var wkt=g.waveStartT>0?Math.round((g.time-g.waveStartT)/60):0;
    var wkm=Math.floor(wkt/60);var wks=wkt%60;
    var wkStr=(wkm<10?"0":"")+wkm+":"+(wks<10?"0":"")+wks;
    var wkText="斩"+g.waveKills+" · "+wkStr;
    if(g.waveKills>=15)wkText+=" · 势如破竹";
    else if(g.waveKills>=8)wkText+=" · 雷厉风行";
    else if(g.waveKills>=4)wkText+=" · 稳中求进";
    // special wave tag
    if(g.waveSpecial==="elite")wkText+=" · 全精英";
    else if(g.waveSpecial==="horde")wkText+=" · 群魔潮";
    else if(g.waveSpecial==="survival")wkText+=" · 生存波";
    pushLimited(g.floatTexts,{x:W/2,y:H*0.35,text:wkText,life:80,maxLife:80,reason:"hint"},LIMITS.floatTexts);
    if(p.lowHpBurst)p.lowHpBurstUsed=false;
    g.waveInkRipple={x:p.x,y:p.y,t:40};
    // 骨续泉：波次清场回血
    if(p.waveHpBonus&&(p.waveHpAdded||0)<(p.waveHpMax||10)){
      var gain=p.waveHpGain||2;p.waveHpAdded=(p.waveHpAdded||0)+gain;
      p.maxHp+=gain;p.hp=Math.min(p.maxHp,p.hp+gain);
      g.waveHpHealed=(g.waveHpHealed||0)+gain;
      snd("critHeal");
      pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-22,text:"+HP"+gain,life:35,maxLife:35,reason:"heal"},LIMITS.floatTexts);
      spawnP(g,p.x,p.y,"moss",4)}
    // 墨泉眼：低血波次回血
    if(p.lowHpWaveHeal&&p.hp<p.maxHp*0.5){
      var lhg=Math.floor(p.maxHp*0.2);p.hp=Math.min(p.maxHp,p.hp+lhg);
      g.waveHpHealed=(g.waveHpHealed||0)+lhg;
      pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-18,text:"+"+lhg,life:35,maxLife:35,reason:"heal"},LIMITS.floatTexts);
      snd("critHeal");spawnP(g,p.x,p.y,"moss",3)}
    if(g.waveFirstKillT>0&&(g.time-g.waveFirstKillT)<=1800)g.fastWaveClear=true;
    spawnInk(g,p.x,p.y,18,"accent");
    var sCol={calm:"ghost",ash:"ash",well:"moss",mask:"ghost",lantern:"gold",inkpool:"ink"}[g.stage?g.stage.id:"calm"]||"accent";
    for(var wci=0;wci<12;wci++){var wca=wci*Math.PI*2/12;
      spawnP(g,p.x+Math.cos(wca)*40,p.y+Math.sin(wca)*40,sCol,2)}
    // screen center celebration burst
    for(var cbi=0;cbi<16;cbi++){var cba=cbi*Math.PI*2/16;
      spawnP(g,W/2+Math.cos(cba)*rn(20,60),H/2+Math.sin(cba)*rn(15,40),sCol,2)}
    var wcl=g.announce?g.announce.split(" · ")[0]:"";
    var wcEl=document.getElementById("waveClear");
    if(wcEl){wcEl.textContent=g._isBossWave?(wcl+" · 击杀"):wcl?wcl+" · 完成":"波次完成";
      wcEl.classList.remove("is-active","is-boss-kill");void wcEl.offsetWidth;
      if(g._isBossWave)wcEl.classList.add("is-boss-kill");
      wcEl.classList.add("is-active");}
    snd(g._isBossWave?"bossDeath":"waveClear");
  }
  // 鬼市商人碰撞
  if(g.merchant&&!g.merchant.used&&!g._merchantCooldown&&dstSq(p,g.merchant)<(p.r+22)*(p.r+22)){
    showMerchant(g);return;
  }
  if(g._merchantCooldown>0)g._merchantCooldown--;
  if(g.waveCleared){g.waveClearT--;if(g.waveClearT>0){updateHUD(g);return}
    g.waveCleared=false;g.waveClearT=0;
    g.wave++;
    if(g.wave>=WAVE_BUDGETS.length){g.state="victory";g.freezeT=100;
      for(var vi=0;vi<60;vi++){var va=rn(0,Math.PI*2),vr=rn(30,160);
        spawnP(g,p.x+Math.cos(va)*vr,p.y+Math.sin(va)*vr,"accent",3)}
      spawnInk(g,p.x,p.y,40,"accent");spawnInk(g,p.x,p.y,25,"gold");
      var wcol=g.weapon.type==="melee"?C.ink:g.weapon.type==="ranged"?C.moss:
        g.weapon.type==="aoe"?"rgba(77,97,86,0.8)":g.weapon.type==="summon"?C.accent:C.gold;
      spawnInk(g,p.x,p.y,30,wcol);
      shake(g,28,8);snd("victory");
      pushLimited(g.floatTexts,{x:W/2,y:H/2-60,text:g.weapon.name+" · 走阴完毕",life:90,maxLife:90,reason:"victory"},LIMITS.floatTexts);
      return}
    showRelic(g)}
  // Pending deathbursts (frame-based)
  if(g.pendingDeathbursts&&g.pendingDeathbursts.length>0){
    for(var dbi=g.pendingDeathbursts.length-1;dbi>=0;dbi--){
      var db=g.pendingDeathbursts[dbi];db.timer--;
      if(db.timer<=0){
        var mr=db.r+p.r;
        if(dstSq(p,db)<mr*mr&&p.invTimer<=0)
          hurtP(g,db.dmg,{x:db.x,y:db.y,name:db.type==="motong"?"墨童爆裂":"爆裂"});
        spawnInk(g,db.x,db.y,10,"accent");shake(g,4,3);snd("hazardWarn");
        g.pendingDeathbursts.splice(dbi,1)}}}
  updateHUD(g);
}

// ════════════════════════════════════════════════════════════════
// § RENDER — per-frame canvas drawing
// ════════════════════════════════════════════════════════════════

function render(g){
  var c=ctx;
  var p=g.player;
  c.restore();c.save();
  try {c.translate(g.shakeX||0,g.shakeY||0);
  // bg (pre-rendered)
  if(bgCanvas)c.drawImage(bgCanvas,0,0);
  else{c.fillStyle=C.paper;c.fillRect(0,0,W,H)}
  c.strokeStyle=C.edge;c.lineWidth=3;c.strokeRect(A.l,A.t,A.r-A.l,A.b-A.t);
  renderStage(g,c);
  // ambient ink motes (subtle floating particles — skip under moderate load)
  if(g._pm>=0.4&&g.time%18===0&&g.enemies.length>0){
    for(var _mi=0;_mi<3;_mi++){
      var _mx=A.l+Math.random()*(A.r-A.l),_my=A.t+Math.random()*(A.b-A.t);
      c.globalAlpha=0.025+Math.random()*0.035;c.fillStyle=C.ink;
      c.beginPath();c.arc(_mx,_my,Math.random()*3+0.5,0,Math.PI*2);c.fill();
    }
    c.globalAlpha=1;
  }
  // ink wipe transition
  if(g.inkWipe>0){
    var wipeProg=g.inkWipe/30;
    var wipeR=wipeProg*Math.sqrt(W*W+H*H)*0.6;
    c.fillStyle=C.ink;c.beginPath();
    c.rect(0,0,W,H);
    c.arc(W/2,H/2,Math.max(1,wipeR),0,Math.PI*2,true);
    c.fill();c.globalAlpha=1}

  // wave clear ink ripple
  if(g.waveInkRipple&&g.waveInkRipple.t>0){
    var rip=g.waveInkRipple;rip.t--;
    if(rip.t<=0){g.waveInkRipple=null}
    var ripProg=1-rip.t/40;var ripR=ripProg*300;
    c.globalAlpha=(1-ripProg)*0.4;c.strokeStyle=C.accent;c.lineWidth=2+ripProg*4;
    c.beginPath();c.arc(rip.x,rip.y,Math.max(1,ripR),0,Math.PI*2);c.stroke();
    c.globalAlpha=(1-ripProg)*0.15;c.strokeStyle=C.ink;c.lineWidth=1;
    c.beginPath();c.arc(rip.x,rip.y,Math.max(1,ripR*0.7),0,Math.PI*2);c.stroke();
    c.globalAlpha=1}

  // Elite wave gold ambient overlay (cached gradient)
  if((g.waveSpecial==="elite"||g.waveSpecial==="elite_horde")&&g.state==="playing"){
    var ep=0.06+0.02*Math.sin(g.time*0.04);
    c.globalAlpha=ep;
    var eg=cachedGradient(c,"eliteOverlay",function(c2){var g2=c2.createRadialGradient(W/2,H/2,W*0.25,W/2,H/2,W*0.7);g2.addColorStop(0,"rgba(212,175,55,0.1)");g2.addColorStop(1,"rgba(180,120,30,0.25)");return g2});
    c.fillStyle=eg;c.fillRect(0,0,W,H);
    // gold border pulse
    c.globalAlpha=0.15+0.05*Math.sin(g.time*0.06);
    c.strokeStyle="rgba(212,175,55,0.5)";c.lineWidth=3;
    c.strokeRect(A.l+1,A.t+1,A.r-A.l-2,A.b-A.t-2);
    c.globalAlpha=1;
  }

  // fires / ink trails (culled: skip off-screen fires)
  g.fires.forEach(function(f){if(f.x+f.r<A.l||f.x-f.r>A.r||f.y+f.r<A.t||f.y-f.r>A.b)return;
    if(f.isBanner){
      var bt=f.life/f.maxLife;c.globalAlpha=bt*0.6;
      // banner pole
      c.fillStyle=C.ink;c.fillRect(f.x-2,f.y-20,4,40);
      // banner cloth
      c.fillStyle=C.accent;c.fillRect(f.x-12,f.y-20,24,18);
      // seal mark
      c.globalAlpha=bt*0.8;c.fillStyle=C.ink;c.font='700 10px serif';c.textAlign="center";
      c.fillText("魂",f.x,f.y-8);
      // glow ring
      c.globalAlpha=bt*0.15;c.fillStyle=C.accent;
      c.beginPath();c.arc(f.x,f.y,f.r,0,Math.PI*2);c.fill();
      c.globalAlpha=1;return}
    var ml=f.maxLife||f.life;var t=f.life/ml;var a=t*0.5;var rr=Math.max(1,f.r*Math.pow(t,0.7));
    if(f.slow){c.globalAlpha=a;c.fillStyle="rgba(23,19,16,0.35)";c.beginPath();
      c.arc(f.x,f.y,rr,0,Math.PI*2);c.fill()}
    else if(f.poison){c.globalAlpha=a*0.7;c.fillStyle="rgba(77,107,86,0.5)";c.beginPath();
      c.arc(f.x,f.y,rr,0,Math.PI*2);c.fill();c.globalAlpha=a*0.3;c.fillStyle="rgba(140,180,120,0.6)";
      c.beginPath();c.arc(f.x,f.y,rr*0.4,0,Math.PI*2);c.fill()}
    else{c.globalAlpha=a;c.fillStyle=C.fire;setShadow(c,C.fire,g._pm>=0.6?12:0,g);
      c.beginPath();c.arc(f.x,f.y,rr,0,Math.PI*2);c.fill();
      clearShadow(c);c.globalAlpha=a*0.5;c.fillStyle=C.ivory;
      c.beginPath();c.arc(f.x,f.y,rr*0.35,0,Math.PI*2);c.fill()}});
  c.globalAlpha=1;

  // frosts (裂冰诀冰冻区)
  g.frosts.forEach(function(fr){var a=fr.life/fr.maxLife;var frR=fr.r*a;
    c.globalAlpha=a*0.2;c.fillStyle=C.frost;
    c.beginPath();c.arc(fr.x,fr.y,frR,0,Math.PI*2);c.fill();
    c.strokeStyle=C.frostE;c.lineWidth=1;c.globalAlpha=a*0.45;c.stroke();
    // crystal lines
    c.globalAlpha=a*0.15;c.strokeStyle=C.frost;c.lineWidth=0.8;
    for(var fi=0;fi<3;fi++){var fa=fi*Math.PI*2/3+fr.life*0.03;
      c.beginPath();c.moveTo(fr.x,fr.y);
      c.lineTo(fr.x+Math.cos(fa)*frR*0.8,fr.y+Math.sin(fa)*frR*0.8);c.stroke()}});
  c.globalAlpha=1;

  // enemy proj (culled: skip off-screen)
  g.eProj.forEach(function(ep){if(ep.x+ep.r<A.l||ep.x-ep.r>A.r||ep.y+ep.r<A.t||ep.y-ep.r>A.b)return;
    c.globalAlpha=0.3;c.fillStyle=C.soft;
    c.beginPath();c.arc(ep.x-ep.vx*0.5,ep.y-ep.vy*0.5,ep.r*0.6,0,Math.PI*2);c.fill();
    c.globalAlpha=0.85;c.fillStyle=C.soft;setShadow(c,C.ink,g._pm>=0.6?6:0,g);
    c.beginPath();c.arc(ep.x,ep.y,ep.r,0,Math.PI*2);c.fill();clearShadow(c);
    c.globalAlpha=0.4;c.fillStyle=C.ivory;
    c.beginPath();c.arc(ep.x,ep.y,ep.r*0.35,0,Math.PI*2);c.fill();
    c.globalAlpha=1});
  // off-screen enemy projectile warnings (edge indicators for incoming threats)
  g.eProj.forEach(function(ep){
    var dx=ep.x-p.x,dy=ep.y-p.y,dSq=dx*dx+dy*dy;
    if(dSq>TUNING.eProjWarnMin*TUNING.eProjWarnMin&&dSq<TUNING.eProjWarnMax*TUNING.eProjWarnMax){
      var a=Math.atan2(dy,dx);
      var ix=cl(p.x+Math.cos(a)*90,A.l+8,A.r-8);
      var iy=cl(p.y+Math.sin(a)*90,A.t+8,A.b-8);
      var pulse=0.3+0.2*Math.sin(g.time*0.3);
      c.globalAlpha=pulse;c.fillStyle=C.accent;
      c.beginPath();c.arc(ix,iy,3,0,Math.PI*2);c.fill();
      c.globalAlpha=1}});

  // attacks (culled: skip off-screen)
  g.attacks.forEach(function(atk){var rr2=atk.range||60;if(atk.x+rr2<A.l||atk.x-rr2>A.r||atk.y+rr2<A.t||atk.y-rr2>A.b)return;
    var prog=1-atk.life/atk.maxLife;
    if(atk.type==="dashSlash"){
      c.save();c.translate(atk.x,atk.y);c.rotate(atk.angle);
      var dR=atk.range*(0.5+prog*0.5);
      // motion trail
      c.globalAlpha=0.2*(1-prog);c.strokeStyle=C.accent;c.lineWidth=8+prog*8;c.lineCap="round";
      c.beginPath();c.arc(0,0,dR,-atk.arc/2,atk.arc/2);c.stroke();
      // main arc
      c.globalAlpha=0.7*(1-prog);c.lineWidth=4+prog*5;
      if(g._pm>=0.45){c.shadowColor=C.accent;c.shadowBlur=14}c.beginPath();
      c.arc(0,0,dR,-atk.arc/2,atk.arc/2);c.stroke();
      // bright core
      c.shadowBlur=0;if(g._pm>=0.5){c.globalAlpha=0.5*(1-prog);c.strokeStyle=C.ivory;c.lineWidth=1.5;c.beginPath();
      c.arc(0,0,dR*0.95,-atk.arc/2,atk.arc/2);c.stroke()}
      // umbrella ribs radiating from center
      if(g._pm>=0.5){c.globalAlpha=0.18*(1-prog);c.strokeStyle=C.accent;c.lineWidth=1;
      for(var di=0;di<5;di++){var da=-atk.arc/2+atk.arc*(di+0.5)/5;
        c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(da)*dR*1.1,Math.sin(da)*dR*1.1);c.stroke()}}
      c.restore();
    }else if(atk.type==="slash"){
      c.save();c.translate(atk.x,atk.y);c.rotate(atk.angle);
      var sR=atk.range*(0.6+prog*0.4);
      c.globalAlpha=0.6*(1-prog);c.strokeStyle=C.ink;c.lineWidth=3+prog*4;c.lineCap="round";
      if(g._pm>=0.45){c.shadowColor=C.ink;c.shadowBlur=8}c.beginPath();
      c.arc(0,0,sR,-atk.arc/2,atk.arc/2);c.stroke();
      c.shadowBlur=0;
      // white inner arc for sharpness
      if(g._pm>=0.5){c.globalAlpha=0.35*(1-prog);c.strokeStyle=C.ivory;c.lineWidth=1.5;c.beginPath();
      c.arc(0,0,sR*0.92,-atk.arc/2,atk.arc/2);c.stroke()}
      // ink splatter dots along arc
      if(g._pm>=0.5){c.globalAlpha=0.3*(1-prog);c.fillStyle=C.ink;
      for(var si=0;si<4;si++){var sa=-atk.arc/2+atk.arc*(si+0.5)/4;
        var sd=sR+rn(-3,6);c.beginPath();c.arc(Math.cos(sa)*sd,Math.sin(sa)*sd,rn(1,2.5),0,Math.PI*2);c.fill()}}
      c.restore();
    }else if(atk.type==="proj"){
      var pR=atk.r||8;
      var pCol=atk.bounced?C.accent:atk.echo?"rgba(163,58,45,0.7)":C.moss;
      var pShadow=atk.bounced?C.accent:atk.echo?C.accent:C.moss;
      c.fillStyle=pCol;
      // 3-frame fading trail
      c.globalAlpha=0.15;c.beginPath();c.arc(atk.x-atk.vx*2,atk.y-atk.vy*2,pR*0.5,0,Math.PI*2);c.fill();
      c.globalAlpha=0.3;c.beginPath();c.arc(atk.x-atk.vx,atk.y-atk.vy,pR*0.7,0,Math.PI*2);c.fill();
      c.globalAlpha=0.85;if(g._pm>=0.45){c.shadowColor=pShadow;c.shadowBlur=10}
      if(atk.seek){
        // seek blade: diamond shape
        c.beginPath();c.moveTo(atk.x,atk.y-pR);c.lineTo(atk.x+pR*0.6,atk.y);
        c.lineTo(atk.x,atk.y+pR);c.lineTo(atk.x-pR*0.6,atk.y);c.closePath();c.fill();
      }else{
        // crescent shape: angled half-moon
        var pAng=Math.atan2(atk.vy,atk.vx);
        c.beginPath();c.arc(atk.x,atk.y,pR,pAng-Math.PI*0.55,pAng+Math.PI*0.55);c.closePath();c.fill();
      }
      c.shadowBlur=0;
      c.globalAlpha=1;
    }else if(atk.type==="ring"){
      var r=Math.max(1,atk.r||0);
      // inner glow
      c.globalAlpha=0.04*(1-prog);c.fillStyle=C.moss;
      c.beginPath();c.arc(atk.x,atk.y,r,0,Math.PI*2);c.fill();
      // ripple rings (decorative concentric — skip under moderate load)
      if(g._pm>=0.5){c.globalAlpha=0.12*(1-prog);c.strokeStyle=C.moss;c.lineWidth=1;
      for(var rippleDrawI=0;rippleDrawI<3;rippleDrawI++){var rr=r*(0.35+rippleDrawI*0.2);c.beginPath();c.arc(atk.x,atk.y,rr,0,Math.PI*2);c.stroke()}}
      // outer ring
      c.globalAlpha=0.5*(1-prog);c.strokeStyle=C.moss;c.lineWidth=4+prog*6;
      if(g._pm>=0.45){c.shadowColor=C.moss;c.shadowBlur=14}c.beginPath();c.arc(atk.x,atk.y,r,0,Math.PI*2);c.stroke();
      // inner bright edge
      c.shadowBlur=0;if(g._pm>=0.5){c.globalAlpha=0.2*(1-prog);c.strokeStyle=C.ivory;c.lineWidth=1.5;
      c.beginPath();c.arc(atk.x,atk.y,r*0.88,0,Math.PI*2);c.stroke()}
      c.globalAlpha=1;
    }else if(atk.type==="spirit"){
      var spR=atk.r||6;
      c.globalAlpha=0.2;c.fillStyle=C.accent;
      c.beginPath();c.arc(atk.x-atk.vx,atk.y-atk.vy,spR*0.5,0,Math.PI*2);c.fill();
      c.globalAlpha=0.85;if(g._pm>=0.45){c.shadowColor=C.accent;c.shadowBlur=8}
      c.fillStyle=C.ghost;c.beginPath();c.arc(atk.x,atk.y,spR,0,Math.PI*2);c.fill();
      c.shadowBlur=0;c.globalAlpha=0.5;c.fillStyle=C.ivory;
      c.beginPath();c.arc(atk.x,atk.y,spR*0.4,0,Math.PI*2);c.fill();
      c.globalAlpha=1;
    }
  });

  // enemies
  g.enemies.forEach(function(e){if(e.hp<=0&&(!e.deathT||e.deathT<=0))return;
    // v3.4 curse: 虚实 — enemies flicker invisible every 5s for 1s
    if(p.enemyFlicker&&!e.isBoss){var flickCycle=g.time%300;if(flickCycle>=240&&flickCycle<300)return}
    var by=Math.sin(e.bob)*2;c.save();c.translate(e.x,e.y+by);
    // 画皮伪装渲染
    if(e.mimic&&e.disguised){
      c.globalAlpha=0.6+Math.sin(g.time*0.08)*0.2;c.fillStyle=C.moss;
      c.beginPath();c.arc(0,0,e.r*0.6,0,Math.PI*2);c.fill();
      c.globalAlpha=1;c.fillStyle=C.ivory;
      c.beginPath();c.arc(0,0,e.r*0.25,0,Math.PI*2);c.fill();
      c.restore();return}
    // spawn fade-in
    if(e.spawnPulse>0){if(e.spawnPulse===16&&(e.isBoss||e.elite))snd("spawnPulse");e.spawnPulse--;var sp=e.spawnPulse/16;var pR=(1-sp)*e.r*2.5;
    c.globalAlpha=sp*0.45;c.strokeStyle=e.isBoss?C.boss:e.elite?C.gold:C.accent;c.lineWidth=2.5*sp;
    c.beginPath();c.arc(0,0,pR,0,Math.PI*2);c.stroke();c.globalAlpha=1;c.lineWidth=1}
    if(e.spawnGraceT>0){var sg=e.spawnGraceT/TUNING.spawnGraceDuration;var invSg=1-sg;
      var bounceScale=0.18+0.82*Math.pow(invSg,0.55)+0.12*Math.sin(invSg*Math.PI)*Math.pow(sg,2);
      c.globalAlpha=Math.min(1,invSg*1.3);
      c.scale(bounceScale,bounceScale);
      c.globalAlpha=Math.max(0,sg*0.7);c.strokeStyle=C.accent;c.lineWidth=2.5*sg+0.5;
      if(g._pm>=0.45){c.shadowColor=e.isBoss?C.accent:C.ink;c.shadowBlur=16*sg}
      c.beginPath();c.arc(0,0,e.r+18*sg,0,Math.PI*2);c.stroke();c.shadowBlur=0;
      c.globalAlpha=Math.max(0,sg*0.5);c.strokeStyle=C.ivory;c.lineWidth=1.5;
      c.beginPath();c.arc(0,0,e.r+6*sg,0,Math.PI*2);c.stroke();
      if(sg>0.5){c.globalAlpha=Math.max(0,(sg-0.5)*1.2);c.fillStyle=C.accent;
        for(var spk=0;spk<4;spk++){var spA=spk*Math.PI/2+sg*1.5;
          c.beginPath();c.arc(Math.cos(spA)*(e.r+14)*(1-sg),Math.sin(spA)*(e.r+14)*(1-sg),1.5*sg,0,Math.PI*2);c.fill()}}
      c.globalAlpha=Math.min(1,invSg*1.3)}
    if(e.fearT>0){c.translate(rn(-2,2),rn(-2,2))}
    if(e.deathT&&e.deathT>0){var dt=e.deathT/18;c.globalAlpha=Math.pow(dt,0.7);var sc=dt*0.8+0.2;
      c.rotate((1-dt)*0.5);c.scale(sc,sc);
      if(e.isBoss||e.type==="fenling"||e.type==="fenshen"||e.type==="zhikuang"){
        c.globalAlpha=Math.max(0,dt*0.6);c.strokeStyle=C.accent;c.lineWidth=3*(1-dt);
        if(g._pm>=0.45){c.shadowColor=C.accent;c.shadowBlur=18*(1-dt)}
        var deathRings=g._pm>=0.5?3:1;
        for(var dri=0;dri<deathRings;dri++){c.beginPath();c.arc(0,0,e.r+14+(1-dt)*30+dri*10,0,Math.PI*2);c.stroke()}
        c.shadowBlur=0;
        c.globalAlpha=Math.max(0,dt*0.7-0.3);c.fillStyle=C.ivory;
        c.beginPath();c.arc(0,0,e.r*dt,0,Math.PI*2);c.fill();
      }
      c.globalAlpha=dt}
    if(e.hitFlash>0){c.globalAlpha=Math.min(1,0.5+0.15*e.hitFlash);c.fillStyle="#fff";c.beginPath();
      c.arc(0,0,e.r+4,0,Math.PI*2);c.fill();
      c.globalAlpha=0.15*e.hitFlash;c.strokeStyle=C.accent;c.lineWidth=2;c.beginPath();
      c.arc(0,0,e.r+6,0,Math.PI*2);c.stroke();c.globalAlpha=1}
    if(e.fearT>0){var fearA=0.2+0.1*Math.sin(g.time*0.2);
      c.globalAlpha=fearA;c.strokeStyle="#8b6ea0";c.lineWidth=1.5;
      c.setLineDash([3,4]);c.beginPath();c.arc(rn(-1,1),rn(-1,1),e.r+6,0,Math.PI*2);c.stroke();
      c.setLineDash([]);c.globalAlpha=1}
    if(e.elite){var ePulse=0.35+0.15*Math.sin(g.time*0.12);
      c.globalAlpha=ePulse;c.strokeStyle=C.gold;c.lineWidth=2;
      if(g._pm>=0.45){c.shadowColor=C.gold;c.shadowBlur=8}
      c.beginPath();c.arc(0,0,e.r+8,0,Math.PI*2);c.stroke();
      c.shadowBlur=0;c.globalAlpha=1}
    if(e.prepT>0){c.globalAlpha=0.25+e.prepT/28;c.strokeStyle=C.accent;c.lineWidth=2;
      c.setLineDash([4,5]);c.beginPath();c.arc(0,0,e.r+10,0,Math.PI*2);c.stroke();c.setLineDash([]);
      // direction indicator
      c.globalAlpha=0.15+e.prepT/50;c.strokeStyle=C.accent;c.lineWidth=1.5;c.setLineDash([]);
      var prepAng=Math.atan2(g.player.y-e.y,g.player.x-e.x);
      c.beginPath();c.moveTo(Math.cos(prepAng)*(e.r+4),Math.sin(prepAng)*(e.r+4));
      c.lineTo(Math.cos(prepAng)*(e.r+18),Math.sin(prepAng)*(e.r+18));c.stroke();
      c.globalAlpha=1}
    if(e.chargeT>0){c.globalAlpha=0.18;c.fillStyle=C.accent;
      c.beginPath();c.arc(-e.chargeVx*2,-e.chargeVy*2,e.r*0.8,0,Math.PI*2);c.fill();c.globalAlpha=1}
    // boss charge telegraph
    if(e.bossPrepT>0){var bTeleAlpha=0.3+0.4*(1-e.bossPrepT/20);
      c.globalAlpha=bTeleAlpha;c.strokeStyle=C.accent;c.lineWidth=2+e.bossPrepT*0.1;
      c.setLineDash([6,4]);c.beginPath();
      c.moveTo(Math.cos(e.bossPrepAng)*(e.r+2),Math.sin(e.bossPrepAng)*(e.r+2));
      c.lineTo(Math.cos(e.bossPrepAng)*160,Math.sin(e.bossPrepAng)*160);
      c.stroke();c.setLineDash([]);c.globalAlpha=1}
    // boss 8-dir fan telegraph (skip decorative lines under load)
    if(e.isBoss&&e.type!=="mojiangjun"&&g._pm>=0.45){var fanMod=g.time%90;if(fanMod>=70){var fanWarn=(fanMod-70)/20;
      c.globalAlpha=0.15+fanWarn*0.35;c.strokeStyle=C.ink;c.lineWidth=1+fanWarn;
      c.setLineDash([3,4]);for(var fti=0;fti<8;fti++){var ftA=fti*Math.PI/4;
        c.beginPath();c.moveTo(Math.cos(ftA)*(e.r+3),Math.sin(ftA)*(e.r+3));
        c.lineTo(Math.cos(ftA)*(e.r+40+fanWarn*20),Math.sin(ftA)*(e.r+40+fanWarn*20));c.stroke()}
      c.setLineDash([]);c.globalAlpha=1}}
    c.fillStyle=e.col;c.strokeStyle=e.edge;c.lineWidth=2;
    setShadow(c,e.edge,g._pm>=0.7?8:0,g);
    if(e.isBoss){
      // boss threat aura
      if(e.enraged){c.globalAlpha=0.12+0.06*Math.sin(g.time*0.15);c.fillStyle=C.fire;
        c.beginPath();c.arc(0,0,e.r+14,0,Math.PI*2);c.fill();c.globalAlpha=1}
      drawBlob(c,0,0,e.r,8);
    }else if(e.type==="youhun"){
      // ghost: wavy bottom edge
      c.beginPath();c.arc(0,-e.r*0.2,e.r*0.95,Math.PI,0);
      c.lineTo(e.r*0.95,e.r*0.8);
      for(var wi=0;wi<4;wi++){var wx=e.r*0.95-(wi+0.5)*(e.r*1.9/4);
        c.quadraticCurveTo(wx+e.r*0.24,e.r*1.1+Math.sin(g.time*0.08+wi)*2,wx,e.r*0.7)}
      c.closePath();c.fill();c.stroke();
    }else if(e.type==="fenling"){
      // fire elemental: flame crown spikes
      c.beginPath();c.arc(0,0,e.r,0,Math.PI*2);c.fill();c.stroke();
      c.globalAlpha=0.5;c.fillStyle=C.fire;
      for(var fi=0;fi<5;fi++){var fa=-Math.PI/2+fi*Math.PI*2/5+Math.sin(g.time*0.12+fi)*0.15;
        c.beginPath();c.moveTo(Math.cos(fa)*(e.r-2),Math.sin(fa)*(e.r-2));
        c.lineTo(Math.cos(fa)*(e.r+6+rn(0,2)),Math.sin(fa)*(e.r+6+rn(0,2)));
        c.lineTo(Math.cos(fa+0.3)*(e.r-1),Math.sin(fa+0.3)*(e.r-1));c.fill()}
      c.globalAlpha=1;
    }else if(e.type==="jiangshi"){
      // zombie: rectangular body
      var jr=e.r*0.85;c.fillRect(-jr,-jr,jr*2,jr*2);c.strokeRect(-jr,-jr,jr*2,jr*2);
    }else if(e.type==="fenshen"){
      // splitter: double outline (clone echo)
      c.beginPath();c.arc(0,0,e.r,0,Math.PI*2);c.fill();c.stroke();
      c.globalAlpha=0.25;c.strokeStyle=e.edge;c.lineWidth=1;
      c.beginPath();c.arc(3,-2,e.r+4,0,Math.PI*2);c.stroke();c.globalAlpha=1;
    }else if(e.type==="zhikuang"){
      // summoner: diamond body
      c.beginPath();c.moveTo(0,-e.r);c.lineTo(e.r,0);c.lineTo(0,e.r);c.lineTo(-e.r,0);
      c.closePath();c.fill();c.stroke();
    }else if(e.type==="moya"){
      // crow: angular diamond with wing flares
      c.beginPath();c.moveTo(0,-e.r*1.1);c.lineTo(e.r*0.7,0);c.lineTo(0,e.r*0.8);
      c.lineTo(-e.r*0.7,0);c.closePath();c.fill();c.stroke();
      c.globalAlpha=0.3;c.strokeStyle=e.edge;c.lineWidth=1;
      c.beginPath();c.moveTo(e.r*0.7,0);c.lineTo(e.r*1.5,-e.r*0.5);c.stroke();
      c.beginPath();c.moveTo(-e.r*0.7,0);c.lineTo(-e.r*1.5,-e.r*0.5);c.stroke();
      c.globalAlpha=1;
    }else if(e.type==="shiyong"){
      // stone soldier: heavy square with angular shoulders
      var sr=e.r*0.85;c.fillRect(-sr,-sr*0.9,sr*2,sr*1.8);
      c.strokeRect(-sr,-sr*0.9,sr*2,sr*1.8);
      c.globalAlpha=0.2;c.fillStyle=C.ink;
      c.fillRect(-sr*0.3,-sr*1.15,sr*0.6,sr*0.25);
      c.globalAlpha=1;
    }else if(e.type==="moyong"){
      c.beginPath();c.ellipse(0,0,e.r*1.1,e.r*0.8,0,0,Math.PI*2);c.fill();c.stroke();
      c.beginPath();c.arc(0,0,e.r*0.4,0,Math.PI*2);c.stroke()
    }else if(e.type==="morui"){
      c.beginPath();c.moveTo(0,-e.r*1.2);c.lineTo(-e.r*0.7,-e.r*0.4);c.lineTo(-e.r*0.9,e.r*0.5);
      c.lineTo(-e.r*0.3,e.r*0.3);c.lineTo(0,e.r*1.1);c.lineTo(e.r*0.3,e.r*0.3);
      c.lineTo(e.r*0.9,e.r*0.5);c.lineTo(e.r*0.7,-e.r*0.4);c.closePath();c.fill();c.stroke()
    }else if(e.type==="modie"){
      var bf=Math.sin(g.time*0.25)*0.35;c.beginPath();
      c.moveTo(0,-e.r*0.5);c.lineTo(-e.r*(1+bf),-e.r*0.8);c.lineTo(-e.r*(0.9+bf),e.r*0.2);
      c.lineTo(-e.r*0.3,e.r*0.9);c.lineTo(0,e.r*0.3);c.closePath();c.fill();c.stroke();
      c.beginPath();c.moveTo(0,-e.r*0.5);c.lineTo(e.r*(1+bf),-e.r*0.8);c.lineTo(e.r*(0.9+bf),e.r*0.2);
      c.lineTo(e.r*0.3,e.r*0.9);c.lineTo(0,e.r*0.3);c.closePath();c.fill();c.stroke();
    }else if(e.type==="mofu"){
      // bat: winged body with swoop telegraph
      var wf=Math.sin(g.time*0.2)*0.4;c.beginPath();
      c.moveTo(0,-e.r*0.7);c.lineTo(e.r*1.3+wf,-e.r*0.3);c.lineTo(e.r*0.7,e.r*0.3);
      c.lineTo(e.r,wf);c.lineTo(e.r*0.6,e.r*1);c.lineTo(0,e.r*0.5);
      c.lineTo(-e.r*0.6,e.r*1);c.lineTo(-e.r,wf);c.lineTo(-e.r*0.7,e.r*0.3);
      c.lineTo(-e.r*1.3-wf,-e.r*0.3);c.closePath();c.fill();c.stroke();
      if(e.swoopState==="prep"){c.globalAlpha=0.5+0.3*Math.sin(g.time*0.3);
        c.strokeStyle=C.accent;c.lineWidth=1.5;c.setLineDash([3,3]);
        c.beginPath();c.arc(0,0,e.r+8,0,Math.PI*2);c.stroke();c.setLineDash([]);
        c.globalAlpha=1}
    }else if(e.type==="gudeng"){
      // bone lantern: body + 3 light prongs
      c.beginPath();c.arc(0,2,e.r*0.8,0,Math.PI*2);c.fill();c.stroke();
      c.globalAlpha=0.6;c.fillStyle=C.gold;
      for(var gli=0;gli<3;gli++){var gla=-Math.PI/2+gli*0.5-0.5;
        c.beginPath();c.moveTo(Math.cos(gla)*e.r*0.5,Math.sin(gla)*e.r*0.5+2);
        c.lineTo(Math.cos(gla)*(e.r+5),Math.sin(gla)*(e.r+5)+2);c.stroke()}
      c.globalAlpha=1;
    }else if(e.type==="shigui"){
      // ash-eater: wide blob with jagged mouth
      c.beginPath();c.arc(0,0,e.r,0,Math.PI*2);c.fill();c.stroke();
      c.globalAlpha=0.4;c.strokeStyle=C.ink;c.lineWidth=1;
      c.beginPath();c.moveTo(-e.r*0.5,e.r*0.2);c.lineTo(-e.r*0.2,e.r*0.4);
      c.lineTo(e.r*0.1,e.r*0.15);c.lineTo(e.r*0.4,e.r*0.35);c.stroke();
      c.globalAlpha=1;
    }else if(e.type==="yanyong"){
      // fire soldier: rectangular body with fire crown
      var yr=e.r*0.8;c.fillRect(-yr,-yr*0.9,yr*2,yr*1.8);c.strokeRect(-yr,-yr*0.9,yr*2,yr*1.8);
      c.globalAlpha=0.45;c.fillStyle=C.fire;
      for(var yfi=0;yfi<3;yfi++){var yfx=-e.r*0.5+yfi*e.r*0.5;
        c.beginPath();c.moveTo(yfx,-yr*0.9);c.lineTo(yfx+3,-yr*0.9-5-Math.random()*4);
        c.lineTo(yfx+6,-yr*0.9);c.fill()}
      c.globalAlpha=1;
    }else if(e.type==="sukui"){
      // swift ghost: thin elongated diamond
      c.beginPath();c.moveTo(0,-e.r*1.3);c.lineTo(e.r*0.4,0);c.lineTo(0,e.r*1.1);
      c.lineTo(-e.r*0.4,0);c.closePath();c.fill();c.stroke();
    }else if(e.type==="mozhi"){
      // leech: teardrop shape
      c.beginPath();c.moveTo(0,-e.r*1.1);c.quadraticCurveTo(e.r*0.9,-e.r*0.3,e.r*0.6,e.r*0.5);
      c.quadraticCurveTo(0,e.r*1.2,-e.r*0.6,e.r*0.5);
      c.quadraticCurveTo(-e.r*0.9,-e.r*0.3,0,-e.r*1.1);c.fill();c.stroke();
    }else if(e.type==="motong"){
      // ink child: round body with topknot
      c.beginPath();c.arc(0,2,e.r*0.85,0,Math.PI*2);c.fill();c.stroke();
      c.globalAlpha=0.5;c.fillStyle=C.ink;c.beginPath();
      c.arc(0,-e.r*0.6,3,0,Math.PI*2);c.fill();c.globalAlpha=1;
    }else if(e.type==="duzhu"){
      // spider: body + 6 leg spikes
      c.beginPath();c.arc(0,0,e.r*0.7,0,Math.PI*2);c.fill();c.stroke();
      c.globalAlpha=0.35;c.strokeStyle=C.moss;c.lineWidth=1.5;
      for(var dli=0;dli<6;dli++){var dla=dli*Math.PI/3;
        c.beginPath();c.moveTo(Math.cos(dla)*e.r*0.6,Math.sin(dla)*e.r*0.6);
        c.lineTo(Math.cos(dla)*e.r*1.3,Math.sin(dla)*e.r*1.3);c.stroke()}
      c.globalAlpha=1;
    }else if(e.type==="gushi"){
      // curse master: hexagonal ritual body
      c.beginPath();for(var hxi=0;hxi<6;hxi++){var hxa=hxi*Math.PI/3-Math.PI/6;
        var hpx=Math.cos(hxa)*e.r,hpy=Math.sin(hxa)*e.r;
        hxi===0?c.moveTo(hpx,hpy):c.lineTo(hpx,hpy)}
      c.closePath();c.fill();c.stroke();
    }else if(e.type==="moyingjiang"){
      // shadow general: broad armored rectangle with shoulder spikes
      var sg=e.r*0.85;c.fillRect(-sg,-sg*0.9,sg*2,sg*1.8);c.strokeRect(-sg,-sg*0.9,sg*2,sg*1.8);
      c.globalAlpha=0.3;c.fillStyle=C.ink;
      c.fillRect(-sg*1.2,-sg*0.4,sg*0.4,sg*0.8);c.fillRect(sg*0.8,-sg*0.4,sg*0.4,sg*0.8);
      c.globalAlpha=1;
    }else if(e.type==="moguchong"){
      // parasite: small teardrop with pincers
      c.beginPath();c.moveTo(0,-e.r*1.2);c.quadraticCurveTo(e.r*0.8,-e.r*0.2,e.r*0.5,e.r*0.6);
      c.quadraticCurveTo(0,e.r*1.3,-e.r*0.5,e.r*0.6);
      c.quadraticCurveTo(-e.r*0.8,-e.r*0.2,0,-e.r*1.2);c.fill();c.stroke();
      c.globalAlpha=0.5;c.strokeStyle=C.moss;c.lineWidth=1;
      c.beginPath();c.moveTo(-e.r*0.3,-e.r*1.1);c.lineTo(-e.r*0.6,-e.r*1.5);c.stroke();
      c.beginPath();c.moveTo(e.r*0.3,-e.r*1.1);c.lineTo(e.r*0.6,-e.r*1.5);c.stroke();
      c.globalAlpha=1;
    }else if(e.type==="molingdeng"||e.type==="modeng"){
      // spirit lamp: oval body with flame top
      c.beginPath();c.ellipse(0,2,e.r*0.8,e.r*0.6,0,0,Math.PI*2);c.fill();c.stroke();
      c.globalAlpha=0.5;c.fillStyle=C.gold;
      c.beginPath();c.moveTo(0,-e.r);c.lineTo(-e.r*0.3,-e.r*0.4);
      c.lineTo(e.r*0.3,-e.r*0.4);c.closePath();c.fill();c.globalAlpha=1;
    }else{
      c.beginPath();c.arc(0,0,e.r,0,Math.PI*2);c.fill();c.stroke()}
    c.shadowBlur=0;
    // Elite ability tag
    if(e.elite&&e.eliteAbility){c.fillStyle=C.gold;c.globalAlpha=0.7;
      c.font='600 11px '+C.fontBody;c.textAlign="center";
      var abNames={blink:"瞬",deathburst:"爆",enrage:"狂",armored:"甲",regen:"愈",vampire:"吸"};
      c.fillText(abNames[e.eliteAbility]||"",0,-e.r-20);c.globalAlpha=1}
    c.fillStyle=e.isBoss?(e.enraged?C.accent:C.ink):C.ink;var eo=e.r*0.3;
    var eyeR=e.isBoss?2.5:2;
    c.beginPath();c.arc(-eo,-2,eyeR,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(eo,-2,eyeR,0,Math.PI*2);c.fill();
    if(!e.isBoss&&e.hp<e.maxHp){c.fillStyle="rgba(23,19,16,0.15)";c.fillRect(-e.r,-e.r-8,e.r*2,3);
      var hpR=e.hp/e.maxHp;
      c.fillStyle=hpR>0.5?C.accent:hpR>0.25?"#b85a2d":"#8a2a1a";
      c.fillRect(-e.r,-e.r-8,e.r*2*hpR,3)}
    // 恐惧光环
    if(e.fearT>0){c.strokeStyle="rgba(44,37,32,0.5)";c.lineWidth=1;c.setLineDash([3,3]);
      c.beginPath();c.arc(0,0,e.r+6,0,Math.PI*2);c.stroke();c.setLineDash([])}
    // 弱点标记
    var wt=p.weakTargets[e.id];
    if(wt&&wt>0){c.fillStyle=C.accent;c.globalAlpha=0.7+0.3*Math.sin(g.time*0.2);
      c.beginPath();c.arc(0,-e.r-12,3+Math.sin(g.time*0.3),0,Math.PI*2);c.fill();
      c.globalAlpha=0.3;c.beginPath();c.arc(0,-e.r-12,7,0,Math.PI*2);c.fill();
      c.globalAlpha=1}
    // 墨钉标记
    if(e.pinned>0){c.strokeStyle=C.accent;c.lineWidth=1.5;c.globalAlpha=0.6+0.2*Math.sin(g.time*0.4);
      c.beginPath();c.moveTo(-5,-e.r-6);c.lineTo(5,-e.r-6);c.moveTo(0,-e.r-10);c.lineTo(0,-e.r-2);c.stroke();
      c.globalAlpha=1}
    // 墨蚀指示
    if(e.corrodeT>0&&e.corrode>0){var corA=0.25+0.15*Math.sin(g.time*0.15);
      c.strokeStyle=C.moss;c.lineWidth=1.5;c.globalAlpha=corA;c.setLineDash([2,3]);
      c.beginPath();c.arc(0,0,e.r+3,0,Math.PI*2);c.stroke();c.setLineDash([]);
      c.globalAlpha=corA+0.2;c.fillStyle=C.moss;c.font='600 10px '+C.fontBody;c.textAlign="center";
      c.fillText(e.corrode+"",0,e.r+12);c.globalAlpha=1}
    // 护盾环（墨盾鬼）
    if(e.hasShield&&e.shield>0){c.strokeStyle=C.ink;c.lineWidth=2;c.globalAlpha=0.5;c.setLineDash([4,4]);
      c.beginPath();c.arc(0,0,e.r+6,0,Math.PI*2*(e.shield/e.maxShield));c.stroke();c.setLineDash([]);c.globalAlpha=1}
    // 召唤者标记（纸鸢匠）
    if(e.summoner){c.strokeStyle=C.gold;c.lineWidth=1.5;c.globalAlpha=0.55;c.setLineDash([3,5]);
      c.beginPath();c.arc(0,0,e.r+10,0,Math.PI*2);c.stroke();c.setLineDash([]);c.globalAlpha=1}
    // 蛊师光环
    if(e.buffAura){var bA=0.15+0.08*Math.sin(g.time*0.05);c.strokeStyle=C.boss;c.lineWidth=1.5;
      c.globalAlpha=bA;c.beginPath();c.arc(0,0,90,0,Math.PI*2);c.stroke();
      c.globalAlpha=bA*0.3;c.fillStyle=C.boss;c.beginPath();c.arc(0,0,90,0,Math.PI*2);c.fill();c.globalAlpha=1}
    if(e.healAura){var hA=e.healAuraT<30?0.25:0.1;hA+=0.05*Math.sin(g.time*0.06);c.strokeStyle=C.moss;c.lineWidth=1;
      c.globalAlpha=hA;c.beginPath();c.arc(0,0,e.healAuraR,0,Math.PI*2);c.stroke();
      c.globalAlpha=hA*0.3;c.fillStyle=C.moss;c.beginPath();c.arc(0,0,e.healAuraR,0,Math.PI*2);c.fill();c.globalAlpha=1}
    // elite crown
    if(e.elite&&e.hp>0){
      var _ecSin=Math.sin(g.time*0.1);c.globalAlpha=0.45+_ecSin*0.2;
      c.fillStyle=C.gold;var _ecY=-e.r-12-(e.isBoss?18:0);
      c.beginPath();c.moveTo(0,_ecY-3);c.lineTo(4,_ecY+2);c.lineTo(-4,_ecY+2);c.closePath();c.fill();
      c.beginPath();c.arc(0,_ecY-4,5,0,Math.PI*2);c.stroke();c.globalAlpha=1;
    }
    // 被增益标记
    if(e.buffed>0){c.fillStyle=C.boss;c.globalAlpha=0.3+0.15*Math.sin(g.time*0.15);
      c.beginPath();c.arc(0,0,e.r+4,0,Math.PI*2);c.fill();c.globalAlpha=1}
    c.globalAlpha=1;c.restore()});

  // player
  c.save();c.translate(p.x,p.y);
  // dodge/dash afterimages
  if(p.dodgeT>0||p.dashT>0){
    var dx=p.dodgeT>0?p.dodgeDx:p.dashDx,dy=p.dodgeT>0?p.dodgeDy:p.dashDy;
    for(var ai=1;ai<=3;ai++){
      c.globalAlpha=0.12*(4-ai)/3;c.fillStyle=C.ink;
      c.beginPath();c.arc(-dx*ai*0.6,-dy*ai*0.6,p.r*0.85,0,Math.PI*2);c.fill();
    }
  }
  if(p.invTimer>0)c.globalAlpha=0.5+0.3*Math.sin(p.invTimer*0.5);
  c.fillStyle=C.ink;setShadow(c,C.ink,g._pm>=0.6?10:0,g);
  c.beginPath();c.arc(0,0,p.r,0,Math.PI*2);c.fill();clearShadow(c);
  // weapon type ring with idle pulse
  var wCol=g.weapon.type==="melee"?C.accent:g.weapon.type==="ranged"?C.moss:
    g.weapon.type==="aoe"?"rgba(77,97,86,0.6)":g.weapon.type==="summon"?C.accent:C.gold;
  // weapon-specific silhouette accent
  c.globalAlpha=0.4;c.fillStyle=wCol;c.strokeStyle=wCol;
  if(g.weapon.type==="melee"){c.lineWidth=3;c.beginPath();
    c.moveTo(Math.cos(p.facing)*(p.r+2),Math.sin(p.facing)*(p.r+2));
    c.lineTo(Math.cos(p.facing)*(p.r+14),Math.sin(p.facing)*(p.r+14));c.stroke()}
  else if(g.weapon.type==="ranged"){c.beginPath();
    c.moveTo(Math.cos(p.facing)*(p.r+3),Math.sin(p.facing)*(p.r+3));
    c.lineTo(Math.cos(p.facing+0.25)*(p.r+12),Math.sin(p.facing+0.25)*(p.r+12));
    c.lineTo(Math.cos(p.facing-0.25)*(p.r+12),Math.sin(p.facing-0.25)*(p.r+12));c.closePath();c.fill()}
  else if(g.weapon.type==="aoe"){c.beginPath();c.arc(0,-p.r-6,4,0,Math.PI*2);c.fill();
    c.lineWidth=1.5;c.beginPath();c.moveTo(0,-p.r-2);c.lineTo(0,-p.r-10);c.stroke()}
  else if(g.weapon.type==="dash"){c.lineWidth=2.5;c.beginPath();
    c.arc(0,0,p.r+8,p.facing+Math.PI*0.6,p.facing+Math.PI*1.4);c.stroke()}
  else if(g.weapon.type==="summon"){c.fillRect(-2,-p.r-14,4,10);
    c.fillRect(-6,-p.r-16,12,6);c.font='700 6px serif';c.textAlign="center";
    c.fillText("魂",0,-p.r-12)}
  c.globalAlpha=1;
  var idlePulse=Math.min(1,p.idleT/90);var pulseAlpha=0.3+0.18*Math.sin(g.time*0.06)*idlePulse;
  var pulseR=p.r+2+Math.sin(g.time*0.05)*2*idlePulse;
  c.strokeStyle=wCol;c.lineWidth=2;c.beginPath();c.arc(0,0,pulseR,0,Math.PI*2);c.stroke();
  // idle glow aura
  if(idlePulse>0.5){
    c.globalAlpha=pulseAlpha*0.5;c.fillStyle=wCol;if(g._pm>=0.45){c.shadowColor=wCol;c.shadowBlur=10+6*Math.sin(g.time*0.07)}
    c.beginPath();c.arc(0,0,p.r+5+Math.sin(g.time*0.05)*3,0,Math.PI*2);c.fill();c.shadowBlur=0;c.globalAlpha=1
  }
  // ink brush stroke tail
  c.globalAlpha=0.18;c.fillStyle=C.ink;
  c.beginPath();
  var tailAng=p.facing+Math.PI;
  c.moveTo(Math.cos(tailAng-0.3)*p.r,Math.sin(tailAng-0.3)*p.r);
  c.quadraticCurveTo(Math.cos(tailAng)*(p.r+6),Math.sin(tailAng)*(p.r+6),
    Math.cos(tailAng+0.3)*p.r,Math.sin(tailAng+0.3)*p.r);
  c.fill();c.globalAlpha=1;
  c.strokeStyle=C.ivory;c.lineWidth=2;c.lineCap="round";c.beginPath();
  c.moveTo(Math.cos(p.facing)*6,Math.sin(p.facing)*6);
  c.lineTo(Math.cos(p.facing)*(p.r+4),Math.sin(p.facing)*(p.r+4));c.stroke();
  // weapon-specific forward indicator dot
  c.globalAlpha=0.6;c.fillStyle=wCol;
  c.beginPath();c.arc(Math.cos(p.facing)*(p.r+5),Math.sin(p.facing)*(p.r+5),2.5,0,Math.PI*2);c.fill();
  // attack cooldown inner arc
  if(p.atkCd>0&&p.atkCdMax>0){var acProg=p.atkCd/p.atkCdMax;
    c.globalAlpha=0.35;c.strokeStyle=C.ink;c.lineWidth=2;
    c.beginPath();c.arc(0,0,p.r-3,Math.PI/2,Math.PI/2+Math.PI*2*acProg);c.stroke()}
  c.globalAlpha=1;
  if(p.decoyHP>0){c.strokeStyle="rgba(163,58,45,0.4)";c.lineWidth=2;c.beginPath();
    c.arc(0,0,p.r+6,0,Math.PI*2);c.stroke()}
  // 蓄力指示（墨龙珠）
  if(p.chargeDmg>0&&p.chargeTimer>20){var chrg=Math.min(p.chargeTimer/TUNING.chargeThreshold,1);
    if(chrg>=1){c.fillStyle=C.accent;c.globalAlpha=0.15+0.12*Math.sin(g.time*0.25);
      c.beginPath();c.arc(0,0,p.r+10,0,Math.PI*2);c.fill();c.globalAlpha=0.9}
    c.strokeStyle=C.accent;c.lineWidth=2;c.globalAlpha=Math.max(chrg*0.6,c.globalAlpha||0);
    c.beginPath();c.arc(0,0,p.r+10,-Math.PI/2,-Math.PI/2+Math.PI*2*chrg);c.stroke();c.globalAlpha=1}
  // 处决暴击链（判官断文激活中）
  if(p.execCritT>0){var ecA=p.execCritT/60;
    c.strokeStyle="rgba(163,58,45,"+(0.15+0.1*Math.sin(g.time*0.2))+")";c.lineWidth=1.5;
    c.setLineDash([2,4]);c.beginPath();c.arc(0,0,p.r+8,0,Math.PI*2);c.stroke();c.setLineDash([])}
  // 复活标记（招魂残幡）
  if(p.revive&&!p.hasRevived){c.strokeStyle="rgba(163,58,45,0.25)";c.lineWidth=1;
    c.beginPath();c.arc(0,0,p.r+3,0,Math.PI*2);c.stroke()}
  // dodge cooldown arc (always visible: green when ready, gray when cooling)
  var dcProg=p.dodgeCd/TUNING.dodgeCooldown;
  var dcR=p.r+14;
  if(p.dodgeCd<=0){
    c.globalAlpha=0.4+0.2*Math.sin(g.time*0.15);c.strokeStyle="rgba(77,107,86,0.7)";c.lineWidth=2.5;
    c.beginPath();c.arc(0,0,dcR,-Math.PI/2,-Math.PI/2+Math.PI*2);c.stroke();c.globalAlpha=1
  }else{
    c.strokeStyle="rgba(23,19,16,0.2)";c.lineWidth=2;
    c.beginPath();c.arc(0,0,dcR,-Math.PI/2,-Math.PI/2+Math.PI*2);c.stroke();
    c.strokeStyle="rgba(163,58,45,0.5)";c.lineWidth=2.5;
    c.beginPath();c.arc(0,0,dcR,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-dcProg));c.stroke()}
  // perfect dodge ring (justDodged window)
  if(p.justDodged&&p.justDodgedT>0){var jdProg=p.justDodgedT/TUNING.justDodgedWindow;
    c.globalAlpha=jdProg*0.6;c.strokeStyle=C.gold;c.lineWidth=2;
    c.shadowColor=C.gold;c.shadowBlur=g._pm>=0.45?6:0;
    c.beginPath();c.arc(0,0,p.r+6+(1-jdProg)*14,0,Math.PI*2);c.stroke();
    c.shadowBlur=0;c.globalAlpha=1}
  // shield stacks (收阴袋)
  if(p.shieldStack>0){c.strokeStyle="rgba(77,97,86,0.6)";c.lineWidth=2;
    for(var shi=0;shi<Math.min(p.shieldStack,CAPS.shieldStack);shi++){
      var shAng=-Math.PI/2+shi*Math.PI*2/CAPS.shieldStack;
      c.beginPath();c.arc(0,0,p.r+17,shAng-0.3,shAng+0.3);c.stroke()}}
  // 击杀攻速光环
  if(p.killAtkTimer>0){var atkAng=g.time*0.15;
    c.strokeStyle="rgba(77,97,86,0.5)";c.lineWidth=1.5;
    c.beginPath();c.arc(0,0,p.r+12,atkAng,atkAng+Math.PI*1.2);c.stroke();
    c.beginPath();c.arc(0,0,p.r+12,atkAng+Math.PI,atkAng+Math.PI*2.2);c.stroke()}
  // 击杀移速拖影
  if(p.killSpdTimer>0){c.globalAlpha=0.2;c.fillStyle=C.ink;
    c.beginPath();c.arc(-p.lastDx*1.5,-p.lastDy*1.5,p.r*0.7,0,Math.PI*2);c.fill();
    c.globalAlpha=1}
  // 低血警告光环
  if(p.hp>0&&p.hp<=p.maxHp*TUNING.lowHpThreshold){c.strokeStyle="rgba(163,58,45,"+(0.2+0.15*Math.sin(g.time*0.12))+")";
    c.lineWidth=2;c.beginPath();c.arc(0,0,p.r+4,0,Math.PI*2);c.stroke()}
  // buff indicator dots
  var buffs=[];
  if(p.killSpdTimer>0)buffs.push({c:C.gold,l:"速"});
  if(p.killAtkTimer>0)buffs.push({c:C.moss,l:"攻"});
  if(p.execCritT>0)buffs.push({c:C.accent,l:"暴"});
  if(p.shieldStack>0)buffs.push({c:C.frost,l:"盾"});
  if(p.chargeDmg>0&&p.charged)buffs.push({c:C.gold,l:"蓄"});
  if(buffs.length>0){var biy=p.r+20;c.textAlign="center";c.textBaseline="middle";c.font='600 10px '+C.fontBody;
    for(var bii=0;bii<buffs.length;bii++){var bix=(bii-(buffs.length-1)/2)*12;
      c.globalAlpha=0.7;c.fillStyle=buffs[bii].c;c.beginPath();c.arc(bix,biy,5,0,Math.PI*2);c.fill();
      c.globalAlpha=0.9;c.fillStyle="#f1e6d4";c.fillText(buffs[bii].l,bix,biy+0.5)}}
  c.globalAlpha=1;c.restore();

  // 墨蛭吸附渲染
  p.leeches.forEach(function(le){if(le.hp<=0)return;
    c.save();c.translate(le.x,le.y);
    c.globalAlpha=0.7;c.fillStyle=C.ink;
    c.beginPath();c.arc(0,0,le.r*0.8,0,Math.PI*2);c.fill();
    c.globalAlpha=0.35;c.fillStyle=C.accent;
    c.beginPath();c.arc(0,0,le.r*0.4,0,Math.PI*2);c.fill();
    c.restore()});

  // 连段计数 (enhanced combo display)
  if(p.comboCount>1){var cc=p.comboCount;
    var comboSin=Math.sin(g.time*0.18);var comboScale=1+Math.min(cc,20)*0.015+comboSin*0.03*Math.min(cc,10);
    var comboAlpha=0.65+Math.min(cc,15)*0.025;
    // progressive color palette
    if(cc>=20){c.fillStyle=C.accent;if(!g._pm){c.shadowColor=C.fire;c.shadowBlur=14+comboSin*6}}
    else if(cc>=15){c.fillStyle=C.fire;if(!g._pm){c.shadowColor=C.accent;c.shadowBlur=10+comboSin*4}}
    else if(cc>=10){c.fillStyle=C.accent;if(!g._pm){c.shadowColor="rgba(163,58,45,0.6)";c.shadowBlur=8+comboSin*3}}
    else if(cc>=7){c.fillStyle="#6b3a5c";if(!g._pm){c.shadowColor="rgba(107,58,92,0.4)";c.shadowBlur=4+comboSin*2}}
    else if(cc>=4){c.fillStyle="#4d6156";c.shadowBlur=0}
    else{c.fillStyle=C.ink;c.shadowBlur=0}
    c.globalAlpha=comboAlpha;
    var comboFontSize=14+Math.min(cc,20)*1.1;
    c.font='700 '+(comboFontSize*comboScale)+'px "STKaiti","KaiTi",serif';c.textAlign="center";
    c.save();c.translate(p.x,p.y-p.r-18);c.scale(comboScale,comboScale);
    // combo number + character
    var comboTxt=cc+"连";
    if(cc>=25)comboTxt=cc+"连 斩尽诸祟";
    else if(cc>=18)comboTxt=cc+"连 墨染山河";
    else if(cc>=12)comboTxt=cc+"连 判官落笔";
    c.fillText(comboTxt,0,0);c.restore();c.shadowBlur=0;c.globalAlpha=1}

  // off-screen enemy indicators
  forEachLiveEnemy(g,function(e){
    var margin=20;
    if(e.x>=A.l-margin&&e.x<=A.r+margin&&e.y>=A.t-margin&&e.y<=A.b+margin)return;
    var dx=e.x-W/2,dy=e.y-H/2;
    var a=Math.atan2(dy,dx);
    var edgeX=cl(W/2+Math.cos(a)*440,margin,W-margin);
    var edgeY=cl(H/2+Math.sin(a)*290,margin,H-margin);
    c.globalAlpha=e.isBoss?0.7:e.elite?0.6:0.4;c.fillStyle=e.isBoss?C.accent:e.elite?C.gold:C.ink;
    c.save();c.translate(edgeX,edgeY);c.rotate(a);
    var sz=e.isBoss?10:e.elite?7:6;
    c.beginPath();c.moveTo(sz,0);c.lineTo(-4,-sz*0.6);c.lineTo(-4,sz*0.6);c.closePath();c.fill();
    c.restore();c.globalAlpha=1});

  // particles (culled: skip off-screen, margin 30px)
  g.particles.forEach(function(pt){if(pt.x<A.l-30||pt.x>A.r+30||pt.y<A.t-30||pt.y>A.b+30)return;
    var alpha=pt.life/pt.maxLife;c.globalAlpha=alpha*0.7;
    c.fillStyle=PCOL[pt.type]||C.ink;
    var ps=Math.max(0.5,pt.size*alpha);
    if(pt.type==="fire"){
      // teardrop for fire
      c.beginPath();c.arc(pt.x,pt.y+ps*0.2,ps*0.6,0,Math.PI*2);c.fill();
      c.beginPath();c.moveTo(pt.x,pt.y-ps);c.lineTo(pt.x-ps*0.5,pt.y+ps*0.3);
      c.lineTo(pt.x+ps*0.5,pt.y+ps*0.3);c.closePath();c.fill();
    }else if(pt.type==="soul"||pt.type==="ghost"){
      // diamond for soul/ghost
      c.beginPath();c.moveTo(pt.x,pt.y-ps);c.lineTo(pt.x+ps*0.6,pt.y);
      c.lineTo(pt.x,pt.y+ps);c.lineTo(pt.x-ps*0.6,pt.y);c.closePath();c.fill();
    }else if(pt.type==="accent"){
      // sharp chevron - world-space rotated, no save/restore
      var _ca=Math.cos(pt.life*0.15),_sa=Math.sin(pt.life*0.15);
      var _x1=-ps*0.9*_sa,_y1=-ps*0.9*_ca;
      var _x2=ps*0.5*_ca+ps*0.4*_sa,_y2=-ps*0.5*_sa+ps*0.4*_ca;
      var _x3=-ps*0.5*_ca+ps*0.4*_sa,_y3=ps*0.5*_sa+ps*0.4*_ca;
      c.beginPath();c.moveTo(pt.x+_x1,pt.y+_y1);c.lineTo(pt.x+_x2,pt.y+_y2);
      c.lineTo(pt.x+_x3,pt.y+_y3);c.closePath();c.fill();
    }else if(pt.type==="ink"){
      if(ps<=2.5||g._pm<0.5){c.beginPath();c.arc(pt.x,pt.y,ps,0,Math.PI*2);c.fill()}
      else{c.beginPath();var segs=5+Math.floor(ps*1.2);
      for(var si=0;si<=segs;si++){var a=(si/segs)*Math.PI*2;
        var rr=ps*(0.65+0.35*Math.sin(si*3.7+pt.life*0.3));
        var px=pt.x+Math.cos(a)*rr,py=pt.y+Math.sin(a)*rr;
        if(si===0)c.moveTo(px,py);else c.lineTo(px,py);}
      c.closePath();c.fill()}
    }else if(pt.type==="moss"){
      // small square for moss/vegetation
      c.fillRect(pt.x-ps*0.6,pt.y-ps*0.6,ps*1.2,ps*1.2);
    }else{
      c.beginPath();c.arc(pt.x,pt.y,ps,0,Math.PI*2);c.fill();
    }});
  c.globalAlpha=1;

  // decoys
  g.decoys.forEach(function(d){var a=d.life/d.maxLife;
    c.globalAlpha=a*0.45;c.fillStyle=C.accent;
    c.beginPath();c.arc(d.x,d.y,d.r*a,0,Math.PI*2);c.fill();
    c.strokeStyle=C.ink;c.lineWidth=1;c.stroke()});
  c.globalAlpha=1;

  // 鬼市商人渲染
  if(g.merchant&&!g.merchant.used){
    var mt=g.merchant;
    var mtPulse=1+0.05*Math.sin(g.time*0.06);
    // ghostly glow
    c.globalAlpha=0.15+0.05*Math.sin(g.time*0.08);
    c.fillStyle=C.accent;
    c.beginPath();c.arc(mt.x,mt.y,28*mtPulse,0,Math.PI*2);c.fill();
    // body
    c.globalAlpha=0.7;
    c.fillStyle=C.ghost;
    c.beginPath();c.arc(mt.x,mt.y,16,0,Math.PI*2);c.fill();
    c.strokeStyle=C.ash;c.lineWidth=2;
    c.beginPath();c.arc(mt.x,mt.y,16,0,Math.PI*2);c.stroke();
    // inner glow
    c.globalAlpha=0.5;
    c.fillStyle=C.ivory;
    c.beginPath();c.arc(mt.x,mt.y,7,0,Math.PI*2);c.fill();
    // floating coins above
    c.globalAlpha=0.35+0.1*Math.sin(g.time*0.1);
    c.fillStyle=C.gold;
    c.beginPath();c.arc(mt.x-7,mt.y-20+Math.sin(g.time*0.1)*3,3,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(mt.x+6,mt.y-24+Math.sin(g.time*0.12+1)*3,2.5,0,Math.PI*2);c.fill();
    c.globalAlpha=1;
  }

  // floatTexts (判词 + 连段 + 伤害数字)
  var _isMob=IS_TOUCH&&!!window._mobileInput;
  g.floatTexts.forEach(function(ft){
    var a=ft.life/ft.maxLife;
    if(ft.reason==="comboBreak"){
      c.globalAlpha=a*0.6;c.fillStyle=C.soft;
      c.font='400 '+(12*a)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="dmg"){
      c.globalAlpha=cl(a,0,1)*0.75;c.fillStyle=C.ink;
      c.font='500 '+((_isMob?15:13)+(1-a)*3)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="critDmg"){
      c.globalAlpha=cl(a,0,1)*0.9;c.fillStyle=C.accent;
      c.font='700 '+((_isMob?19:16)+(1-a)*5)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="weakDmg"){
      c.globalAlpha=cl(a,0,1)*0.85;c.fillStyle=C.moss;
      c.font='600 '+(15+(1-a)*4)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="hint"){
      c.globalAlpha=cl(a*1.5,0,0.8);c.fillStyle=C.ash;
      c.font='400 14px "STKaiti","KaiTi",serif';c.textAlign="center";
    }else if(ft.reason==="streak"){
      c.globalAlpha=cl(a,0,1);c.fillStyle=C.accent;
      c.font='900 '+(28+(1-a)*12)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
      if(g._pm>=0.45){c.shadowColor=C.accent;c.shadowBlur=12}
      c.fillText(ft.text,ft.x,ft.y);c.shadowBlur=0;return;
    }else if(ft.reason==="soul"){
      c.globalAlpha=cl(a,0,1)*0.75;c.fillStyle="rgba(100,140,120,0.9)";
      c.font='500 '+(12+(1-a)*2)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="fire"||ft.reason==="corrosive"||ft.reason==="poison"){
      c.globalAlpha=cl(a,0,1)*0.8;c.fillStyle="rgba(180,90,60,0.85)";
      c.font='500 '+(12+(1-a)*2)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="formation"){
      c.globalAlpha=cl(a,0,1)*0.75;c.fillStyle="rgba(163,58,45,0.8)";
      c.font='500 '+(11+(1-a)*2)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="heal"){
      c.globalAlpha=cl(a,0,1)*0.85;c.fillStyle=C.moss;
      c.font='600 '+(14+(1-a)*3)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="critHint"){
      c.globalAlpha=cl(a*2,0,1)*0.9;c.fillStyle="#c4523d";
      c.font='900 '+(18+(1-a)*8)+'px "STKaiti","Kaiti SC",serif';c.textAlign="center";
      if(g._pm>=0.45){c.shadowColor="#c4523d";c.shadowBlur=8}
    }else if(ft.reason==="synergy"){
      c.globalAlpha=cl(a,0,1);c.fillStyle=C.gold;
      c.font='700 '+(16+(1-a)*4)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
      if(g._pm>=0.45){c.shadowColor=C.gold;c.shadowBlur=8}
      c.fillText(ft.text,ft.x,ft.y);c.shadowBlur=0;return;
    }else{
      c.globalAlpha=cl(a,0,1)*0.9;c.fillStyle=C.accent;
      c.font='600 '+(14+(1-a)*6)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }
    if(g._pm>=0.5){c.shadowColor="rgba(0,0,0,0.25)";c.shadowBlur=2};c.fillText(ft.text,ft.x,ft.y);c.shadowBlur=0;
  });
  c.globalAlpha=1;

  // kites (纸鸢引)
  g.kites.forEach(function(k){var a=k.life/k.maxLife;
    c.save();c.translate(k.x,k.y);c.rotate((k.angle||0)+Math.PI/2);
    c.globalAlpha=a*0.2;c.fillStyle=C.accent;
    c.beginPath();c.moveTo(0,k.r*1.5);c.lineTo(-k.r*0.4,k.r*0.3);
    c.lineTo(k.r*0.4,k.r*0.3);c.closePath();c.fill();
    c.globalAlpha=a*0.85;c.fillStyle=C.accent;
    c.beginPath();c.moveTo(0,-k.r);c.lineTo(-k.r*0.7,k.r*0.5);
    c.lineTo(k.r*0.7,k.r*0.5);c.closePath();c.fill();
    c.strokeStyle=C.ink;c.lineWidth=1;c.stroke();c.restore()});
  c.globalAlpha=1;

  // 墨移标记
  if(p.recallMark&&p.recallMark.life>0){
    c.globalAlpha=0.25+0.1*Math.sin(g.time*0.15);c.strokeStyle=C.accent;c.lineWidth=1.5;
    c.setLineDash([2,4]);c.beginPath();c.arc(p.recallMark.x,p.recallMark.y,8+Math.sin(g.time*0.2)*2,0,Math.PI*2);c.stroke();
    c.setLineDash([]);c.globalAlpha=0.08;c.fillStyle=C.accent;
    c.beginPath();c.arc(p.recallMark.x,p.recallMark.y,6,0,Math.PI*2);c.fill();c.globalAlpha=1}
  // ink spirits (墨灵玉)
  g.inkSpirits.forEach(function(sp){
    c.save();c.translate(sp.x,sp.y);
    // glow
    c.globalAlpha=0.25;c.fillStyle=C.spirit;
    c.beginPath();c.arc(0,0,sp.r+6,0,Math.PI*2);c.fill();
    // body
    c.globalAlpha=0.8;c.fillStyle=C.ink;
    c.beginPath();c.arc(0,0,sp.r,0,Math.PI*2);c.fill();
    // inner highlight
    c.globalAlpha=0.5;c.fillStyle=C.spirit;
    c.beginPath();c.arc(-2,-2,sp.r*0.4,0,Math.PI*2);c.fill();
    // orbit trail
    c.globalAlpha=0.15;c.strokeStyle=C.ink;c.lineWidth=0.5;
    c.beginPath();c.arc(0,0,sp.orbitR,sp.orbitAngle-0.2,sp.orbitAngle+0.2);c.stroke();
    c.restore()});
  c.globalAlpha=1;

  // 墨阵 formations
  g.formations.forEach(function(fm){
    var fa=fm.life/fm.maxLife;
    if(fm.type==="def"){
      c.globalAlpha=fa*0.18;c.fillStyle=C.ink;
      c.beginPath();c.arc(fm.x,fm.y,fm.r,0,Math.PI*2);c.fill();
      c.globalAlpha=fa*0.4;c.strokeStyle=C.ink;c.lineWidth=1;
      c.setLineDash([6,6]);c.beginPath();c.arc(fm.x,fm.y,fm.r,0,Math.PI*2);c.stroke();c.setLineDash([]);
    }else if(fm.type==="atk"){
      var progress=1-(fm.life/fm.maxLife);
      c.globalAlpha=(1-progress)*0.5;c.strokeStyle=C.accent;c.lineWidth=2;
      c.beginPath();c.arc(fm.x,fm.y,fm.r*progress,0,Math.PI*2);c.stroke();
      c.globalAlpha=(1-progress)*0.15;c.fillStyle=C.accent;
      c.beginPath();c.arc(fm.x,fm.y,fm.r*progress,0,Math.PI*2);c.fill();
    }else if(fm.type==="heal"){
      c.globalAlpha=fa*0.12;c.fillStyle=C.moss;
      c.beginPath();c.arc(fm.x,fm.y,fm.r,0,Math.PI*2);c.fill();
      c.globalAlpha=fa*0.35;c.strokeStyle=C.moss;c.lineWidth=1;
      c.setLineDash([3,5]);c.beginPath();c.arc(fm.x,fm.y,fm.r,0,Math.PI*2);c.stroke();c.setLineDash([]);
    }else if(fm.type==="vortex"){
      var vp=1-(fm.life/fm.maxLife);
      c.globalAlpha=0.25+vp*0.2;c.strokeStyle=C.ink;c.lineWidth=2.5;
      c.beginPath();for(var vi=0;vi<3;vi++){var vr=fm.r*(0.4+vi*0.25)*vp;
        c.arc(fm.x,fm.y,vr,g.time*0.06+vi*2,g.time*0.06+vi*2+Math.PI*1.5)}c.stroke();
      c.globalAlpha=vp*0.2;c.fillStyle=C.ink;
      c.beginPath();c.arc(fm.x,fm.y,fm.r*vp,0,Math.PI*2);c.fill();
    }
  });
  // 墨弦：墨阵间连线
  if(g.player.inkStrings&&g.formations.length>=2){
    for(var si=0;si<g.formations.length;si++){var fa=g.formations[si];var faA=fa.life/fa.maxLife;
      for(var sj=si+1;sj<g.formations.length;sj++){var fb=g.formations[sj];var fbA=fb.life/fb.maxLife;
        c.globalAlpha=Math.min(faA,fbA)*0.3;c.strokeStyle=C.ink;c.lineWidth=1;
        c.setLineDash([4,8]);c.beginPath();c.moveTo(fa.x,fa.y);c.lineTo(fb.x,fb.y);c.stroke();c.setLineDash([])}}
    c.globalAlpha=1}
  // 墨童炸弹倒计时
  if(g.pendingDeathbursts&&g.pendingDeathbursts.length>0){
    g.pendingDeathbursts.forEach(function(db){
      if(db.type!=="motong")return;
      var progress=1-(db.timer/db.maxTimer);
      c.globalAlpha=0.3+progress*0.4;c.fillStyle=C.accent;
      c.beginPath();c.arc(db.x,db.y,6+progress*8,0,Math.PI*2);c.fill();
      c.globalAlpha=0.7;c.strokeStyle=C.ink;c.lineWidth=1.5;
      c.beginPath();c.arc(db.x,db.y,db.r*(1-progress*0.3),0,Math.PI*2);c.stroke();
    });
  }
  c.globalAlpha=1;c.setLineDash([]);

  // wave announce
  if(g.announceT>0){var a=g.announceT>70?(110-g.announceT)/40:g.announceT/70;
    var aCl=cl(a,0,1);
    // screen dim during announce
    c.globalAlpha=aCl*0.08;c.fillStyle=C.ink;c.fillRect(0,0,W,H);
    // decorative lines
    c.globalAlpha=aCl*0.3;c.strokeStyle=C.ink;c.lineWidth=1;
    c.beginPath();c.moveTo(W/2-180,H/2-48);c.lineTo(W/2-30,H/2-48);c.stroke();
    c.beginPath();c.moveTo(W/2+30,H/2-48);c.lineTo(W/2+180,H/2-48);c.stroke();
    c.beginPath();c.moveTo(W/2-180,H/2+10);c.lineTo(W/2-30,H/2+10);c.stroke();
    c.beginPath();c.moveTo(W/2+30,H/2+10);c.lineTo(W/2+180,H/2+10);c.stroke();
    // title
    c.globalAlpha=aCl*0.9;c.fillStyle=C.ink;
    c.font='600 36px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    c.fillText(g.announce,W/2,H/2-34);
    // stage description
    if(g.stageDesc){c.globalAlpha=aCl*0.72;c.font='500 16px "STKaiti","KaiTi",serif';
      c.fillText(g.stageDesc,W/2,H/2); }
    // wave flavor text
    if(g.waveFlavor){c.globalAlpha=aCl*0.55;c.font='400 13px "STKaiti","KaiTi",serif';
      c.fillStyle=C.ash;c.fillText(g.waveFlavor,W/2,H/2+22); }
    c.globalAlpha=1}

  // First-wave hint (extended duration for mobile clarity)
  if(g.hintT>0&&g.announceT<=0&&g.wave===0){
    var hA=g.hintT>300?(360-g.hintT)/60:g.hintT>30?1:g.hintT/30;
    c.globalAlpha=cl(hA,0,1)*0.7;c.fillStyle=C.ash;
    c.font='400 13px "STKaiti","KaiTi",serif';c.textAlign="center";
    c.fillText("WASD 移动 · 鼠标瞄准 · 左键攻击",W/2,H-62);
    c.fillText("空格/Shift 闪避 · R 双击重开 · F 全屏",W/2,H-44);
    c.globalAlpha=1}

  // Boss intro card
  if(g.bossIntroT>0){
        var biA=g.bossIntroT>70?(110-g.bossIntroT)/40:g.bossIntroT/70;
    var biCl=cl(biA,0,1);
    // dark overlay with ink bleed from edges
    var wm=Math.floor((1-biCl)*200);
    c.globalAlpha=0.5*biCl;c.fillStyle=C.ink;c.fillRect(0,0,W,H);
    c.globalAlpha=0.35*biCl;c.fillStyle=C.ink;
    c.fillRect(0,0,wm+Math.floor(Math.sin(g.time*0.08)*8),H);
    c.fillRect(W-wm-Math.floor(Math.sin(g.time*0.08+1)*8),0,wm+8,H);
    // boss portrait image (large, centered)
    var bpImg=window._bossPortraitImgs&&window._bossPortraitImgs[g.bossType];
    if(bpImg){
      c.globalAlpha=0.85*biCl;var portR=80;var portY=H/2-95;
      // ink wash glow behind portrait
      c.fillStyle="rgba(23,19,16,0.25)";c.beginPath();c.arc(W/2,portY+portR,portR+8,0,Math.PI*2);c.fill();
      // portrait with border
      c.strokeStyle=C.accent;c.lineWidth=3;
      c.strokeRect(W/2-portR-3,portY-3,portR*2+6,portR*2+6);
      c.drawImage(bpImg,W/2-portR,portY,portR*2,portR*2);
      // ink splash overlay
      c.globalAlpha=0.12*biCl;c.fillStyle=C.ink;
      c.beginPath();c.arc(W/2-portR+10,portY+10,portR*0.5,0,Math.PI*2);c.fill();
    }
    // outer scroll frame
    c.globalAlpha=0.45*biCl;c.strokeStyle=C.accent;c.lineWidth=3;
    c.strokeRect(W/2-220,H/2-55,440,120);
    c.globalAlpha=0.25*biCl;c.strokeStyle=C.gold;c.lineWidth=1;
    c.setLineDash([4,3]);c.strokeRect(W/2-225,H/2-60,450,130);c.setLineDash([]);
    // corner seal marks
    c.globalAlpha=0.18*biCl;c.fillStyle=C.accent;
    c.fillRect(W/2-209,H/2-49,8,8);c.fillRect(W/2+193,H/2-49,8,8);c.fillRect(W/2-209,H/2+39,8,8);c.fillRect(W/2+193,H/2+39,8,8);
    // boss name
    c.globalAlpha=0.88*biCl;c.fillStyle=C.accent;
    c.font='700 46px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    if(g._pm>=0.5){c.shadowColor="rgba(163,58,45,0.5)";c.shadowBlur=12}
    c.fillText(g.bossIntroName,W/2,H/2+8);
    c.shadowBlur=0;
    // boss subtitle
    if(g.bossIntroSub){c.globalAlpha=0.55*biCl;c.fillStyle=C.ash;
      c.font='400 14px "STKaiti","KaiTi",serif';
      c.fillText(g.bossIntroSub,W/2,H/2+36)}
    c.globalAlpha=1}

  // boss hp bar
  g.enemies.forEach(function(e){if(e.isBoss&&e.hp>0){
    var bw=280,bx=W/2-140,by=48,bh=12;
    c.fillStyle="rgba(23,19,16,0.18)";c.fillRect(bx-1,by-1,bw+2,bh+2);
    var ratio=e.hp/e.maxHp;
    // damage flash
    if(e.hitFlash>0){c.globalAlpha=0.3;c.fillStyle="#fff";c.fillRect(bx,by,bw,bh);c.globalAlpha=1}
    var bcol=ratio>0.5?C.accent:ratio>0.25?"#b85a2d":"#8a2a1a";
    if(ratio<=0.25)bcol="rgba(138,42,26,"+(0.7+0.3*Math.sin(g.time*0.15))+")";
    c.fillStyle=bcol;c.fillRect(bx,by,bw*ratio,bh);
    c.strokeStyle=C.ink;c.lineWidth=1;c.strokeRect(bx-1,by-1,bw+2,bh+2);
    // phase threshold marks
    c.globalAlpha=0.35;c.strokeStyle=C.paper;c.lineWidth=1;
    if(e.type==="mojiangjun"){
      var p1X=bx+bw*0.6;c.beginPath();c.moveTo(p1X,by);c.lineTo(p1X,by+bh);c.stroke();
      var p2X=bx+bw*0.25;c.beginPath();c.moveTo(p2X,by);c.lineTo(p2X,by+bh);c.stroke();
    }else{
      var enrageX=bx+bw*TUNING.bossEnrageHp;c.beginPath();c.moveTo(enrageX,by);c.lineTo(enrageX,by+bh);c.stroke();
      var despX=bx+bw*TUNING.bossDesperateHp;c.beginPath();c.moveTo(despX,by);c.lineTo(despX,by+bh);c.stroke();
    }
    c.globalAlpha=1;
    c.fillStyle=C.ink;c.font='500 13px "STKaiti","KaiTi",serif';c.textAlign="center";
    if(g._pm>=0.5){c.shadowColor="rgba(241,230,212,0.8)";c.shadowBlur=4}
    var bossName;
    if(e.type==="mojiangjun"){
      var mjRatio=e.hp/e.maxHp;
      bossName=e.name+(mjRatio<=0.25?" · 狂书":mjRatio<=0.6?" · 召书":"");
    }else{
      bossName=e.enraged?e.name+" · 狂":e.name;
    }
    c.fillText(bossName,W/2,by-4);c.shadowBlur=0}});


  // kill feed (top-right, last 5 kills)
  if(g.killFeed&&g.killFeed.length>0&&g.state==="playing"){
    var kfX=W-10,kfY=50;
    c.font='400 12px "STKaiti","KaiTi",serif';c.textAlign="right";
    var kfAge=g.time-(g.killFeed[g.killFeed.length-1]?g.killFeed[g.killFeed.length-1].time:0);
    var kfAlpha=Math.max(0.3,1-(kfAge/180));
    c.globalAlpha=kfAlpha;
    g.killFeed.forEach(function(kf,ki){
      var kfRowY=kfY+ki*16;
      var kfCol=kf.isBoss?"#a33a2d":kf.isElite?"#9c835a":"rgba(23,19,16,0.7)";
      c.fillStyle=kfCol;
      c.fillText("斩 "+kf.name,kfX,kfRowY);
    });
    c.globalAlpha=1;c.textAlign="left";
  }
  // 处决闪光
  if(g.execFlash&&g.freezeT>1){var ef=g.execFlash;
    var exA=Math.min(g.freezeT/9,1);c.globalAlpha=exA*0.6;c.fillStyle=C.accent;
    c.beginPath();c.arc(ef.x,ef.y,40+rn(0,10),0,Math.PI*2);c.fill();
    c.globalAlpha=exA*0.3;c.fillStyle="#fff";
    c.beginPath();c.arc(ef.x,ef.y,20,0,Math.PI*2);c.fill();c.globalAlpha=1}
  if(g.freezeT<=0)g.execFlash=null;

  // Boss击杀庆祝过场
  if(g.bossCelebrationT>0){
    var bcT=g.bossCelebrationT,bcMax=120;
    var bcA=bcT>90?(bcMax-bcT)/30:bcT>30?1:bcT/30;
    var bcCl=cl(bcA,0,1);
    // 全屏暗色遮罩
    c.globalAlpha=0.6*bcCl;c.fillStyle=C.ink;c.fillRect(0,0,W,H);
    // Boss肖像
    var bpI=window._bossPortraitImgs&&window._bossPortraitImgs[g.bossType];
    if(bpI){
      var portR=80,portY=H/2-110;
      var bcScale=bcT>90?cl((bcMax-bcT)/15,0,1):1;
      c.save();c.translate(W/2,portY+portR);c.scale(bcScale,bcScale);
      // 墨晕光晕
      c.globalAlpha=0.2*bcCl;c.fillStyle=C.ink;
      c.beginPath();c.arc(0,0,portR+12,0,Math.PI*2);c.fill();
      // 肖像
      c.globalAlpha=0.88*bcCl;
      c.drawImage(bpI,-portR,-portR,portR*2,portR*2);
      // 朱砂边框
      c.globalAlpha=0.7*bcCl;c.strokeStyle=C.accent;c.lineWidth=3;
      c.strokeRect(-portR-3,-portR-3,portR*2+6,portR*2+6);
      c.restore();
    }
    // Boss名称
    c.globalAlpha=0.85*bcCl;c.fillStyle=C.accent;c.textAlign="center";
    c.font='700 40px "STKaiti","KaiTi","Kaiti SC",serif';
    if(g._pm>=0.5){c.shadowColor="rgba(163,58,45,0.4)";c.shadowBlur=10}
    var bcName=g.bossType==="mojiangjun"?"墨将军":g.bossType==="moguiwang"?"墨鬼王":"画皮娘子";
    c.fillText(bcName,W/2,H/2+30);
    c.shadowBlur=0;
    // 判词
    var bcVerdict=g.bossType==="mojiangjun"?"书不成剑，墨终归土":
      g.bossType==="moguiwang"?"墨渊无底，汝为过客":"画皮之下，不过纸灰";
    c.globalAlpha=0.55*bcCl;c.fillStyle=C.ash;
    c.font='400 16px "STKaiti","KaiTi",serif';
    c.fillText(bcVerdict,W/2,H/2+60);
    // 底部渐消金线
    c.globalAlpha=0.3*bcCl;c.strokeStyle=C.gold;c.lineWidth=1;
    var lw=100*bcCl;c.beginPath();c.moveTo(W/2-lw,H/2+80);c.lineTo(W/2+lw,H/2+80);c.stroke();
    c.globalAlpha=1}

  // wave progress bar (bottom edge)
  if(g.waveTotal>0&&g.state==="playing"){
    var alive=0;for(var _ai=0;_ai<g.enemies.length;_ai++){if(g.enemies[_ai].hp>0)alive++}
    var wpRatio=1-alive/g.waveTotal;
    var wpW=200,wpX=W/2-wpW/2,wpY=H-16,wpH=5;
    c.globalAlpha=0.2;c.fillStyle=C.ink;c.fillRect(wpX-1,wpY-1,wpW+2,wpH+2);
    c.globalAlpha=0.65;c.fillStyle=C.accent;c.fillRect(wpX,wpY,wpW*wpRatio,wpH);
    if(wpRatio>0.8){c.globalAlpha=0.3;if(g._pm>=0.5){c.shadowColor=C.accent;c.shadowBlur=6}
      c.fillRect(wpX,wpY,wpW*wpRatio,wpH);c.shadowBlur=0}
    c.globalAlpha=0.5;c.font='400 11px "STKaiti","KaiTi",serif';c.fillStyle=C.ash;c.textAlign="center";
    c.fillText(alive>0?"第"+(g.wave+1)+"波 · 余"+alive:"波次清除",W/2,wpY-5);
    c.globalAlpha=1}

  // kill streak — show from 1 kill, longer window
  if(g.killStreak>=1&&g.killStreakT>0){
    var ksA=cl(g.killStreakT/40,0,1);
    var ksSize=g.killStreak>=10?34:g.killStreak>=5?28:22;
    c.globalAlpha=ksA*0.9;c.fillStyle=C.accent;
    c.font='700 '+ksSize+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="right";
    if(g._pm>=0.45){c.shadowColor=C.accent;c.shadowBlur=g.killStreak>=5?10:6}
    c.fillText(g.killStreak+"连斩",W-40,H-40);c.shadowBlur=0;
    // damage multiplier
    var ksMul=1+Math.min(g.killStreak*0.1,2.0);
    if(ksMul>1.05){c.globalAlpha=ksA*0.65;c.fillStyle=C.gold;
      c.font='600 14px "STKaiti","KaiTi",serif';
      c.fillText("x"+ksMul.toFixed(1),W-40,H-18)}
    c.globalAlpha=1}

  // directional damage indicator
  if(g.dmgDir&&g.dmgDir.t>0){
    var ddA=g.dmgDir.t/20;
    var ddAng=g.dmgDir.ang;
    var ddR=Math.max(W,H)*0.7;
    c.save();c.translate(W/2,H/2);c.rotate(ddAng);
    c.globalAlpha=ddA*0.25;
    var ddGrad=c.createRadialGradient(ddR*0.55,0,0,ddR*0.55,0,ddR*0.35);
    ddGrad.addColorStop(0,"rgba(163,58,45,0.5)");
    ddGrad.addColorStop(1,"rgba(163,58,45,0)");
    c.fillStyle=ddGrad;
    c.beginPath();c.moveTo(0,0);c.arc(0,0,ddR,-0.35,0.35);c.closePath();c.fill();
    c.restore();c.globalAlpha=1}

  // relic pickup flash
  if(g.relicFlash>0){
    var rfA=g.relicFlash/12;
    c.globalAlpha=rfA*0.15;c.fillStyle=C.accent;c.fillRect(0,0,W,H);
    c.globalAlpha=1}

  // minimap radar (bottom-left)
  if(g.enemies.length>0||g.hazardObjs.length>0||(g.merchant&&!g.merchant.used)){
    var mmS=80,mmX=12,mmY=H-mmS-12,mmCx=mmX+mmS/2,mmCy=mmY+mmS/2;
    var p=g.player;
    c.globalAlpha=0.45;c.fillStyle=C.ink;c.fillRect(mmX,mmY,mmS,mmS);
    c.strokeStyle="rgba(23,19,16,0.35)";c.lineWidth=1.5;c.strokeRect(mmX,mmY,mmS,mmS);
    var mmScale=mmS/Math.max(A.r-A.l,A.b-A.t);
    // hazard dots
    g.hazardObjs.forEach(function(ho){
      var hx=mmCx+(ho.x-p.x)*mmScale,hy=mmCy+(ho.y-p.y)*mmScale;
      if(hx<mmX||hx>mmX+mmS||hy<mmY||hy>mmY+mmS)return;
      c.globalAlpha=0.4;c.fillStyle=C.accent;
      c.beginPath();c.arc(hx,hy,1.5,0,Math.PI*2);c.fill();
    });
    // merchant dot
    if(g.merchant&&!g.merchant.used){
      var mx=mmCx+(g.merchant.x-p.x)*mmScale,my=mmCy+(g.merchant.y-p.y)*mmScale;
      if(mx>=mmX&&mx<=mmX+mmS&&my>=mmY&&my<=mmY+mmS){
        c.globalAlpha=0.85;c.fillStyle=C.gold;
        c.beginPath();c.arc(mx,my,3,0,Math.PI*2);c.fill();
      }
    }
    g.enemies.forEach(function(e){
      var ex=mmCx+(e.x-p.x)*mmScale,ey=mmCy+(e.y-p.y)*mmScale;
      if(ex<mmX||ex>mmX+mmS||ey<mmY||ey>mmY+mmS)return;
      c.globalAlpha=e.isBoss?0.9:e.elite?0.75:0.55;
      c.fillStyle=e.isBoss?C.accent:e.elite?C.gold:C.ink;
      var er=e.isBoss?3:e.elite?2.5:1.5;
      c.beginPath();c.arc(ex,ey,er,0,Math.PI*2);c.fill();
    });
    // player dot
    c.globalAlpha=0.9;c.fillStyle=C.ivory;
    c.beginPath();c.arc(mmCx,mmCy,2.5,0,Math.PI*2);c.fill();
    c.globalAlpha=1;
  }

  // debug (T key)
  if(window._showDebug){
    var p2=g.player;
    var peaks=g.perf.peaks;
    var srcLine="";
    if(g.perf.pressure>0.4){
      var at={melee:0,proj:0,ring:0,dash:0};g.attacks.forEach(function(a){at[a.type]=(at[a.type]||0)+1});
      var fk={phosphor:0,inkburst:0,other:0};g.fires.forEach(function(f){if(f.kind==="phosphor")fk.phosphor++;else if(f.kind==="inkburst")fk.inkburst++;else fk.other++});
      srcLine="src atk:"+Object.keys(at).filter(function(k){return at[k]>0}).map(function(k){return k[0]+at[k]}).join("")+
        " fire:"+Object.keys(fk).filter(function(k){return fk[k]>0}).map(function(k){return k[0]+fk[k]}).join("");
    }
    var lines=[
      "st:"+g.state+" w:"+g.wave+" fps:"+Math.round(g.perf.fps),
      "en:"+g.enemies.length+" atk:"+g.attacks.length+" prj:"+g.eProj.length,
      "par:"+g.particles.length+" fire:"+g.fires.length+" txt:"+g.floatTexts.length+" dec:"+g.decoys.length,
      "kite:"+g.kites.length+" frs:"+g.frosts.length+" spi:"+g.inkSpirits.length+" kills:"+g.kills+" shields:"+p2.shieldStack,
      "peak a:"+peaks.attacks+" p:"+peaks.particles+" f:"+peaks.fires+" e:"+peaks.eProj,
      "peak t:"+peaks.floatTexts+" d:"+peaks.decoys+" k:"+peaks.kites+" fr:"+peaks.frosts+" sp:"+(peaks.inkSpirits||0),
      "pressure:"+(g.perf.pressure*100).toFixed(0)+"% rng:"+(p2.stats.range*g.weapon.range).toFixed(0)+" combo:"+p2.comboCount,
      "x:"+p2.x.toFixed(0)+" y:"+p2.y.toFixed(0)
    ];
    if(IS_TOUCH){
      var mob=window._mobileInput;
      lines.push("m:"+(mob?"1":"0")+" ui:"+(document.body&&document.body.classList.contains("is-mobile-ui")?1:0)+" a:"+(mob&&mob.active?1:0)+" t:"+(mob&&mob.attacking?1:0)+" d:"+(mob&&mob.dodging?1:0)+" r:"+(mob&&mob.dodgeRequest||0));
      if(mob)lines.push("dx:"+mob.dx.toFixed(1)+" dy:"+mob.dy.toFixed(1)+" a:"+Math.round(mob.aimAngle*57.2958)+" "+(mob.lastAimMode||"idle"));
    }
    if(srcLine)lines.push(srcLine);
    c.globalAlpha=0.72;c.fillStyle="#000";c.fillRect(W-326,4,322,14+lines.length*14);
    c.globalAlpha=1;c.fillStyle="#fff";c.font='11px monospace';c.textAlign="right";
    lines.forEach(function(l,i){c.fillText(l,W-8,18+i*14)});
    c.textAlign="left";
  }

  // death circle (expanding ink ring on player death)
  if(g.deathCircle&&g.deathCircle.r>0){
    var dc=g.deathCircle;var dcFade=1-dc.r/dc.maxR;
    c.globalAlpha=dcFade;
    c.strokeStyle=C.ink;c.lineWidth=4;
    c.beginPath();c.arc(dc.x,dc.y,dc.r,0,Math.PI*2);c.stroke();
    c.strokeStyle=C.accent;c.lineWidth=2;
    c.beginPath();c.arc(dc.x,dc.y,dc.r*0.8,0,Math.PI*2);c.stroke();
    // death recap text
    if(dc.killer){
      c.globalAlpha=dcFade*0.8;c.fillStyle=C.accent;
      c.font='600 18px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
      c.fillText("为你送终",dc.x,dc.y-10);
      c.font='400 14px "STKaiti","KaiTi",serif';c.fillStyle=C.ash;
      c.fillText(dc.killer,dc.x,dc.y+12);
      c.font='400 12px "STKaiti","KaiTi",serif';
      c.fillText("止步第"+(dc.wave||0)+"波",dc.x,dc.y+30);
    }
    c.globalAlpha=1;
  }
  // vignette
  screenFlash(c,W,H,1,C.clear,'rgba(23,19,16,0.15)',0.3,0.7);
  c.globalAlpha=1;
  // hurt flash (player hit)
  if(p.hurtFlash>0){screenFlash(c,W,H,(p.hurtFlash/12)*0.25,C.clear,'rgba(163,58,45,1)',0.25,0.55);c.globalAlpha=1}
  // crit flash (landed critical hit)
  if(g.critFlash>0){screenFlash(c,W,H,(g.critFlash/12)*0.25,'rgba(220,180,60,0.15)','rgba(220,180,60,0)',0.15,0.5);c.globalAlpha=1}
  // boss flash (boss damage taken)
  if(g.bossFlash>0){screenFlash(c,W,H,(g.bossFlash/12)*0.3,C.clear,'rgba(107,58,92,1)',0.2,0.5);c.globalAlpha=1}
  // slow motion vignette
  if(g.slowMo>0){
    var smA=g.slowMo/30*0.15;
    screenFlash(c,W,H,smA,'rgba(23,19,16,0.2)','rgba(23,19,16,0)',0.15,0.5);c.globalAlpha=1}
  // low hp vignette warning
  if(p.hp>0&&p.hp<=p.maxHp*TUNING.lowHpThreshold){
    var lhpRatio=1-(p.hp/(p.maxHp*TUNING.lowHpThreshold));
    var lhpA=0.12+lhpRatio*0.22+0.06*Math.sin(g.time*0.12);
    screenFlash(c,W,H,lhpA,'rgba(163,58,45,0.3)','rgba(163,58,45,0)',0.2,0.55);c.globalAlpha=1}

  // 暂停遮罩
  if(g.state==="paused"){
    c.fillStyle="rgba(23,19,16,0.35)";c.fillRect(0,0,W,H);
    c.fillStyle=C.paper;c.font='700 36px "STKaiti","KaiTi",serif';c.textAlign="center";
    c.fillText("暂停",W/2,H/2-10);
    c.font='400 16px "STKaiti","KaiTi",serif';c.globalAlpha=0.7;
    var isTouch=IS_TOUCH;
    c.fillText(isTouch?"点击 ⏸ 继续":"按 ESC 继续",W/2,H/2+22);c.globalAlpha=1}

  // death calligraphy overlay
  if(g.state==="dying"&&g.freezeT>0){
    var dProg=1-g.freezeT/22;
    c.globalAlpha=dProg*0.5;c.fillStyle=C.ink;c.fillRect(0,0,W,H);
    c.globalAlpha=dProg;c.fillStyle=C.paper;
    c.font='700 44px "STKaiti","KaiTi",serif';c.textAlign="center";
    c.fillText("魂 归 黄 泉",W/2,H/2+4);
    c.globalAlpha=1}

  // victory calligraphy overlay
  if(g.state==="victory"&&g.freezeT>0){
    var vProg=1-g.freezeT/35;
    c.globalAlpha=vProg*0.6;c.fillStyle=C.ink;c.fillRect(0,0,W,H);
    // ink circle
    c.globalAlpha=vProg*0.5;c.strokeStyle=C.ink;c.lineWidth=3;
    c.beginPath();c.arc(W/2,H/2,60+vProg*40,0,Math.PI*2);c.stroke();
    c.strokeStyle=C.accent;c.lineWidth=1.5;
    c.beginPath();c.arc(W/2,H/2,48+vProg*35,0,Math.PI*2);c.stroke();
    // weapon name
    c.globalAlpha=vProg;c.fillStyle=C.paper;
    c.font='700 52px "STKaiti","KaiTi",serif';c.textAlign="center";
    c.fillText(g.weapon.name,W/2,H/2+4);
    // subtitle
    c.globalAlpha=vProg*0.8;c.font='400 18px "STKaiti","KaiTi",serif';
    var vSub={melee:"斩 尽 诸 邪",ranged:"墨 染 山 河",aoe:"万 籁 俱 寂",dash:"进 退 自 如"}[g.weapon.type]||"走 阴 完 毕";
    c.fillText(vSub,W/2,H/2+36);
    c.globalAlpha=1}
  }finally{c.restore()}
  // 迷雾诅咒：视野缩小遮罩
  if(g.fogActive){var fogR=120+20*Math.sin(g.time*0.08);
    c.save();c.globalCompositeOperation="destination-in";
    var fogGrad=c.createRadialGradient(p.x,p.y,fogR*0.5,p.x,p.y,fogR);
    fogGrad.addColorStop(0,"rgba(0,0,0,1)");fogGrad.addColorStop(1,C.clear);
    c.fillStyle=fogGrad;c.fillRect(0,0,W,H);c.restore();
    c.save();c.globalCompositeOperation="destination-over";c.fillStyle=C.ink;c.fillRect(0,0,W,H);c.restore()}
  // 鬼火诅咒：魂球渲染
  g.soulOrbs.forEach(function(so){var soA=so.life/180;
    c.globalAlpha=soA*0.8;c.fillStyle=C.boss;if(g._pm>=0.45){c.shadowColor=C.boss;c.shadowBlur=10}
    c.beginPath();c.arc(so.x,so.y,so.r,0,Math.PI*2);c.fill();
    c.globalAlpha=soA*0.4;c.fillStyle=C.ghost;c.beginPath();c.arc(so.x,so.y,so.r*0.4,0,Math.PI*2);c.fill();
    c.shadowBlur=0;c.globalAlpha=1});
  // 环境事件渲染
  g.hazardObjs.forEach(function(ho){var hA=ho.life/(ho.type==="guihuoyan"?120:ho.type==="mozhang"?220:ho.type==="yinbing"?60:ho.type==="zhijian"?50:40);
    if(ho.type==="moyu"){c.globalAlpha=hA*0.6;c.fillStyle=C.ink;c.beginPath();c.arc(ho.x,ho.y,ho.r,0,Math.PI*2);c.fill();
      c.globalAlpha=hA*0.3;c.fillStyle=C.ash;c.beginPath();c.arc(ho.x,ho.y,ho.r*0.4,0,Math.PI*2);c.fill()}
    else if(ho.type==="guihuoyan"){c.globalAlpha=hA*0.8;c.fillStyle=C.fire;if(g._pm>=0.45){c.shadowColor=C.fire;c.shadowBlur=8}
      c.beginPath();c.arc(ho.x,ho.y,ho.r,0,Math.PI*2);c.fill();c.shadowBlur=0;
      c.globalAlpha=hA*0.5;c.fillStyle=C.ivory;c.beginPath();c.arc(ho.x,ho.y,ho.r*0.3,0,Math.PI*2);c.fill()}
    else if(ho.type==="mozhang"){c.globalAlpha=hA*0.25;c.fillStyle=C.moss;
      c.beginPath();c.arc(ho.x,ho.y,ho.r+Math.sin(g.time*0.03+ho.x)*3,0,Math.PI*2);c.fill();
      c.globalAlpha=hA*0.15;c.fillStyle="rgba(77,97,86,0.4)";
      c.beginPath();c.arc(ho.x,ho.y,ho.r*1.3+Math.sin(g.time*0.04+ho.y)*4,0,Math.PI*2);c.fill()}
    else if(ho.type==="yinbing"){c.globalAlpha=hA*0.7;c.fillStyle=C.ash;if(g._pm>=0.45){c.shadowColor=C.ash;c.shadowBlur=6}
      c.beginPath();c.arc(ho.x,ho.y,ho.r,0,Math.PI*2);c.fill();c.shadowBlur=0;
      // motion trail
      c.globalAlpha=hA*0.2;c.fillStyle=C.ghost;
      c.beginPath();c.arc(ho.x-ho.spd*1.5,ho.y,ho.r*0.7,0,Math.PI*2);c.fill()}
    else if(ho.type==="zhijian"){c.globalAlpha=hA*0.8;c.fillStyle=C.paper;
      c.save();c.translate(ho.x,ho.y);c.rotate(ho.vy*0.15);
      c.fillRect(-ho.r*0.5,-ho.r*1.2,ho.r,ho.r*2.4);
      c.strokeStyle=C.ash;c.lineWidth=1;c.globalAlpha=hA*0.4;c.strokeRect(-ho.r*0.5,-ho.r*1.2,ho.r,ho.r*2.4);
      c.restore()}
    c.globalAlpha=1});
  // Mobile controls render hook
  if(IS_TOUCH&&window._renderMobileControls)window._renderMobileControls(c,W,H);
  // FPS counter (F3 toggle)
  if(g._showFps&&g.perf){c.save();c.globalAlpha=0.7;c.font='11px monospace';c.fillStyle=C.ash;
    c.textAlign="left";c.fillText(Math.round(g.perf.fps)+" FPS",4,12);
    c.fillText(g.enemies.length+" E "+g.attacks.length+" A "+g.particles.length+" P "+g.fires.length+" F",4,24);
    c.restore()}
}

function drawBlob(c,x,y,r,n){
  c.beginPath();
  for(var i=0;i<=n;i++){var a=(i/n)*Math.PI*2,rr=r+Math.sin(a*3)*r*0.15;
    var px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
    if(i===0)c.moveTo(px,py);else c.lineTo(px,py)}
  c.closePath();c.fill();c.stroke()}

var _lastHp=-1,_lastHpText=-1,_lastRelicHTML="",_lastWeaponName="",_lastWaveText="",_lastKillText="";
var _lastBuffHTML="",_lastBossName="";
var _hudCache={};
// ════════════════════════════════════════════════════════════════
// § HUD — DOM updates for health bar, wave info, boss name, buffs
// ════════════════════════════════════════════════════════════════

function _hudEl(id){if(!_hudCache[id])_hudCache[id]=document.getElementById(id);return _hudCache[id]}
var BUFF_DEFS={
  fireOnKill:{label:"磷火",cat:"permanent",ch:"火"},
  soulChain:{label:"魂链",cat:"permanent",ch:"魂"},
  tripleBlade:{label:"墨刃",cat:"permanent",ch:"刃"},
  bounce:{label:"折返",cat:"permanent",ch:"返"},
  fearOnCrit:{label:"恐惧",cat:"permanent",ch:"惧"},
  killSpeed:{label:"击杀加速",cat:"permanent",ch:"速"},
  comboDmg:{label:"连击",cat:"permanent",ch:"连"},
  inkTrail:{label:"墨径",cat:"permanent",ch:"径"},
  revive:{label:"替身",cat:"permanent",ch:"替"},
  frostOnCrit:{label:"裂冰",cat:"permanent",ch:"冰"},
  summonKite:{label:"风筝",cat:"permanent",ch:"筝"},
  poisonHeal:{label:"毒愈",cat:"permanent",ch:"愈"},
  hasInkSpirit:{label:"墨灵",cat:"permanent",ch:"灵"},
  projPierce:{label:"穿透",cat:"permanent",ch:"穿"},
  projBurst:{label:"爆裂",cat:"permanent",ch:"爆"},
  ringSlow:{label:"声波减速",cat:"permanent",ch:"波"},
  dashReturn:{label:"折返闪",cat:"permanent",ch:"折"},
  killShield:{label:"杀盾",cat:"permanent",ch:"盾"},
  killSlowPool:{label:"墨池",cat:"permanent",ch:"池"},
  lowHpFury:{label:"低血狂暴",cat:"permanent",ch:"狂"},
  decoyOnDodge:{label:"闪避诱饵",cat:"permanent",ch:"饵"},
  killSpdTimer:{label:"加速",cat:"temp",ch:"速"},
  killAtkTimer:{label:"攻速",cat:"temp",ch:"攻"},
  speedBurstT:{label:"爆发",cat:"temp",ch:"爆"}
};

function collectBuffs(g){
  var p=g.player,buffs=[];
  var flags=["fireOnKill","soulChain","tripleBlade","bounce","fearOnCrit",
    "killSpeed","comboDmg","inkTrail","revive","frostOnCrit","summonKite",
    "poisonHeal","hasInkSpirit","projPierce","projBurst","ringSlow",
    "dashReturn","killShield","lowHpFury","decoyOnDodge"];
  flags.forEach(function(f){if(p[f]&&BUFF_DEFS[f])buffs.push(BUFF_DEFS[f])});
  if(p.killSpdTimer>0)buffs.push(BUFF_DEFS.killSpdTimer);
  if(p.killAtkTimer>0)buffs.push(BUFF_DEFS.killAtkTimer);
  if(p.speedBurstT>0)buffs.push(BUFF_DEFS.speedBurstT);
  if(p.shieldStack>0)buffs.push({label:"护盾"+p.shieldStack,cat:"temp",ch:""+p.shieldStack});
  if(p._killBoost)buffs.push({label:"回斩蓄力",cat:"temp",ch:"斩"});
  if(g.curse)buffs.push({label:g.curse.name||"誓印",cat:"negative",ch:"誓"});
  if(g.hazard)buffs.push({label:g.hazard.name||"灾",cat:"negative",ch:"灾"});
  return buffs;
}

function updateHUD(g){
  var p=g.player;
  var st=g.stage?getStageDef(g.stage.id):null;
  var el=_hudEl("hpFill");
  if(el){
    if(p.hp!==_lastHp){var hpR=p.hp/p.maxHp;el.style.width=(hpR*100)+"%";
    var hc=hpR>0.6?"#5a8a4a":hpR>0.3?"#b8860b":"#c4523d";
    el.style.background="linear-gradient(90deg,"+hc+","+hc+")";
    if(_lastHp>=0&&p.hp>_lastHp){el.classList.remove("is-healed");void el.offsetWidth;el.classList.add("is-healed")}
    if(p.hp<=p.maxHp*0.3)el.classList.add("is-critical");else el.classList.remove("is-critical");
    _lastHp=p.hp;}
  }
  el=_hudEl("hpText");if(el&&p.hp!==_lastHpText){el.textContent=Math.ceil(p.hp)+"/"+p.maxHp;_lastHpText=p.hp;}
  var wn=g.weapon.name;
  if(g.evolution)wn+=" → "+g.evolution.name;
  if(g.evolution2)wn+=" + "+g.evolution2.name;
  if(g.evolution3)wn+=" + "+g.evolution3.name;
  if(wn!==_lastWeaponName){_lastWeaponName=wn;el=_hudEl("hudWeapon");if(el)el.textContent=wn;}
  var wt=(({normal:"",hard:"险途 · ",nightmare:"噩梦 · "})[g.diff]||"")+(g.curse?"【"+g.curse.name+"】":"")+(g.announce||"第"+(g.wave+1)+"波")+(st&&st.name!=="净坛"?" · "+st.name:"");
  var aliveCount=0;for(var _ai=0;_ai<g.enemies.length;_ai++){if(g.enemies[_ai].hp>0)aliveCount++;}
  if(aliveCount>0)wt+=" · 余"+aliveCount;
  if(wt!==_lastWaveText){_lastWaveText=wt;el=_hudEl("waveInfo");if(el)el.textContent=wt;}
  var rs=Math.floor(g.time/60),rm=Math.floor(rs/60);rs=rs%60;
  var kt="斩祟 "+g.kills+" · "+(rm<10?"0":"")+rm+":"+(rs<10?"0":"")+rs;
  if(kt!==_lastKillText){_lastKillText=kt;el=_hudEl("killCount");if(el)el.textContent=kt;}
  var maxHudRelics=5;
  var h="";
  g.relics.slice(0,maxHudRelics).forEach(function(r){h+='<span class="hud__relic-tag" data-effect="'+r.effect+'">'+r.name+'</span>'});
  if(g.relics.length>maxHudRelics)h+='<span class="hud__relic-tag hud__relic-tag--more">+'+(g.relics.length-maxHudRelics)+'件</span>';
  if(g.evolution)h+='<span class="hud__relic-tag" style="background:rgba(163,58,45,0.18)">'+g.evolution.name+'</span>';
  if(g.evolution2)h+='<span class="hud__relic-tag" style="background:rgba(163,58,45,0.18)">'+g.evolution2.name+'</span>';
  if(g.evolution3)h+='<span class="hud__relic-tag" style="background:rgba(163,58,45,0.18)">'+g.evolution3.name+'</span>';
  if(h!==_lastRelicHTML){_lastRelicHTML=h;el=_hudEl("hudRelics");if(el)el.innerHTML=h;}
  var buffs=collectBuffs(g);
  var maxBuffs=8,bh="";
  buffs.slice(0,maxBuffs).forEach(function(b){
    bh+='<span class="hud__buff-icon hud__buff-icon--'+b.cat+'" title="'+b.label+'">'+b.ch+'</span>';
  });
  if(buffs.length>maxBuffs)bh+='<span class="hud__buff-icon hud__buff-icon--overflow">+'+(buffs.length-maxBuffs)+'</span>';
  if(bh!==_lastBuffHTML){_lastBuffHTML=bh;el=_hudEl("hudBuffs");if(el)el.innerHTML=bh;}
  var bossE=null;
  for(var bi=0;bi<g.enemies.length;bi++){if(g.enemies[bi].isBoss&&g.enemies[bi].hp>0){bossE=g.enemies[bi];break;}}
  var bnEl=_hudEl("hudBossName");
  if(bnEl){
    var bn=bossE?bossE.name+(bossE.enraged?" · 狂":"")+(bossE.desperate?" · 绝望":""):"";
    if(bn!==_lastBossName){_lastBossName=bn;bnEl.textContent=bn;}
  }
  if(!_hudCache._tipSetup){
    _hudCache._tipSetup=true;
    var relEl=_hudEl("hudRelics");
    if(relEl){
      var _tipEl=null;
      function showTip(tag,cx,cy){
        if(!_tipEl){_tipEl=document.createElement("div");_tipEl.className="relic-tooltip";
          var gf=document.querySelector(".game-frame");if(gf)gf.appendChild(_tipEl);}
        var eff=tag.getAttribute("data-effect")||"";
        _tipEl.innerHTML="<strong>"+tag.textContent+"</strong><br>"+eff;
        var r=tag.getBoundingClientRect();var _gf=document.querySelector(".game-frame");if(!_gf)return;var fr=_gf.getBoundingClientRect();
        _tipEl.style.left=(r.left-fr.left+r.width/2)+"px";
        _tipEl.style.top=(r.bottom-fr.top+6)+"px";
        _tipEl.style.display="block";
      }
      function hideTip(){if(_tipEl)_tipEl.style.display="none";}
      relEl.addEventListener("contextmenu",function(e){var t=e.target.closest?e.target.closest(".hud__relic-tag"):null;if(!t)return;e.preventDefault();showTip(t,e.clientX,e.clientY);});
      var _lpT=null;
      relEl.addEventListener("touchstart",function(e){var t=e.target.closest?e.target.closest(".hud__relic-tag"):null;if(!t)return;var _tc=e.touches[0];_lpT=setTimeout(function(){if(_tc)showTip(t,_tc.clientX,_tc.clientY);},400);},{passive:true});
      relEl.addEventListener("touchend",function(){clearTimeout(_lpT);});
      relEl.addEventListener("touchmove",function(){clearTimeout(_lpT);});
      document.addEventListener("click",hideTip);
      document.addEventListener("touchstart",function(e){if(!e||!e.target||!e.target.closest)return;if(!e.target.closest(".relic-tooltip")&&!e.target.closest(".hud__relic-tag"))hideTip();},{passive:true});
    }
  }
  // Low-HP CSS warning on game frame
  if(!_hudCache._gf&&document.querySelector)_hudCache._gf=document.querySelector(".game-frame");
  var gf=_hudCache._gf;
  if(gf){if(p.hp>0&&p.hp<=p.maxHp*0.3)gf.classList.add("is-low-hp");else gf.classList.remove("is-low-hp")}
  // Dodge button cooldown feedback
  if(!_hudCache._db)_hudCache._db=document.getElementById("mobileDodgeBtn");
  var db=_hudCache._db;
  if(db){
    if(p.dodgeCd>0){db.classList.add("is-cooldown");db.classList.remove("is-ready");
      var ds=Math.ceil(p.dodgeCd/60);if(db._lastDs!==ds){db._lastDs=ds;db.textContent=ds+"s"}}
    else{db.classList.remove("is-cooldown");db.classList.add("is-ready");
      if(db._lastDs!==0){db._lastDs=0;db.textContent="闪"}}
  }
}

// ════════════════════════════════════════════════════════════════
// § RELIC SYSTEM — scoring, selection, display, stats rebuild
// ════════════════════════════════════════════════════════════════

function hasTag(tags,t){return tags&&tags.indexOf(t)>=0}
function hasAnyTag(tags,list){for(var i=0;i<list.length;i++)if(hasTag(tags,list[i]))return true;return false}
function bumpScore(res,n,why){res.score+=n;if(why&&res.reasons.indexOf(why)<0&&res.reasons.length<3)res.reasons.push(why)}

function buildPickState(g){
  var p=g.player,ownedTags={},ownedIds={},weaponTags={},prefTags={};
  g.weapon.tags.forEach(function(t){weaponTags[t]=true});
  (BUILD_PREFS[g.weapon.type]||[]).forEach(function(t){prefTags[t]=true});
  g.relics.forEach(function(r){
    ownedIds[r.id]=true;
    (r.tags||[]).forEach(function(t){ownedTags[t]=(ownedTags[t]||0)+1});
  });
  if(g.evolution){
    ownedIds[g.evolution.id]=true;
    (g.evolution.tags||[]).forEach(function(t){ownedTags[t]=(ownedTags[t]||0)+1});
  }
  if(g.evolution2){
    ownedIds[g.evolution2.id]=true;
    (g.evolution2.tags||[]).forEach(function(t){ownedTags[t]=(ownedTags[t]||0)+1});
  }
  if(g.evolution3){
    ownedIds[g.evolution3.id]=true;
    (g.evolution3.tags||[]).forEach(function(t){ownedTags[t]=(ownedTags[t]||0)+1});
  }
  var evoCount=(g.evolution?1:0)+(g.evolution2?1:0)+(g.evolution3?1:0);
  return{weaponType:g.weapon.type,weaponTags:weaponTags,prefTags:prefTags,
    ownedTags:ownedTags,ownedIds:ownedIds,stats:p.stats,wave:g.wave,
    hpRatio:p.hp/p.maxHp,noSurvival:!ownedTags["生存"],hasKill:!!(p.killHeal||p.killSpeed||p.killAtkSpd||p.fireOnKill||p.killShield||p.soulKillChain||p.fireExpand||p.meleeCdRefund||p.summonKite),
    slowOnHit:p.slowOnHit||0,ringSlow:!!p.ringSlow,ringNoDecay:!!p.ringNoDecay,
    evoCount:evoCount,remainingEvoChoices:Math.max(0,2-evoCount)}
}

var RELIC_RULES={
  jingjuan:[{c:function(s){return s.weaponType==="ranged"||s.weaponType==="dash"||s.stats.returnInk>0},n:10,w:"折返收益"}],
  huangquan:[{c:function(s){return s.weaponType==="dash"||s.stats.spd>1.1||s.ownedTags["机动"]},n:10,w:"速度联动"}],
  zouma:[{c:function(s){return s.weaponType==="dash"||s.ownedIds["huangquan"]},n:8,w:"速度联动"}],
  pojing:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["闪避"]},n:10,w:"闪避反击"}],
  molang:[{c:function(s){return s.weaponType==="ranged"||s.weaponType==="aoe"},n:7,w:"蓄势窗口"},
    {c:function(s){return s.weaponType==="dash"},n:-4,w:null}],
  mochi:[{c:function(s){return s.stats.multi>1||s.weaponType==="melee"},n:6,w:"连击收益"}],
  gudi:[{c:function(s){return s.hasKill},n:6,w:"击杀链"}],
  zhusha:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["暴击"]},n:7,w:"暴击链"}],
  tongjing:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["暴击"]},n:7,w:"暴击链"}],
  lingshe:[{c:function(s){return s.weaponType==="melee"||s.weaponType==="aoe"},n:5,w:"范围收益"}],
  xuezhu:[{c:function(s){return s.weaponType==="melee"||s.weaponType==="aoe"},n:5,w:"范围收益"}],
  zhiren:[{c:function(s){return s.hpRatio<0.6},n:7,w:"替身保护"}],
  zhijia:[{c:function(s){return s.weaponType==="melee"||s.weaponType==="dash"},n:6,w:"前线防御"}],
  zhaohun:[{c:function(s){return s.wave<=4},n:5,w:"前期保命"}],
  xuanbing:[{c:function(s){return s.weaponType==="aoe"},n:9,w:"减速领域"}],
  nuomian:[{c:function(s){return s.ownedTags["暴击"]},n:7,w:"暴击恐惧"}],
  panwen:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["暴击"]||s.ownedIds["tongjing"]},n:9,w:"处决共鸣"}],
  zhupi:[{c:function(s){return s.weaponType==="melee"||s.ownedIds["tongjing"]||s.ownedTags["暴击"]},n:8,w:"弱点联动"}],
  xueqi:[{c:function(s){return s.weaponType==="melee"},n:9,w:"近战冷却"},
    {c:function(s){return s.ownedTags["处决"]},n:5,w:"处决补强"}],
  liuying:[{c:function(s){return s.weaponType==="dash"||s.ownedIds["pojing"]||s.ownedTags["闪避"]},n:9,w:"闪避反击"}],
  huosui:[{c:function(s){return s.ownedIds["yedeng"]||s.ownedTags["火"]},n:10,w:"火场扩散"},
    {c:function(s){return s.ownedTags["击杀"]},n:5,w:"击杀链"}],
  hunqian:[{c:function(s){return s.weaponType==="ranged"||s.weaponType==="aoe"||s.ownedTags["魂"]},n:9,w:"魂杀链"}],
  lingmu:[{c:function(s){return s.weaponType==="aoe"},n:10,w:"铃魂联动"},
    {c:function(s){return s.ownedTags["魂"]||s.ownedTags["控场"]||s.slowOnHit>0||s.ringSlow},n:6,w:"控场魂伤"}],
  fanzhao:[{c:function(s){return s.weaponType==="ranged"||s.stats.returnInk>0||s.ownedIds["jingjuan"]},n:9,w:"折返墨爆"}],
  guxue:[{c:function(s){return s.ownedTags["暴击"]||s.weaponType==="melee"},n:7,w:"暴击风险收益"},
    {c:function(s){return s.hpRatio<0.35},n:-8,w:"低血不宜"},
    {c:function(s){return !s.ownedTags["暴击"]&&s.weaponType!=="melee"},n:-6,w:"缺暴击支撑"}],
  shouyin:[{c:function(s){return s.noSurvival},n:10,w:"缺生存"},
    {c:function(s){return s.ownedTags["击杀"]||s.wave>=5},n:6,w:"击杀护盾"}],
  fengma:[{c:function(s){return s.weaponType==="dash"||s.ownedIds["huangquan"]||s.ownedIds["zouma"]||s.stats.spd>1.1},n:9,w:"速度转化"}],
  dengxin:[{c:function(s){return s.ownedIds["yedeng"]||s.ownedTags["火"]},n:10,w:"火场回血"},
    {c:function(s){return s.hpRatio<0.5},n:6,w:"低血回血"}],
  judou:[{c:function(s){return s.weaponType==="ranged"||s.stats.returnInk>0||s.ownedIds["jingjuan"]},n:9,w:"弹道收益"},
    {c:function(s){return s.weaponType==="dash"},n:-3,w:null}],
  jijiu:[{c:function(s){return s.weaponType==="aoe"},n:8,w:"长CD收益"},
    {c:function(s){return s.weaponType==="dash"},n:7,w:"中CD收益"},
    {c:function(s){return s.weaponType==="melee"},n:3,w:"短CD收益小"}],
  zhiyuan:[{c:function(s){return s.weaponType==="ranged"||s.ownedTags["击杀"]},n:8,w:"击杀产纸鸢"},
    {c:function(s){return s.ownedTags["火"]||s.ownedTags["魂"]},n:6,w:"击杀链放大"}],
  liebing:[{c:function(s){return s.weaponType==="aoe"||s.ownedIds["xuanbing"]||s.ownedTags["暴击"]},n:9,w:"冰暴击共鸣"},
    {c:function(s){return s.weaponType==="melee"||s.ownedTags["暴击"]},n:7,w:"暴击触发"}],
  moyaling:[{c:function(s){return s.weaponType==="ranged"||s.stats.spd>1.1},n:8,w:"速度远程"},
    {c:function(s){return s.hasKill},n:6,w:"击杀加速链"}],
  shixin:[{c:function(s){return s.weaponType==="melee"||s.weaponType==="dash"},n:8,w:"前线防御"},
    {c:function(s){return s.hpRatio<0.55},n:6,w:"血线保护"}],
  yujinshan:[{c:function(s){return s.ownedIds.yedeng||s.ownedTags["火"]},n:10,w:"火场联动"},
    {c:function(s){return s.hpRatio<0.5},n:6,w:"低血回复"}],
  fengmofu:[{c:function(s){return s.weaponType==="aoe"||s.slowOnHit>0||s.ringSlow},n:9,w:"控场增强"},
    {c:function(s){return s.ownedTags["冰"]},n:7,w:"冰减速联动"}],
  huihunxiang:[{c:function(s){return s.noSurvival},n:9,w:"缺生存"},
    {c:function(s){return s.ownedTags["击杀"]||s.wave>=4},n:6,w:"击杀链"}],
  hunfanling:[{c:function(s){return s.weaponType==="summon"},n:10,w:"幡系核心"},
    {c:function(s){return s.ownedIds["hunfanling"]},n:-10,w:"已拥有"}],
  moshizhu:[{c:function(s){return s.hasKill||s.ownedTags["击杀"]},n:8,w:"击杀联动"},
    {c:function(s){return s.slowOnHit>0||s.ringSlow},n:6,w:"减速联动"}],
  xianluowen:[{c:function(s){return s.weaponType==="aoe"||s.weaponType==="summon"},n:9,w:"范围控场"},
    {c:function(s){return s.slowOnHit>0},n:6,w:"减速联动"}],
  yedeng:[{c:function(s){return s.ownedTags["火"]||s.ownedTags["击杀"]},n:8,w:"火场源点"}],
  kuhao:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["魂"]},n:7,w:"近战魂伤"}],
  chenfu:[{c:function(s){return s.ownedTags["魂"]||s.weaponType==="ranged"},n:7,w:"魂法术"}],
  xianghui:[{c:function(s){return s.ownedTags["暴击"]||s.hpRatio<0.4},n:8,w:"低血暴击"}],
  dieyin:[{c:function(s){return s.weaponType==="ranged"||s.ownedTags["魂"]},n:7,w:"远程魂伤"}],
  mobingxin:[{c:function(s){return s.ownedTags["冰"]||s.ownedIds["xuanbing"]},n:9,w:"冰防联动"}],
  molianji:[{c:function(s){return s.weaponType==="melee"},n:9,w:"近战攻速"}],
  mozhanhun:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["处决"]},n:8,w:"处决增幅"}],
  moqianli:[{c:function(s){return s.ownedTags["暴击"]||s.stats.spd>1.1},n:7,w:"速暴联动"}],
  monuxing:[{c:function(s){return s.ownedTags["机动"]||s.ownedTags["暴击"]},n:7,w:"机动暴击"}],
  moxueren:[{c:function(s){return s.ownedTags["暴击"]||s.weaponType==="melee"},n:8,w:"暴击回血"}],
  mojifeng:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["机动"]},n:8,w:"近战机动"}],
  mojuling:[{c:function(s){return s.weaponType==="summon"},n:10,w:"幡系增伤"}],
  mohunyin:[{c:function(s){return s.ownedTags["魂"]||s.weaponType==="summon"},n:8,w:"魂击杀"}],
  mochongying:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["反击"]},n:8,w:"冲刺反击"}],
  moxuanbu:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["溅射"]},n:8,w:"闪避溅射"}],
  moxuming:[{c:function(s){return s.hasKill||s.hpRatio<0.5},n:8,w:"击杀保命"}],
  mohunbu:[{c:function(s){return s.ownedTags["魂"]||s.weaponType==="summon"},n:8,w:"魂机动"}],
  mofenxin:[{c:function(s){return s.ownedTags["火"]||s.hpRatio<0.5},n:8,w:"火场爆发"}],
  moyanbao:[{c:function(s){return s.ownedTags["溅射"]||s.ownedTags["火"]},n:8,w:"溅射火场"}],
  mofendan:[{c:function(s){return s.weaponType==="ranged"||s.ownedTags["火"]},n:8,w:"远程火场"}],
  mojiehuan:[{c:function(s){return s.ownedTags["范围"]||s.hasKill},n:8,w:"范围击杀"}],
  monuyan:[{c:function(s){return s.ownedTags["火"]||s.ownedTags["暴击"]},n:8,w:"暴击火场"}],
  moshouhuo:[{c:function(s){return s.ownedTags["火"]||s.ownedIds["yedeng"]},n:8,w:"火场生存"}],
  mohanfeng:[{c:function(s){return s.ownedTags["冰"]||s.stats.spd>1.1},n:7,w:"冰速联动"}],
  motiejie:[{c:function(s){return s.ownedTags["冰"]||s.ownedTags["反击"]},n:8,w:"冰反击联动"}],
  mojianqi:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["处决"]},n:7,w:"近战处决"}],
  monicizhou:[{c:function(s){return s.ownedTags["反击"]||s.weaponType==="ranged"},n:7,w:"反击法术"}],
  moshenglian:[{c:function(s){return s.hpRatio<0.4||s.noSurvival},n:9,w:"濒死爆发"}],
  mozhoukai:[{c:function(s){return s.ownedTags["诅咒"]||s.hpRatio<0.5},n:7,w:"诅咒防御"}],
  mohushen:[{c:function(s){return s.noSurvival||s.hpRatio<0.6},n:7,w:"治疗防御"}],
  moguangmu:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["闪避"]},n:7,w:"闪避防御"}],
  mojianshi:[{c:function(s){return s.noSurvival||s.hasKill},n:7,w:"击杀生存"}],
  mowushi:[{c:function(s){return s.slowOnHit>0||s.ownedTags["控场"]},n:8,w:"控场减速"}],
  mojieguang:[{c:function(s){return s.ownedTags["暴击"]||s.stats.spd>1.1},n:7,w:"暴击机动"}],
  moyaohun:[{c:function(s){return s.weaponType==="summon"||s.ownedTags["召唤"]},n:8,w:"召唤远程"}],
  mohunsi:[{c:function(s){return s.weaponType==="summon"||s.ownedTags["魂"]},n:8,w:"召唤魂"}],
  mofenying:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["冲刺"]},n:8,w:"冲刺火"}],
  moxunren:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["暴击"]},n:7,w:"冲刺暴击"}],
  moguangshi:[{c:function(s){return s.ownedTags["范围"]||s.ownedTags["持续"]},n:7,w:"范围持续"}],
  mobiyin:[{c:function(s){return s.ownedTags["范围"]||s.noSurvival},n:7,w:"范围防御"}],
  mozhaojun:[{c:function(s){return s.weaponType==="summon"||s.hasKill},n:8,w:"召唤击杀"}],
  mosufeng:[{c:function(s){return s.ownedTags["攻速"]||s.ownedTags["暴击"]},n:7,w:"攻速暴击"}],
  mofanyu:[{c:function(s){return s.ownedTags["范围"]||s.ownedTags["控场"]},n:7,w:"范围控场"}],
  mokuaihun:[{c:function(s){return s.ownedTags["攻速"]||s.ownedTags["魂"]},n:7,w:"攻速魂"}],
  mochongguang:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["冲刺"]},n:7,w:"冲刺暴击"}],
  // --- v5.0-prep RELIC_RULES 扩容: 20 条 ---
  molingyu:[{c:function(s){return s.weaponType==="summon"||s.ownedTags["召物"]},n:9,w:"召唤核心"}],
  molingqi:[{c:function(s){return s.ownedTags["召物"]||s.ownedTags["魂"]},n:9,w:"召唤强化"}],
  baomo:[{c:function(s){return s.ownedTags["召物"]||s.ownedTags["火"]},n:8,w:"召唤火场"}],
  yumo:[{c:function(s){return s.weaponType==="summon"||s.ownedTags["治疗"]},n:7,w:"召唤治疗"}],
  hanmo:[{c:function(s){return s.ownedTags["召物"]||s.ownedTags["冰"]},n:7,w:"召唤冰场"}],
  fenmo:[{c:function(s){return s.weaponType==="summon"||s.ownedTags["分裂"]},n:8,w:"召唤分裂"}],
  lianhuanfu:[{c:function(s){return s.ownedTags["魂"]||s.hasKill},n:8,w:"魂击杀链"}],
  mogongzhen:[{c:function(s){return s.hasKill||s.ownedTags["法术"]},n:8,w:"击杀法术"}],
  yanmoyan:[{c:function(s){return s.ownedTags["火"]||s.hasKill},n:8,w:"火击杀链"}],
  mowo:[{c:function(s){return s.hasKill||s.ownedTags["控场"]},n:7,w:"击杀控场"}],
  moshouzhen:[{c:function(s){return s.ownedTags["生存"]||s.ownedTags["控场"]},n:7,w:"生存控场"}],
  zhenyan:[{c:function(s){return s.ownedTags["控场"]||s.weaponType==="aoe"},n:8,w:"控场强化"}],
  molian:[{c:function(s){return s.ownedTags["法术"]||s.ownedTags["控场"]},n:7,w:"法术控场"}],
  moxian:[{c:function(s){return s.ownedTags["法术"]||s.ownedTags["控场"]},n:7,w:"法术墨弦"}],
  moding:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["控场"]},n:7,w:"近战控场"}],
  zhenmu:[{c:function(s){return s.ownedTags["反击"]||s.ownedTags["生存"]},n:8,w:"反击生存"}],
  zhifan:[{c:function(s){return s.ownedTags["生存"]||s.ownedTags["反击"]},n:7,w:"生存反击"}],
  motiebi:[{c:function(s){return s.ownedTags["防御"]||s.ownedTags["反击"]},n:8,w:"防御反击"}],
  molonglin:[{c:function(s){return s.ownedTags["生存"]||s.stats.def>0.2},n:7,w:"生存机动"}],
  moshouren:[{c:function(s){return s.ownedTags["生存"]||s.ownedTags["反击"]},n:7,w:"生存反击"}],
  // --- v5.1-builds RELIC_RULES 扩容: 26 条，覆盖6条候选流派缺口 ---
  // 爆炸/溅射/连锁 (缺口最大: 3/20 → 补8)
  mosui:[{c:function(s){return s.ownedTags["暴击"]||s.ownedTags["溅射"]},n:7,w:"暴击溅射"}],
  mosancui:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["溅射"]},n:7,w:"近战溅射"}],
  moboaoyin:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["爆炸"]},n:8,w:"近战爆炸"}],
  molianbao:[{c:function(s){return s.ownedTags["溅射"]||s.ownedTags["爆炸"]},n:8,w:"溅射爆炸链"}],
  molielian:[{c:function(s){return s.ownedTags["分裂"]||s.ownedTags["溅射"]},n:7,w:"分裂溅射"}],
  mobaodan:[{c:function(s){return s.ownedTags["爆炸"]||s.ownedTags["爆发"]},n:8,w:"爆炸爆发"}],
  moxuexing:[{c:function(s){return s.ownedTags["溅射"]||s.hasKill},n:7,w:"溅射击杀"}],
  mohuoyan:[{c:function(s){return s.ownedTags["暴击"]||s.ownedTags["火"]},n:7,w:"暴击火场"}],
  // 范围/控场/持续 (缺口: 17/38 → 补7)
  mogangyin:[{c:function(s){return s.ownedTags["控场"]||s.ownedTags["远程"]},n:7,w:"控场远程"}],
  mochen:[{c:function(s){return s.ownedTags["法术"]||s.weaponType==="aoe"},n:7,w:"法术墨阵"}],
  moshi:[{c:function(s){return s.ownedTags["持续"]||s.hasKill},n:7,w:"持续击杀"}],
  mofutan:[{c:function(s){return s.ownedTags["持续"]||s.ownedTags["法术"]},n:7,w:"持续法术"}],
  mochizhu:[{c:function(s){return s.ownedTags["持续"]||s.ownedTags["治疗"]},n:7,w:"持续治疗"}],
  mohunjia:[{c:function(s){return s.ownedTags["防御"]||s.ownedTags["持续"]},n:7,w:"防御持续"}],
  mofenyu:[{c:function(s){return s.ownedTags["持续"]||s.ownedTags["爆炸"]},n:7,w:"持续爆炸"}],
  // 召唤/击杀/魂 (补4)
  moxi:[{c:function(s){return s.hasKill||s.ownedTags["控场"]},n:7,w:"击杀墨阵"}],
  mobao:[{c:function(s){return s.hasKill||s.ownedTags["法术"]},n:7,w:"击杀法术"}],
  monuhun:[{c:function(s){return s.ownedTags["魂"]||s.ownedTags["生存"]},n:7,w:"魂生存"}],
  moyinfu:[{c:function(s){return s.ownedTags["魂"]||s.hasKill},n:7,w:"魂击杀"}],
  // 近战/暴击/攻速 (补4)
  pojunfu:[{c:function(s){return s.weaponType==="melee"||s.ownedTags["暴击"]},n:8,w:"近战暴击"}],
  powangtong:[{c:function(s){return s.ownedTags["处决"]||s.ownedTags["暴击"]},n:8,w:"处决暴击"}],
  pilimu:[{c:function(s){return s.ownedTags["攻速"]||s.ownedTags["法术"]},n:7,w:"攻速法术"}],
  mojinbiao:[{c:function(s){return s.ownedTags["远程"]||s.ownedTags["暴击"]},n:7,w:"远程暴击"}],
  // 防御/反击/生存 (补3)
  mojing:[{c:function(s){return s.ownedTags["防御"]||s.ownedTags["法术"]},n:7,w:"防御法术"}],
  moquanyan:[{c:function(s){return s.ownedTags["治疗"]||s.ownedTags["生存"]},n:7,w:"治疗生存"}],
  guxuquan:[{c:function(s){return s.ownedTags["生命"]||s.ownedTags["生存"]},n:7,w:"生命生存"}],
  // --- v5.1-builds 第二批 RELIC_RULES: 25 条 → 目标 157/191 = 82% ---
  yindeng:[{c:function(s){return s.ownedTags["魂"]||s.hasKill},n:7,w:"魂击杀"}],
  tunmofu:[{c:function(s){return s.hasKill||s.ownedTags["生存"]},n:7,w:"击杀生存"}],
  hanxingtie:[{c:function(s){return s.ownedTags["冰"]||s.ownedTags["暴击"]},n:8,w:"冰暴击"}],
  binghe:[{c:function(s){return s.ownedTags["冰"]||s.ownedTags["暴击"]},n:7,w:"冰暴击"}],
  houmo:[{c:function(s){return s.weaponType==="ranged"||s.ownedTags["暴击"]},n:7,w:"远程暴击"}],
  mojiaojin:[{c:function(s){return s.weaponType==="ranged"||s.ownedTags["机动"]},n:7,w:"远程机动"}],
  hunsuolian:[{c:function(s){return s.ownedTags["处决"]||s.hasKill},n:8,w:"处决击杀"}],
  moxiu:[{c:function(s){return s.hasKill||s.ownedTags["处决"]},n:7,w:"击杀处决"}],
  moze:[{c:function(s){return s.hasKill||s.ownedTags["机动"]},n:7,w:"击杀机动"}],
  motao:[{c:function(s){return s.hasKill||s.ownedTags["控场"]},n:7,w:"击杀控场"}],
  mowei:[{c:function(s){return s.ownedTags["法术"]||s.hasKill},n:7,w:"法术击杀"}],
  guishouyin:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["魂"]},n:8,w:"闪避魂"}],
  moyi:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["机动"]},n:7,w:"闪避机动"}],
  mopeng:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["机动"]},n:7,w:"闪避机动"}],
  yexingyi:[{c:function(s){return s.weaponType==="dash"||s.ownedTags["闪避"]},n:7,w:"闪避特殊"}],
  shimoChi:[{c:function(s){return s.ownedTags["持续"]||s.hasKill},n:7,w:"持续击杀"}],
  moshiyu:[{c:function(s){return s.ownedTags["持续"]||s.ownedTags["溅射"]},n:7,w:"持续溅射"}],
  mohuafeng:[{c:function(s){return s.ownedTags["分裂"]||s.ownedTags["持续"]},n:7,w:"分裂持续"}],
  moliefu:[{c:function(s){return s.ownedTags["分裂"]||s.ownedTags["法术"]},n:7,w:"分裂法术"}],
  molefubao:[{c:function(s){return s.ownedTags["分裂"]||s.ownedTags["爆炸"]},n:8,w:"分裂爆炸"}],
  mangmou:[{c:function(s){return s.ownedTags["诅咒"]||s.ownedTags["爆发"]},n:7,w:"诅咒爆发"}],
  mocanxue:[{c:function(s){return s.ownedTags["诅咒"]||s.ownedTags["暴击"]},n:7,w:"诅咒暴击"}],
  momengen:[{c:function(s){return s.ownedTags["诅咒"]||s.ownedTags["处决"]},n:7,w:"诅咒处决"}],
  mohongyu:[{c:function(s){return s.ownedTags["控场"]||s.ownedTags["攻速"]},n:7,w:"控场攻速"}],
  mofanglei:[{c:function(s){return s.ownedTags["法术"]||s.ownedTags["暴击"]},n:7,w:"法术暴击"}],
  mozhenlianhuan:[{c:function(s){return s.ownedTags["范围"]||s.ownedTags["持续"]},n:9,w:"范围持续核心"}],
  mobaoliansu:[{c:function(s){return s.ownedTags["爆炸"]||s.ownedTags["溅射"]},n:9,w:"爆炸溅射核心"}],
  // --- v5.2 RELIC_RULES 全覆盖: 剩余34条 ---
  xuemo:[{c:function(s){return s.ownedTags["诅咒"]||s.weaponType==="melee"},n:7,w:"诅咒近战"}],
  jingxinzhou:[{c:function(s){return s.ownedTags["生存"]||s.ownedTags["控场"]},n:7,w:"生存控场"}],
  mojiangling:[{c:function(s){return s.hasKill||s.ownedTags["法术"]},n:7,w:"击杀法术"}],
  zhiyanwen:[{c:function(s){return s.weaponType==="ranged"||s.ownedTags["控场"]},n:7,w:"远程控场"}],
  shiguping:[{c:function(s){return s.ownedTags["生存"]||s.ownedTags["火"]},n:7,w:"生存火场"}],
  huichunzhen:[{c:function(s){return s.ownedTags["生存"]||s.ownedTags["控场"]},n:7,w:"生存回春"}],
  mojia:[{c:function(s){return s.ownedTags["生存"]||s.ownedTags["控场"]},n:7,w:"生存墨阵"}],
  monu:[{c:function(s){return s.hpRatio<0.5||s.ownedTags["爆发"]},n:7,w:"低血爆发"}],
  mojingsui:[{c:function(s){return s.ownedTags["防御"]||s.ownedTags["法术"]},n:7,w:"防御反射"}],
  jiuzhuanmofu:[{c:function(s){return s.ownedTags["法术"]||s.ownedTags["爆发"]},n:8,w:"法术爆发"}],
  mojicanbu:[{c:function(s){return s.ownedTags["机动"]||s.ownedTags["爆发"]},n:7,w:"机动爆发"}],
  huanguquan:[{c:function(s){return s.ownedTags["治疗"]||s.hasKill},n:7,w:"治疗击杀"}],
  bingmobi:[{c:function(s){return s.ownedTags["防御"]||s.ownedTags["冰"]},n:7,w:"防御冰场"}],
  moyanqian:[{c:function(s){return s.ownedTags["溅射"]||s.ownedTags["火"]},n:7,w:"溅射火场"}],
  mohundan:[{c:function(s){return s.hpRatio<0.5||s.ownedTags["爆发"]},n:7,w:"低血爆发"}],
  xumingmo:[{c:function(s){return s.ownedTags["治疗"]||s.ownedTags["生命"]},n:7,w:"治疗生命"}],
  moxizhu:[{c:function(s){return s.ownedTags["持续"]||s.ownedTags["生命"]},n:7,w:"持续生命"}],
  mojiedun:[{c:function(s){return s.ownedTags["溅射"]||s.ownedTags["防御"]},n:7,w:"溅射防御"}],
  moobaohun:[{c:function(s){return s.ownedTags["爆炸"]||s.hpRatio<0.5},n:7,w:"爆炸低血"}],
  molieshengfu:[{c:function(s){return s.ownedTags["分裂"]||s.ownedTags["生命"]},n:7,w:"分裂生命"}],
  mosanzhi:[{c:function(s){return s.ownedTags["治疗"]||s.ownedTags["溅射"]},n:7,w:"治疗溅射"}],
  mozhenjia:[{c:function(s){return s.ownedTags["爆炸"]||s.ownedTags["防御"]},n:8,w:"爆炸防御"}],
  moyingyi:[{c:function(s){return s.ownedTags["治疗"]||s.ownedTags["爆炸"]},n:7,w:"治疗爆炸"}],
  molieshengjia:[{c:function(s){return s.ownedTags["分裂"]||s.ownedTags["防御"]},n:7,w:"分裂防御"}],
  moshengfang:[{c:function(s){return s.ownedTags["生命"]||s.ownedTags["防御"]},n:7,w:"生命防御"}],
  moshengzhi:[{c:function(s){return s.ownedTags["分裂"]||s.ownedTags["治疗"]},n:7,w:"分裂治疗"}],
  moruyu:[{c:function(s){return s.weaponType==="ranged"||s.ownedTags["机动"]},n:7,w:"远程机动"}],
  mojingchao:[{c:function(s){return s.ownedTags["控场"]||s.ownedTags["魂"]},n:7,w:"控场魂"}],
  moyanpai:[{c:function(s){return s.ownedTags["生存"]||s.ownedTags["控场"]},n:7,w:"生存控场"}],
  mojihong:[{c:function(s){return s.ownedTags["魂"]||s.weaponType==="ranged"},n:7,w:"魂远程"}],
  moyunshi:[{c:function(s){return s.ownedTags["生存"]||s.ownedTags["机动"]},n:7,w:"生存机动"}],
  moxue:[{c:function(s){return s.ownedTags["诅咒"]||s.ownedTags["魂"]},n:7,w:"诅咒魂"}],
  mozhendang:[{c:function(s){return s.ownedTags["控场"]||s.ownedTags["处决"]},n:7,w:"控场处决"}],
  mozhouxin:[{c:function(s){return s.ownedTags["生命"]||s.ownedTags["诅咒"]},n:7,w:"生命诅咒"}]
};

function scoreRelicChoice(r,state,mode){
  var res={relic:r,score:18+Math.random()*3,reasons:[]},tags=r.tags||[];
  tags.forEach(function(t){
    if(state.weaponTags[t])bumpScore(res,10,"武器共鸣");
    if(state.prefTags[t])bumpScore(res,7,"流派补强");
    if(state.ownedTags[t])bumpScore(res,Math.min(10,state.ownedTags[t]*4),"遗物联动");
    if(state.ownedTags[t]>=4)bumpScore(res,-4,null);
  });
  if(mode==="support"&&hasAnyTag(tags,["生存","控场","机动","冰","暴击","击杀"]))bumpScore(res,8,"补短板");
  if(mode==="wild"&&hasAnyTag(tags,["诅咒","火","分裂","处决","闪避","机动"]))bumpScore(res,8,"变招");
  if(state.hpRatio<0.55&&hasAnyTag(tags,["生存","控场","机动"]))bumpScore(res,9,"血线保护");
  if(state.hpRatio<0.35&&hasTag(tags,"诅咒"))bumpScore(res,-10,"低血风险");
  if(state.noSurvival&&hasTag(tags,"生存"))bumpScore(res,7,"缺生存");
  if(state.wave<=2&&hasAnyTag(tags,["生存","控场","机动"]))bumpScore(res,4,"前期稳定");
  if(state.wave>=5&&hasAnyTag(tags,["击杀","暴击","火","魂"]))bumpScore(res,6,"后期清场");
  var rules=RELIC_RULES[r.id];
  if(rules)for(var i=0;i<rules.length;i++){var ru=rules[i];if(ru.c(state))bumpScore(res,ru.n,ru.w)}
  var tagMatch=0;tags.forEach(function(t){if(state.ownedTags[t])tagMatch++});
  if(tagMatch>=3)bumpScore(res,5,"构筑保底");
  res.score=Math.max(1,res.score);
  return res;
}

function weightedEntry(entries){
  var total=0;
  entries.forEach(function(e){total+=Math.max(1,e.score)});
  var roll=rn(0,total);
  for(var i=0;i<entries.length;i++){roll-=Math.max(1,entries[i].score);if(roll<=0)return entries[i]}
  return entries[entries.length-1]
}

function markRelicChoice(entry){
  var r=entry.relic;
  r._pickScore=Math.round(entry.score);
  r._pickWhy=entry.reasons.join(" / ")||"均衡";
  return r;
}

function scoreEvolutionChoice(e,state){
  var res={relic:e,score:24+Math.random()*2,reasons:[]};
  if(state.weaponType==="melee"){
    if(e.id==="e_pishan")bumpScore(res,9,"范围稳定");
    else if(e.id==="e_luanwu")bumpScore(res,8,"多段放大");
    else if(e.id==="e_duanyue")bumpScore(res,8,"直接增伤");
    else if(e.id==="e_zhemo")bumpScore(res,7,"追击补刀");
  }else if(state.weaponType==="ranged"){
    if(e.id==="e_lianzhu")bumpScore(res,10,"多弹核心");
    else if(e.id==="e_guanjia")bumpScore(res,9,"穿透清线");
    else if(e.id==="e_baolie")bumpScore(res,8,"溅射清场");
    else if(e.id==="e_fenmo")bumpScore(res,7,"大弹分裂");
    if(e.id==="e_fenmo"&&state.ownedIds["judou"])bumpScore(res,4,"大弹收益");
  }else if(state.weaponType==="aoe"){
    if(e.id==="e_kuoyu")bumpScore(res,10,"范围核心");
    else if(e.id==="e_gongming"){bumpScore(res,9,"第二圈");
      if(state.ringNoDecay)bumpScore(res,8,"双圈成型")}
    else if(e.id==="e_zhenya"){bumpScore(res,8,"控场核心");
      if(state.ownedIds["lingmu"]||state.ownedIds["xuanbing"]||state.ownedIds["liebing"])bumpScore(res,8,"遗物联动")}
    else if(e.id==="e_shuangpin"){
      if(state.stats.multi>1)bumpScore(res,12,"双圈不衰");
      else if(state.remainingEvoChoices<=1)return null;
      else bumpScore(res,-10,"前置未成");
      if(state.ownedIds["lingmu"])bumpScore(res,3,"铃魂放大");
    }
  }else if(state.weaponType==="dash"){
    if(e.id==="e_jifeng"){bumpScore(res,10,"速度增伤");
      if(state.ownedIds["fengma"]||state.ownedIds["huangquan"]||state.ownedIds["zouma"])bumpScore(res,8,"机动联动")}
    else if(e.id==="e_xuanren")bumpScore(res,9,"多段扫击");
    else if(e.id==="e_tiebi")bumpScore(res,8,"前线容错");
    else if(e.id==="e_kaihe")bumpScore(res,8,"返刀补伤");
  }
  if(state.hpRatio<0.45&&hasAnyTag(e.tags,["近战","突进","控场"]))bumpScore(res,3,"稳住血线");
  res.score=Math.max(1,res.score);
  return res;
}

function pickEvolutionChoices(g,pool){
  var state=buildPickState(g);
  var scored=pool.map(function(e){return scoreEvolutionChoice(e,state)}).filter(Boolean);
  if(scored.length<=3)return scored.sort(function(a,b){return b.score-a.score}).map(markRelicChoice);
  scored.sort(function(a,b){return b.score-a.score});
  return scored.slice(0,3).map(markRelicChoice);
}

function pickRelicChoices(g){
  if(g.relics.length>=(g.player.maxRelicsOverride||6))return[];
  var owned={},unowned=[];
  g.relics.forEach(function(r){owned[r.id]=true});
  RELICS.forEach(function(r){if(!owned[r.id])unowned.push(r)});
  var pool=g.relicPool.filter(function(r){return!owned[r.id]});
  if(pool.length<3){
    var refill=(unowned.length>=3?unowned:RELICS);
    refill.forEach(function(r){if(pool.indexOf(r)<0)pool.push(r)});
  }
  var state=buildPickState(g),chosen=[],chosenIds={};
  pool=pool.filter(function(r){return !PREREQS[r.id]||PREREQS[r.id](state)});
  function choose(mode){
    var scored=pool.filter(function(r){return!chosenIds[r.id]}).map(function(r){return scoreRelicChoice(r,state,mode)});
    if(!scored.length)return;
    scored.sort(function(a,b){return b.score-a.score});
    var entry=weightedEntry(scored.slice(0,Math.min(8,scored.length)));
    if(entry){chosenIds[entry.relic.id]=true;chosen.push(markRelicChoice(entry))}
  }
  choose("main");choose("support");choose("wild");
  var count=g.player.extraRelicChoice?4:3;
  while(chosen.length<count&&chosen.length<pool.length)choose("main");
  return chosen;
}

function relicCardHtml(r,cls,ownedRelics){
  var debug=window._showDebug&&r._pickWhy?'<div class="relic-pick__debug">权重 '+r._pickScore+' · '+r._pickWhy+'</div>':"";
  var tags=(r.tags||[]).join(" ");
  var iconKey=r.id||((r.tags&&r.tags[0])?r.tags[0]:"");
  // synergy tag: show matching tag with owned relics
  var synTag="";
  if(ownedRelics&&r.tags){
    for(var si=0;si<r.tags.length;si++){
      for(var oi=0;oi<ownedRelics.length;oi++){
        if(ownedRelics[oi].tags&&ownedRelics[oi].tags.indexOf(r.tags[si])>=0){
          synTag='<span class="relic-synergy">协·'+r.tags[si]+'</span>';break}}
      if(synTag)break}}
  // build hint from RELIC_RULES
  var buildHint="";
  if(RELIC_RULES[r.id]){var rr=RELIC_RULES[r.id];if(rr[0]&&rr[0].w)buildHint='<span class="relic-build-hint">'+rr[0].w+'</span>'}
  return'<div class="relic-pick '+(cls||"")+'" data-relic="'+r.id+'" data-icon="'+iconKey+'"><h4><span class="ink-icon"></span>'+r.name+'</h4>'+
    '<div class="relic-pick__type"><span class="relic-type-badge">'+r.type+'</span> '+tags+synTag+buildHint+'</div>'+
    '<p>'+r.effect+'</p>'+debug+'</div>'
}

function showRelic(g){
  var p=g.player;var oldHp=p.hp;
  if(!p.noWaveHeal){var _wht=Math.floor(p.maxHp*0.2);var _oldHp=p.hp;
    p.hp=Math.min(p.maxHp,p.hp+_wht);g.totalHealed+=(p.hp-_oldHp);
    if(p.hp>oldHp)spawnInk(g,p.x,p.y,8,"moss")}
  if(p.waveEndHeal){var _weh=Math.floor(p.maxHp*p.waveEndHealRatio);
    p.hp=Math.min(p.maxHp,p.hp+_weh);spawnInk(g,p.x,p.y,6,"moss");snd("heal")}
  snd("relicPickup");
  var isEvo=!p.noEvolution&&(g.wave===3||g.wave===6||g.wave===8);
  if(isEvo)showHint(g,"evo","选择一项武器进化 — 强化你的攻击方式");
  else showHint(g,"relic","选择一件遗物 — 它会强化你的构筑");
  var pool,choices;
  if(isEvo){
    var wtype=g.weapon.type;
    pool=(EVOLUTIONS[wtype]||[]).filter(function(e){return (!g.evolution||e.id!==g.evolution.id)&&(!g.evolution2||e.id!==g.evolution2.id)&&(!g.evolution3||e.id!==g.evolution3.id)});
    if(pool.length===0){isEvo=false;choices=pickRelicChoices(g)}
    else choices=pickEvolutionChoices(g,pool);
  }else{
    choices=pickRelicChoices(g);
  }
  var el=document.getElementById("relicChoices");
  var sealEl=document.getElementById("relicSeal");
  var popupEl=document.getElementById("relicPopup");
  if(!el||!sealEl||!popupEl){g.state="playing";startWave(g);return;}
  if(!choices||!choices.length){
    if(g.relics.length>=(g.player.maxRelicsOverride||6))pushLimited(g.floatTexts,{x:W/2,y:H/2-30,text:"遗物已满",life:60,maxLife:60,reason:"hint"},LIMITS.floatTexts);
    g.state="playing";startWave(g);return}
  if(isEvo){
    sealEl.textContent=g.wave===8?"终进化":g.wave===6?"再进化":"进化";
    el.innerHTML=choices.map(function(r){return relicCardHtml(r,"relic-pick--evo",g.relics)}).join("");
  }else{
    sealEl.textContent="得物";
    el.innerHTML=choices.map(function(r){return relicCardHtml(r,"",g.relics)}).join("");
  }
  var sumEl=document.getElementById("relicSummary");
  if(sumEl){
    if(g.relics.length>0){
      sumEl.style.display="";
      sumEl.textContent="已持："+g.relics.map(function(r){return r.name}).join(" · ");
    }else{sumEl.style.display="none"}
  }
  // Wave preview
  var wpEl=document.getElementById("wavePreview");
  if(wpEl&&g.wave<WAVE_BUDGETS.length-1){
    var nw=WAVE_BUDGETS[g.wave+1]||0;
    var isNextBoss=(g.wave+1)>=WAVE_BUDGETS.length-1;
    var diffLabel2={normal:"平常",hard:"险途",nightmare:"噩梦"}[g.diff]||"";
    wpEl.style.display="";
    wpEl.textContent=isNextBoss?"下一波：Boss决战 · 精锐集结":
      "下一波：第"+CN_NUM[g.wave+1]+"波 · "+diffLabel2+" · 威胁"+nw;
  }else if(wpEl){wpEl.style.display="none"}
  popupEl.style.display="";
  g.state="waveClear";
  el._choiceLocked=false;
  var _skipRelic=function(){
    if(el._choiceLocked)return;el._choiceLocked=true;el.onclick=null;
    popupEl.style.display="none";g.state="playing";startWave(g);
  };
  var _skipBtn=document.getElementById("relicSkipBtn");
  if(_skipBtn){_skipBtn.onclick=function(){_skipRelic()}}
  el.onmouseover=function(ev){if(ev.target.closest&&ev.target.closest("[data-relic]"))snd("uiBlip")};
  el.onclick=function(ev){
    if(el._choiceLocked)return;
    var node=ev.target;
    if(node&&node.nodeType!==1)node=node.parentElement;
    var card=node&&node.closest?node.closest("[data-relic]"):null;
    if(!card)return;
    var item=choices.filter(function(r){return r.id===card.dataset.relic})[0];
    if(!item)return;snd(isEvo?"evoPickup":"relicPickup");
    el._choiceLocked=true;
    if(card.classList&&card.classList.add)card.classList.add("is-picked");
    el.onclick=null;
    if(isEvo){if(!g.evolution)g.evolution=item;else if(!g.evolution2)g.evolution2=item;else g.evolution3=item}else{
      var synergies=[];
      if(item.tags)g.relics.forEach(function(r){
        if(!r.tags)return;
        var shared=item.tags.filter(function(t){return r.tags.indexOf(t)>=0});
        if(shared.length>0)synergies.push({relic:r,tags:shared});
      });
      g.relics.push(item);
      if(synergies.length>0){
        var sTag=synergies[0].tags[0];
        pushLimited(g.floatTexts,{x:W/2,y:H/2+20,text:"协同 · "+sTag,life:90,maxLife:90,reason:"synergy"},LIMITS.floatTexts);
      }
    }
    var _preSoul=g.player.soulDmg||0,_preHeal=g.player.killHeal||0,_preDecoy=g.player.decoyHP||0;
    item.fn(g.player);
    // 更新已有墨灵的伤害（墨灵契等遗物可能改变spiritDmgBonus）
    if(g.inkSpirits.length>0){
      var sd=Math.max(3,Math.ceil(4*(g.player.relicPower||1)*(1+(g.player.spiritDmgBonus||0))));
      g.inkSpirits.forEach(function(sp){sp.dmg=sd});
    }
    if(g.player.relicPower>1){
      var rp=g.player.relicPower;
      var soulDelta=(g.player.soulDmg||0)-_preSoul;
      var healDelta=(g.player.killHeal||0)-_preHeal;
      var decoyDelta=(g.player.decoyHP||0)-_preDecoy;
      if(soulDelta>0)g.player.soulDmg=_preSoul+Math.floor(soulDelta*rp);
      if(healDelta>0)g.player.killHeal=_preHeal+Math.floor(healDelta*rp);
      if(decoyDelta>0)g.player.decoyHP=_preDecoy+Math.floor(decoyDelta*rp);
      if(!g.player._relicPowerApplied){
        g.player.stats.dmg+=(rp-1)*0.12;
        g.player.stats.critDmg+=(rp-1)*0.2;
        g.player._relicPowerApplied=true;
      }
    }
    spawnInk(g,g.player.x,g.player.y,12,"accent");
    g.relicFlash=12;
    popupEl.style.display="none";
    g.state="playing";startWave(g)};
}

function rebuildPlayerStats(g){
  var o=g.player,f=mkPlayer();
  var rk=['x','y','facing','hp','atkCd','atkCount','invTimer','hurtFlash',
    'dashT','dashDx','dashDy','dodgeT','dodgeDx','dodgeDy','dodgeCd','dodgeQueued','justDodgedT','dodgeBufferT','dodgeBufferDx','dodgeBufferDy',
    'comboCount','comboTimer','comboHitId','comboHitCount',
    'chargeTimer','charged','killSpdTimer','killAtkTimer','stillT','idleT','blindT',
    'lastDx','lastDy','weakTargets','leeches','hasRevived','shieldStack',
    'execCritT','speedBurstT','atkFormCount','kiteKills','_killBoost','recallMark','justDodged',
    'autoReflectReady','autoReflectCd'];
  var ck=['noDodge','noWaveHeal','noEvolution','fogCurse','soulOrbCurse',
    'maxHpOverride','extraStartRelics','extraRelicChoice','enemyHpMult','enemySpdMult','maxRelicsOverride','allElite',
    'relicPower','_relicPowerApplied','moveSlowTrail','stillDmgMult','moveChargeMax',
    'killHealChance','killHealAmt','meleeSplash','meleeSplashRatio',
    'comboDmgScale','comboVuln',
    'killExplode','killExplodeRatio','killDotZone','killDotDmg',
    'waveHpBonus','waveHpMax','waveHpGain','waveHpAdded',
    'hurtFrost',
    'lowHpWaveHeal','fireSplash','fireSplashRatio',
    'spiritCapBonus','spiritHpPenalty',
    'critExplosion','critExplosionRatio',
    'hitDot','hitDotDmg','hitDotLife',
    'lowHpBurst','lowHpBurstUsed','lowHpBurstT',
    'executeExplode','executeExplodeRatio',
    'splashDot','splashDotDmg','splashDotLife',
    'healToShield',
    'splitOnHit','splitChance',
    'hurtRetaliate','hurtRetaliateDmg',
    'blindDmgBoost',
    'splashDeathBoom','splashDeathBoomChance','splashDeathBoomRatio',
    'splashRippleStack','splashRippleMax','splashRippleBonus','_rippleStacks',
    'splitDot',
    'breathOnKill','breathTicks',
    'hurtSplash','hurtSplashDmg',
    'killBurstHeal',
    'killSplashHeal',
    'splitHitHeal',
    'hurtShieldActive','hurtShieldTicks',
    'killSplashWideHeal',
    'splitBoomOnHit',
    'bossHurtGuard',
    'healOverflowBoom',
    'dotAccumBoom',
    'splitShieldActive','splitShieldTicks',
    'fullHpDefense',
    'waveEndHeal','waveEndHealRatio','maxHpMult','dmgTakenMult',
    'splitHealOnHit',
    'yinFuHeal',
    'soulKill',
    'curseSurv',
    'rangedFire',
    'summonBurst',
    'dashRetaliate',
    'meleeMobility',
    'killAOE',
    'critHeal',
    'dodgeSplash',
    'curseHeart',
    'counterSpell',
    'burstHeal',
    'burstHealUsed',
    'splashFire',
    'killSurvive',
    'spiritSpeed',
    'fireBurst'
    ,
    'rangedKillSpirit'
    ,
    'soulHitBoost'
    ,
    'dashFireTrail'
    ,
    'dashCritBoost'
    ,
    'aoeDotHit'
    ,
    'aoeGuardBond'
    ,
    'hasNineSeal'
    ,
    'killSummonSpirit'
    ,
    'mosufengBond'
    ,
    'mofanyuBond'
    ,
    'mokuaihunBond'
    ,
    'mochongguangBond'
    ,
    'mozhenlianhuan'
    ,
    'mobaoliansu'
    ];
  rk.concat(ck).forEach(function(k){f[k]=o[k]});
  g.relics.forEach(function(r){try{r.fn(f)}catch(e){}});
  if(g.evolution)g.evolution.fn(f);
  if(g.evolution2)g.evolution2.fn(f);
  if(g.evolution3)g.evolution3.fn(f);
  if(f.relicPower>1){f.stats.dmg+=(f.relicPower-1)*0.12;f.stats.critDmg+=(f.relicPower-1)*0.2;if(f.soulDmg)f.soulDmg=Math.floor(f.soulDmg*f.relicPower);if(f.killHeal)f.killHeal=Math.floor(f.killHeal*f.relicPower);if(f.decoyHP)f.decoyHP=Math.floor(f.decoyHP*f.relicPower)}
  // 墨聚灵：3只墨魂以上伤害加成
  if(f.summonBurst&&g.inkSpirits&&g.inkSpirits.length>=3)f.stats.dmg+=0.2;
  // 墨咒心：生命加成+高血增伤
  if(f.curseHeart){f.maxHp+=20;if(f.hp>f.maxHp*0.5)f.stats.dmg+=0.1}
  // 墨魂步：每只墨魂+3%移速
  if(f.spiritSpeed&&g.inkSpirits&&g.inkSpirits.length>0)f.stats.spd+=g.inkSpirits.length*0.03;
  if(f.maxHpOverride>0)f.maxHp=f.maxHpOverride;
  if(f.spiritHpPenalty>0&&f.inkSpiritCount>0)f.maxHp=Math.max(20,f.maxHp-f.spiritHpPenalty*f.inkSpiritCount);
  if(f.hp>f.maxHp)f.hp=f.maxHp;
  g.player=f;
}

function showMerchant(g){
  snd("shopEnter");
  var el=document.getElementById("relicChoices");
  var sealEl=document.getElementById("relicSeal");
  var popupEl=document.getElementById("relicPopup");
  if(!el||!sealEl||!popupEl){g.state="playing";return;}
  g.state="waveClear";
  sealEl.textContent="鬼市";
  el.innerHTML='<div class="relic-pick" data-choice="swap"><h4><span class="ink-icon"></span>交换遗物</h4><p>随机替换一件已拥有的遗物</p></div>'+
    '<div class="relic-pick" data-choice="hp"><h4><span class="ink-icon"></span>用HP换遗物</h4><p>消耗30点生命，获得随机新遗物</p></div>'+
    '<div class="relic-pick" data-choice="leave" style="border-color:var(--ash);opacity:0.7"><h4>继续赶路</h4><p>不交易，继续前行</p></div>';
  popupEl.style.display="";
  el._choiceLocked=false;
  el.onclick=function(ev){
    if(el._choiceLocked)return;
    var node=ev.target;
    if(node&&node.nodeType!==1)node=node.parentElement;
    var card=node&&node.closest?node.closest("[data-choice]"):null;
    if(!card)return;
    el._choiceLocked=true;el.onclick=null;
    var p=g.player;
    if(card.dataset.choice==="leave"){
      pushLimited(g.floatTexts,{x:W/2,y:H/2+20,text:"继续赶路…",life:50,maxLife:50,reason:"merchant"},LIMITS.floatTexts);
      g._merchantCooldown=90;
      popupEl.style.display="none";g.state="playing";return;
    }
    if(card.dataset.choice==="swap"){
      if(g.relics.length===0){
        pushLimited(g.floatTexts,{x:W/2,y:H/2+20,text:"无遗物可换",life:90,maxLife:90,reason:"merchant"},LIMITS.floatTexts);
        el._choiceLocked=false;return;
      }
      var idx=ri(0,g.relics.length-1);
      var removed=g.relics.splice(idx,1)[0];
      var ownedIds={};g.relics.forEach(function(r){ownedIds[r.id]=1});
      var pool=g.relicPool.filter(function(r){return!ownedIds[r.id]});
      if(pool.length===0){pool=RELICS.filter(function(r){return!ownedIds[r.id]});pool=shuf(pool);}
      var newR=pool.length>0?pool.pop():null;
      if(newR)g.relics.push(newR);
      rebuildPlayerStats(g);
      pushLimited(g.floatTexts,{x:W/2,y:H/2+20,text:"替换了 "+removed.name,life:90,maxLife:90,reason:"merchant"},LIMITS.floatTexts);
    }else if(card.dataset.choice==="hp"){
      if(p.hp<=30){
        pushLimited(g.floatTexts,{x:W/2,y:H/2+20,text:"生命不足",life:90,maxLife:90,reason:"merchant"},LIMITS.floatTexts);
        el._choiceLocked=false;return;
      }
      p.hp-=30;
      var ownedIds2={};g.relics.forEach(function(r){ownedIds2[r.id]=1});
      var pool2=g.relicPool.filter(function(r){return!ownedIds2[r.id]});
      if(pool2.length===0){pool2=RELICS.filter(function(r){return!ownedIds2[r.id]});pool2=shuf(pool2);}
      var extraR=pool2.length>0?pool2.pop():null;
      if(extraR)g.relics.push(extraR);
      rebuildPlayerStats(g);
      pushLimited(g.floatTexts,{x:W/2,y:H/2+20,text:"-30HP 获得遗物",life:90,maxLife:90,reason:"merchant"},LIMITS.floatTexts);
      spawnInk(g,p.x,p.y,8,"moss");
    }
    g.merchant.used=true;snd("merchantTrade");
    spawnInk(g,p.x,p.y,10,"accent");
    popupEl.style.display="none";
    g.state="playing";
  };
}

// ════════════════════════════════════════════════════════════════
// § GAME FLOW — end screen, weapon select, start, curse, run, pause, main loop, init
// ════════════════════════════════════════════════════════════════

function showEnd(g){
  if(g.ended)return;g.ended=true;
  var newAch=metaRecordRun(g);
  if(window.GameSound)GameSound.stopAmbient();
  if(newAch&&newAch.length>0)snd("achievementUnlock");
  snd("gameOver");
  // Show boss portrait on end screen
  var ep=document.getElementById("endPortrait");
  if(ep&&g.bossKilled&&window._bossPortraitBase){
    bossT=g.bossType||"boss";
    var epSrc=window._bossPortraitBase+"portrait-"+bossT+".png";
    var epi=new Image();epi.onload=function(){ep.src=epSrc};epi.onerror=function(){ep.removeAttribute("src")};epi.src=epSrc;
  }else if(ep){ep.removeAttribute("src")}
  var won=g.state==="victory";
  var bossT=g.bossType||"boss";
  var diffLabel={normal:"平常",hard:"险途",nightmare:"噩梦"}[g.diff]||"平常";
  var diffColor={normal:"var(--ash)",hard:"var(--accent)",nightmare:"#c4523d"}[g.diff]||"var(--ash)";
  var secs=Math.floor(g.time/60);var mins=Math.floor(secs/60);secs=secs%60;
  var timeStr=(mins<10?"0":"")+mins+":"+(secs<10?"0":"")+secs;
  var subtitle=won?(bossT==="moguiwang"?"墨鬼王消散了。你从墨渊中走出，手中还握着那支笔。":
    g.diff==="nightmare"?"噩梦地宫，一命通关，万邪辟易。":
    g.diff==="hard"?"险途已清，胆识过人。":
    "地宫已清，你的名号将记在走阴录上。"):
    (bossT==="moguiwang"?"墨鬼王吞噬了一切。地宫之下，再无光明。":
    g.diff==="nightmare"?"噩梦未竟，魂散地宫。":
    g.diff==="hard"?"险途折戟，来日再战。":
    "纸灰掩面，你的走阴之路到此为止。");
  var el=document.getElementById("endTitle");if(el)el.textContent=won?"走阴完毕":"魂归黄泉";
  el=document.getElementById("endSubtitle");if(el)el.textContent=subtitle;
  var evo=(g.evolution?g.evolution.name:"无")+(g.evolution2?" + "+g.evolution2.name:"")+(g.evolution3?" + "+g.evolution3.name:"");
  var buildLine=g.weapon.name+" → "+evo;
  var relicNames=g.relics.map(function(r){return r.name}).join(" · ");
  var buildRoute=buildEndRoute(g);
  var grade=calcGrade(g);
  var gradeColors={S:"#c4523d","甲":"var(--accent)","乙":"var(--ink-soft)","丙":"var(--ash)","丁":"var(--ash)"};
  var isNewBest=g.wave>=meta.bestWave;
  var relicCount=Object.keys(meta.relicsDiscovered||{}).length;
  var prevBest=meta.bestWave;
  var bestCompare="";
  if(meta.totalRuns>1){
    if(g.wave>prevBest)bestCompare="突破了过往最佳（"+prevBest+"波）！";
    else if(g.wave===prevBest&&won)bestCompare="追平了最佳记录。";
    else if(g.wave<prevBest)bestCompare="未及最佳（"+prevBest+"波）。";
  }
  var deathLine=!won&&g.deathCause?"<br><span style='color:#c4523d'>死因：</span>"+g.deathCause:"";
  el=document.getElementById("endStats");
  if(el)el.innerHTML=
    "<div class='end-grade' style='font-family:var(--title-face);font-size:2.4rem;color:"+(gradeColors[grade]||"var(--ink)")+
    ";margin-bottom:8px;letter-spacing:0.1em'>"+grade+"</div>"+
    "<span style='color:"+diffColor+";font-weight:600'>"+diffLabel+"</span> · 历时 "+timeStr+
    " · 斩祟 "+g.kills+" · 波次 "+g.wave+"/"+WAVE_BUDGETS.length+" · 遗物 "+g.relics.length+"件"+
    "<br><span class='end-build'>"+buildLine+"</span>"+
    "<br><span class='end-route'>构筑："+buildRoute+"</span>"+
    (relicNames?"<br><span class='end-relics'>"+relicNames+"</span>":"")+
    "<br><span style='font-size:0.82rem;color:var(--ink-soft);margin-top:4px;display:inline-block'>"+
    "总伤害 "+g.totalDmg+" · 场均 "+(g.kills>0?Math.round(g.totalDmg/g.kills):0)+" · 受伤 "+g.totalDmgTaken+" · 治疗 "+g.totalHealed+" · 暴击 "+g.critKills+" · 最高连斩 "+g.maxCombo+" · 闪避 "+g.dodgeKills+" · 精英击杀 "+g.eliteKills+
    "</span>"+
    deathLine+
    (isNewBest?"<br><span style='color:var(--accent);font-weight:600'>新纪录！</span>":"")+
    (bestCompare?"<br><span style='font-size:0.78rem;color:var(--ash)'>"+bestCompare+"</span>":"")+
    (newAch&&newAch.length>0?"<div style='margin-top:8px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.08)'>"+
      "<span style='font-size:0.82rem;color:var(--accent);font-weight:600'>解锁成就：</span>"+
      newAch.map(function(a){return"<span style='display:inline-block;margin:2px 4px;padding:1px 6px;border:1px solid var(--accent);border-radius:3px;font-size:0.78rem;color:var(--accent)'>"+a.name+"</span>"}).join("")+
      "</div>":"")+
    "<br><span style='font-size:0.78rem;color:var(--ash);margin-top:6px;display:inline-block'>"+
    "累计 "+meta.totalRuns+" 次走阴 · 斩祟 "+meta.totalKills+" · 最高连斩 "+meta.bestCombo+" · 图鉴 "+relicCount+"/"+RELICS.length+
    " · 成就 "+Object.keys(meta.achievements||{}).length+"/"+ACHIEVEMENTS.length+"</span>";
  el=document.getElementById("gameOver");if(el)el.style.display="";
}

function setupWeaponSelect(){
  var el=document.getElementById("weaponChoices");
  if(!el)return;
  el.innerHTML=WEAPONS.map(function(w){
    return'<div class="weapon-pick" data-weapon="'+w.id+'" data-icon="'+w.id+'"><h3><span class="ink-icon"></span>'+w.name+'</h3>'+
      '<div class="weapon-pick__tone">'+w.tone+'</div><p>'+w.blurb+'</p>'+
      '<div class="tag-row">'+w.tags.map(function(t){return'<span class="tag">'+t+'</span>'}).join("")+'</div></div>'}).join("");
  el.onclick=function(ev){var card=ev.target.closest?ev.target.closest("[data-weapon]"):null;if(!card)return;startGame(card.dataset.weapon)};
  el.onmouseover=function(ev){var card=ev.target.closest?ev.target.closest("[data-weapon]"):null;if(card)snd("uiBlip")};
  // Try loading weapon icons
  if(window._weaponIconBase){
    var wCards=el.querySelectorAll("[data-weapon]");
    wCards.forEach(function(card){
      var wid=card.dataset.weapon;
      var iconSlot=card.querySelector(".ink-icon");
      if(!iconSlot)return;
      var img=new Image();
      img.className="weapon-icon";
      img.onload=function(){
        iconSlot.textContent="";
        iconSlot.appendChild(img.cloneNode());
      };
      img.onerror=function(){};
      img.src=window._weaponIconBase+"ui-weapon-"+wid+"-48.png";
    });
  }
  var tb=document.getElementById("startBtn");
  if(tb)tb.onclick=function(){
    var ts=document.getElementById("titleScreen");if(ts)ts.style.display="none";
    var ws=document.getElementById("weaponSelect");if(ws)ws.style.display="";
  };
  // Mute button
  var muteBtn=document.getElementById("muteBtn");
  if(muteBtn){
    var _muted=localStorage.getItem("mosui_muted")==="1";
    muteBtn.textContent=_muted?"🔇 静音":"🔊 音效";
    muteBtn.onclick=function(){
      _muted=!_muted;
      localStorage.setItem("mosui_muted",_muted?"1":"0");
      muteBtn.textContent=_muted?"🔇 静音":"🔊 音效";
      if(window.GameSound){
        if(_muted)GameSound.setVolume(0);else{
          var v=parseFloat(localStorage.getItem("mosui_vol")||"0.6");GameSound.setVolume(v)}}
    };
    if(_muted&&window.GameSound)GameSound.setVolume(0);
  }
  // Show meta stats on title screen
  var desc=document.querySelector?document.querySelector(".title-screen__desc"):null;
  if(desc&&meta.totalRuns>0){
    var relicCount=Object.keys(meta.relicsDiscovered||{}).length;
    var clearedNames=Object.keys(meta.weaponsCleared||{});
    var achCount=Object.keys(meta.achievements||{}).length;
    desc.innerHTML="你扮演一名替亡者走阴的夜行客，<br>手持法器深入地宫，斩妖除祟。"+
      "<br><span style='font-size:0.82rem;color:rgba(163,58,45,0.7);margin-top:4px;display:inline-block'>"+
      "走阴 "+meta.totalRuns+" 次 · 斩祟 "+meta.totalKills+" · 最高 "+meta.bestWave+" 波 · 图鉴 "+relicCount+"/"+RELICS.length+
      (meta.bestGrade?" · 最佳 "+meta.bestGrade:"")+
      "</span>";
  }
  // Achievement badges
  var achRow=document.getElementById("achRow");
  if(achRow&&ACHIEVEMENTS){
    var unlockedAch=ACHIEVEMENTS.filter(function(a){return meta.achievements[a.id]});
    if(unlockedAch.length>0){
      achRow.style.display="";
      achRow.innerHTML=unlockedAch.slice(-6).map(function(a){
        return'<span class="ach-badge" title="'+a.name+': '+a.desc+'">'+a.name+'</span>'}).join("");
    }
  }
  // Weapon mastery
  var wmEl=document.getElementById("weaponMastery");
  if(wmEl&&WEAPONS){
    var wmParts=[];
    WEAPONS.forEach(function(w){
      var cleared=meta.weaponsCleared[w.id]||0;
      var bestWave=meta.weaponBestWave[w.id]||0;
      if(cleared>0||bestWave>0){
        var cls=cleared>0?"wm-badge is-cleared":"wm-badge";
        wmParts.push('<span class="'+cls+'" title="'+w.name+'">'+w.name.slice(0,3)+':'+cleared+'通'+bestWave+'波</span>');
      }
    });
    if(wmParts.length>0){wmEl.style.display="";wmEl.innerHTML=wmParts.join("")}
  }
  // Unlock indicators
  var unlockHint=document.getElementById("unlockHint");
  if(unlockHint&&meta.unlocks){
    var hints=[];
    if(meta.unlocks.startRelic)hints.push("起始遗物已解锁");
    if(meta.unlocks.goldInk)hints.push("金墨色已解锁");
    if(hints.length>0)unlockHint.textContent=hints.join(" · ");
  }
}

function startGame(wid){
  IS_TOUCH=needsMobileUI();
  var diffEl=document.querySelector('input[name="diff"]:checked');
  var diff=diffEl?diffEl.value:"normal";
  _hide("weaponSelect");_show("gameContainer");_show("pauseHint");
  if(window._loadLog)window._loadLog("startGame("+wid+","+diff+")");
  G=newGame(wid,diff);
  document.body.classList.add("game-active");
  document.body.classList.toggle("is-mobile-ui",IS_TOUCH);
  // Reset boss portraits to prevent old portrait persisting
  var bp=document.getElementById("bossPortrait");
  var ep=document.getElementById("endPortrait");
  if(bp)bp.removeAttribute("src");
  if(ep)ep.removeAttribute("src");
  if(!_loopActive){_loopActive=true;requestAnimationFrame(loop);}
  // Force canvas reflow after game container becomes visible
  if(window._fitCanvas)window._fitCanvas();
  // Ensure mobile controls initialized (Capacitor WebView timing safety)
  if(IS_TOUCH&&!window._mobileInput && typeof window.__forceMobileInit==="function"){window.__forceMobileInit();if(window._loadLog)window._loadLog("game.js触发摇杆初始化 mobileInput="+!!window._mobileInput);}
  else if(window._loadLog&&window._mobileInput)window._loadLog("摇杆已在游戏开始前就绪");
  if(window.GameSound){try{GameSound.init()}catch(e){if(window._loadLog)window._loadLog("音效初始化失败:"+e.message)}}
  // Show curse selection before first wave
  showCurse(G);
}

function showCurse(g){
  if(window._loadLog)window._loadLog("showCurse() state="+g.state);
  if(!CURSES||CURSES.length===0){beginRun(g);return}
  var popup=document.getElementById("cursePopup");
  var choices=document.getElementById("curseChoices");
  if(!popup||!choices){beginRun(g);return}
  var pool=shuf(CURSES.slice()).slice(0,3);
  choices.innerHTML=pool.map(function(c,i){
    return'<div class="relic-pick curse-card" data-curse="'+i+'"><h4>'+c.name+'</h4>'+
      '<div class="relic-pick__type"><span class="relic-type-badge">誓印</span> '+c.tags.join(" · ")+'</div>'+
      '<p>'+c.desc+'</p></div>'}).join("")+
    '<div class="relic-pick curse-card curse-skip" data-curse="skip" style="text-align:center;opacity:0.6"><h4>不立誓</h4><p>原样进入地宫</p></div>';
  popup.style.display="";
  g.state="prep";
  // Auto-dismiss after 20s if no interaction (desktop + mobile)
  var autoDismissT=setTimeout(function(){
    if(popup.style.display!=="none"&&G===g){
      choices.onclick=null;popup.style.display="none";beginRun(g)}
  },20000);
  choices.onclick=function(ev){
    if(autoDismissT)clearTimeout(autoDismissT);
    var target=ev.target;
    // Defensive: text node → parent
    if(target&&target.nodeType===3)target=target.parentElement;
    var card=target&&target.closest?target.closest("[data-curse]"):null;
    if(!card)return;
    var idx=card.dataset.curse;
    if(idx!=="skip"){
      var ci=parseInt(idx);
      if(ci>=0&&ci<pool.length){
        var curse=pool[ci];
        curse.fn(g.player);g.curse=curse;
        snd("curseSelect");snd("relicPickup");spawnInk(g,g.player.x,g.player.y,8,"fire")}
    }
    choices.onclick=null;
    popup.style.display="none";beginRun(g)};
}

function beginRun(g){
  if(window._loadLog)window._loadLog("beginRun() → startWave");
  g.state="playing";
  var p=g.player;
  var startNotices=[];
  if(p.maxHpOverride>0){p.maxHp=p.maxHpOverride;p.hp=Math.min(p.hp,p.maxHp)}
  if(p.maxHpMult&&p.maxHpMult<1){p.maxHp=Math.floor(p.maxHp*p.maxHpMult);p.hp=Math.min(p.hp,p.maxHp)}
  // Starter relic from meta-unlock
  if(meta.unlocks.startRelic&&STARTER_RELICS){
    var srPool=STARTER_RELICS.filter(function(id){return !g.relics.some(function(r){return r.id===id})});
    if(srPool.length>0){
      var srId=srPool[Math.floor(Math.random()*srPool.length)];
      var sr=RELICS.filter(function(r){return r.id===srId})[0];
      if(sr){g.relics.push(sr);sr.fn(p);
        startNotices.push("起始遗物: "+sr.name)}
    }
  }
  // extra start relics from curse — use saved count to guard against mutation
  var _extraCount=p.extraStartRelics;
  if(_extraCount>0){
    p.extraStartRelics=0;
    for(var esi=0;esi<_extraCount;esi++){
      try{var rc=pickRelicChoices(g)}catch(e){rc=[]}
      if(rc&&rc.length>0){var r=rc[0];g.relics.push(r);try{r.fn(p)}catch(e){}
        startNotices.push("誓印赐物: "+r.name)}
      else {p.extraStartRelics=Math.max(p.extraStartRelics,_extraCount-esi-1)}}}
  startWave(g);
  for(var sni=0;sni<startNotices.length;sni++){
    pushLimited(g.floatTexts,{x:W/2,y:H/2-50+sni*22,text:startNotices[sni],life:120,maxLife:120,reason:"hint"},LIMITS.floatTexts)
  }
  updateHUD(g);canvas.focus();
  setTimeout(function(){var h=document.getElementById("controlsHint");if(h)h.classList.add("is-hidden")},6000);
}

function togglePause(){
  if(!G)return;
  // Don't pause while overlays are active
  var relicPopup=document.getElementById("relicPopup");
  var cursePopup=document.getElementById("cursePopup");
  if((relicPopup&&relicPopup.style.display!=="none")||(cursePopup&&cursePopup.style.display!=="none"))return;
  var el=document.getElementById("pauseOverlay");
  if(!el)return;
  if(G.state==="playing"){G.state="paused";el.style.display="";
    var ps=document.getElementById("pauseStats");
    if(ps)ps.textContent="第 "+(G.wave+1)+" 波 · 斩祟 "+G.kills+" · 遗物 "+G.relics.length+"件 · FPS "+Math.round(G.perf?G.perf.fps:0);
    var savedVol=0.6;
    try{savedVol=parseFloat(localStorage.getItem("mosui_vol")||"0.6")}catch(e){}
    var vs=document.getElementById("volMaster");
    if(vs)vs.value=Math.round(savedVol*100);
    if(window.GameSound)GameSound.setVolume(Math.min(0.1,savedVol));
  }else if(G.state==="paused"){G.state="playing";el.style.display="none";
    var sv=0.6;
    try{sv=parseFloat(localStorage.getItem("mosui_vol")||"0.6")}catch(e){}
    if(window.GameSound)GameSound.setVolume(sv);
  }
}

function _hide(id){var e=document.getElementById(id);if(e)e.style.display="none"}
function _show(id){var e=document.getElementById(id);if(e)e.style.display=""}
function restartRun(){
  if(!G)return;
  if(window.GameSound)GameSound.stopAmbient();
  var wid=G.weapon.id, diff=G.diff;
  _hide("pauseOverlay");_hide("relicPopup");_hide("cursePopup");
  document.body.classList.add("game-active");
  document.body.classList.toggle("is-mobile-ui",IS_TOUCH);
  G=null;
  G=newGame(wid,diff);
  if(window.GameSound)GameSound.init();
  showCurse(G);
}

function quitToTitle(){
  if(window.GameSound)GameSound.stopAmbient();
  _hide("pauseOverlay");_hide("gameOver");_hide("gameContainer");
  _hide("pauseHint");_hide("relicPopup");_hide("cursePopup");
  var _tip=document.querySelector(".relic-tooltip");if(_tip)_tip.remove();
  document.body.classList.remove("game-active");
  document.body.classList.remove("is-mobile-ui");
  G=null;keys={};_loopActive=false;
  var ts=document.getElementById("titleScreen");
  if(ts)ts.style.display="";
  setupWeaponSelect();
}

var _loopActive=true;
var IS_TOUCH=needsMobileUI();
function loop(){
  var now=performance.now();
  if(G){
    if(G.perf&&G.perf.lastT>0){var dt=now-G.perf.lastT;
      G.perf.fps=G.perf.fps*0.9+(dt>0?1000/dt:60)*0.1}
    if(G.perf)G.perf.lastT=now;
    try{
      if(G.state==="playing"||G.state==="dying"||G.state==="victory")update(G);
    }catch(err){console.error("update error:",err.message)}
    try{
      render(G);
    }catch(err){G._renderErrors=(G._renderErrors||0)+1;
	      if(G._renderErrors<=3)console.error("render error:",err.message)}
    try{
      if(G.state==="over"||(G.state==="victory"&&G.freezeT<=0))showEnd(G);
    }catch(err){console.error("showEnd error:",err.message)}
  }
  if(_loopActive)requestAnimationFrame(loop);
}

function init(){
  if(window._gameInitialized)return;window._gameInitialized=true;
  if(window._loadLog)window._loadLog("init() 开始...");
  canvas=document.getElementById("gameCanvas");
  if(!canvas){console.error("gameCanvas not found");return}
  ctx=canvas.getContext("2d");
  if(!ctx){console.error("canvas 2d context failed");return}
  buildBg();
  window.addEventListener("keydown",function(e){keys[e.key.toLowerCase()]=true;
    if(G&&G.usedMoveKey!==undefined){var k=e.key.toLowerCase();
      if(k==="w"||k==="a"||k==="s"||k==="d"||k==="arrowup"||k==="arrowdown"||k==="arrowleft"||k==="arrowright")G.usedMoveKey=true;}
    if(e.key==="Escape"||e.key==="p"||e.key==="P"){e.preventDefault();togglePause();}
    if((e.key===" "||e.key==="Shift")&&G&&G.state==="playing"){
      e.preventDefault();G.player.dodgeQueued=true;
    }
    if(e.key==="ArrowUp"||e.key==="ArrowDown"||e.key==="ArrowLeft"||e.key==="ArrowRight")e.preventDefault();
    if(e.key.toLowerCase()==="t")window._showDebug=!window._showDebug;
    if(e.key.toLowerCase()==="f"){e.preventDefault();var gf=document.querySelector(".game-frame");if(gf){if(document.fullscreenElement)document.exitFullscreen();else gf.requestFullscreen().catch(function(){})}}
    if(e.key==="F3"){e.preventDefault();if(G)G._showFps=!G._showFps}
    if(e.key.toLowerCase()==="h"){var ch=document.getElementById("controlsHint");
      if(ch)ch.classList.toggle("is-hidden")}
    if(e.key.toLowerCase()==="r"&&G){
      if(G.state==="over"||G.state==="victory"){var rb=document.getElementById("restartBtn");if(rb)rb.click()}
      else if(G.state==="playing"||G.state==="paused"){
        var now=Date.now();
        if(G._lastRTry&&now-G._lastRTry<600){quickRestart(G);G._lastRTry=0}
        else{G._lastRTry=now;pushLimited(G.floatTexts,{x:W/2,y:H/2,text:"再按R重开",life:50,maxLife:50,reason:"hint"},LIMITS.floatTexts)}
      }}});
  window.addEventListener("keyup",function(e){keys[e.key.toLowerCase()]=false});
  window.addEventListener("blur",function(){keys={};mouse.down=false});
  window.addEventListener("resize",function(){invalidateCanvasRect()});
  document.addEventListener("fullscreenchange",function(){invalidateCanvasRect()});
  // Android back button (Capacitor)
  try{
    var Capacitor=window.Capacitor;
    if(Capacitor&&Capacitor.App){
      Capacitor.App.addListener("backButton",function(e){
        if(!G){Capacitor.App.exitApp();return}
        if(G.state==="playing"){togglePause();return}
        if(G.state==="paused"){togglePause();return}
        if(G.state==="over"||G.state==="victory"){
          var rb=document.getElementById("restartBtn");if(rb)rb.click();return}
        Capacitor.App.exitApp();
      });
    }
  }catch(e){}
  window.addEventListener("mousemove",function(e){mouse.x=e.clientX;mouse.y=e.clientY;window._cursorTimer=Date.now();canvas.style.cursor="default"});
  var _cursorHideInterval=setInterval(function(){
    if(G&&(G.state==="playing"||G.state==="paused")&&window._cursorTimer&&Date.now()-window._cursorTimer>2000)canvas.style.cursor="none";
  },500);
  window.addEventListener("mousedown",function(e){if(e.button===0){mouse.down=true;if(window.GameSound)GameSound.init()}});
  window.addEventListener("mouseup",function(e){if(e.button===0)mouse.down=false});
  canvas.addEventListener("contextmenu",function(e){e.preventDefault()});
  // touch support — delegates to mobile-controls.js when active
  canvas.addEventListener("touchstart",function(e){
    if(window._mobileInput){if(window.GameSound)GameSound.init();return}
    e.preventDefault();
    var t=e.touches[0];if(t){mouse.x=t.clientX;mouse.y=t.clientY;mouse.down=true}
    if(window.GameSound)GameSound.init()},{passive:false});
  canvas.addEventListener("touchmove",function(e){
    if(window._mobileInput)return;
    e.preventDefault();
    var t=e.touches[0];if(t){mouse.x=t.clientX;mouse.y=t.clientY}},{passive:false});
  canvas.addEventListener("touchend",function(e){
    if(window._mobileInput)return;
    e.preventDefault();mouse.down=false},{passive:false});
  canvas.addEventListener("touchcancel",function(e){mouse.down=false});
  var _restartBtn=document.getElementById("restartBtn");if(_restartBtn)_restartBtn.addEventListener("click",function(){
    var _go=document.getElementById("gameOver");if(_go)_go.style.display="none";
    var _gc=document.getElementById("gameContainer");if(_gc)_gc.style.display="none";
    var _ph=document.getElementById("pauseHint");if(_ph)_ph.style.display="none";
    var _ws=document.getElementById("weaponSelect");if(_ws)_ws.style.display="";
    keys={};G=null;document.body.classList.remove("game-active")});
  var _copyBtn=document.getElementById("copyResultBtn");if(_copyBtn)_copyBtn.addEventListener("click",function(){
    var _st=document.getElementById("endStats");var _txt=_st?_st.innerText:"";
    var _ti=document.getElementById("endTitle");var _sub=document.getElementById("endSubtitle");
    var lines=[_ti?_ti.innerText:"",_sub?_sub.innerText:"",_txt].filter(function(l){return l});
    navigator.clipboard.writeText(lines.join("\n")).then(function(){_copyBtn.textContent="已复制";setTimeout(function(){_copyBtn.textContent="复制战绩"},1500)})
  });
  var _resumeBtn=document.getElementById("resumeBtn");if(_resumeBtn)_resumeBtn.addEventListener("click",togglePause);
  // Mobile HTML pause button
  var _mobilePauseBtn=document.getElementById("mobilePauseBtn");
  if(_mobilePauseBtn)_mobilePauseBtn.addEventListener("click",function(e){e.stopPropagation();togglePause()});
  // Mobile HTML dodge button (touch-only: no mousedown to avoid double fire)
  var _mobileDodgeBtn=document.getElementById("mobileDodgeBtn");
  var _isTouchDevice=IS_TOUCH;
  if(_mobileDodgeBtn){
    _mobileDodgeBtn.addEventListener("touchstart",function(e){e.preventDefault();e.stopPropagation();requestMobileDodge()},{passive:false});
    _mobileDodgeBtn.addEventListener("touchend",function(e){e.preventDefault();
      if(window._mobileInput)window._mobileInput.dodging=false},{passive:false});
    _mobileDodgeBtn.addEventListener("touchcancel",function(){
      if(window._mobileInput)window._mobileInput.dodging=false});
    if(!_isTouchDevice){
      _mobileDodgeBtn.addEventListener("mousedown",function(){
        requestMobileDodge()});
      _mobileDodgeBtn.addEventListener("mouseup",function(){
        if(window._mobileInput)window._mobileInput.dodging=false});
    }
  }
  // Volume slider
  var volSlider=document.getElementById("volMaster");
  if(volSlider){
    var savedVol=0.6;
    try{savedVol=parseFloat(localStorage.getItem("mosui_vol")||"0.6")}catch(e){}
    volSlider.value=Math.round(savedVol*100);
    volSlider.addEventListener("input",function(){
      var v=parseInt(volSlider.value)/100;
      try{localStorage.setItem("mosui_vol",String(v))}catch(e){}
      if(window.GameSound)GameSound.setVolume(v);
    });
  }
  // Screen shake intensity slider
  var shSlider=document.getElementById("shakeIntensity");
  if(shSlider){
    var savedSh=0.8;
    try{savedSh=parseFloat(localStorage.getItem("mosui_shake")||"0.8")}catch(e){}
    shSlider.value=Math.round(savedSh*100);
    shSlider.addEventListener("input",function(){
      var s=parseInt(shSlider.value)/100;
      try{localStorage.setItem("mosui_shake",String(s))}catch(e){}
      if(G)G._shakeIntensity=s;
    });
    if(G)G._shakeIntensity=savedSh;
  }
  // Joystick sensitivity slider (mobile only)
  var sensRow=document.getElementById("sensRow");
  var sensSlider=document.getElementById("joystickSens");
  var isTouchDevice=IS_TOUCH;
  if(sensRow&&isTouchDevice)sensRow.style.display="";
  if(sensSlider){
    try{var ss=JSON.parse(localStorage.getItem("mosui_ctrl_settings")||"{}");if(ss.sensitivity!=null)sensSlider.value=Math.round(ss.sensitivity*100)}catch(e){}
    sensSlider.addEventListener("input",function(){
      var val=parseInt(sensSlider.value)/100;
      try{var s=JSON.parse(localStorage.getItem("mosui_ctrl_settings")||"{}");s.sensitivity=val;localStorage.setItem("mosui_ctrl_settings",JSON.stringify(s))}catch(e){}
      if(window._mobileInput&&window._mobileInput.sensitivity!==undefined)window._mobileInput.sensitivity=val;
    });
  }
  // Pause restart button
  var pauseRestartBtn=document.getElementById("pauseRestartBtn");
  if(pauseRestartBtn)pauseRestartBtn.addEventListener("click",function(){restartRun()});
  // Pause quit to title button
  var pauseQuitBtn=document.getElementById("pauseQuitBtn");
  if(pauseQuitBtn)pauseQuitBtn.addEventListener("click",function(){quitToTitle()});
  // Difficulty radio visual feedback (fallback for browsers without :has())
  if(document.querySelectorAll){
    var diffRadios=document.querySelectorAll('input[name="diff"]');
    if(diffRadios.length>0){
      function updateDiffLabels(){
        diffRadios.forEach(function(r){
          var label=r.closest(".difficulty-option");
          if(label)label.classList.toggle("is-selected",r.checked);
        });
      }
      diffRadios.forEach(function(r){r.addEventListener("change",updateDiffLabels)});
      updateDiffLabels();
    }
  }
  // Load art assets — graceful fallback, no error if files missing
  try{(function(){
    var _artBase="assets/";
    function tryImg(id,path){
      var el=document.getElementById(id);if(!el)return;
      var img=new Image();
      img.onload=function(){el.src=path;if(window._loadLog)window._loadLog("美术:"+path+" ✓")};
      img.onerror=function(){};
      img.src=path;
    }
    // Cover background
    tryImg("coverArt",_artBase+"concept/cover_main.png");
    // Title calligraphy
    var titleEl=document.getElementById("titleArt");
    if(titleEl){
      var ti=new Image();
      ti.onload=function(){
        titleEl.src=ti.src;
        // Hide text node that follows
        var parent=titleEl.parentNode;
        var textNodes=[];
        for(var ci=0;ci<parent.childNodes.length;ci++){
          if(parent.childNodes[ci].nodeType===3&&parent.childNodes[ci].textContent.indexOf("墨")>=0)
            textNodes.push(parent.childNodes[ci]);
        }
        textNodes.forEach(function(n){parent.removeChild(n)});
      };
      ti.onerror=function(){};
      ti.src=_artBase+"ui/title_calligraphy.png";
    }
    // Subtitle calligraphy
    tryImg("subArt",_artBase+"ui/subtitle_calligraphy.png");
    // Boss portraits — lazy loaded when boss appears
    window._bossPortraitBase=_artBase+"portraits/";
    // Preload boss portrait images for canvas rendering
    window._bossPortraitImgs={};
    ["boss","mojiangjun","moguiwang"].forEach(function(bt){
      var bpi=new Image();
      bpi.onload=function(){window._bossPortraitImgs[bt]=bpi;if(window._loadLog)window._loadLog("肖像:"+bt+" ✓")};
      bpi.onerror=function(){};
      bpi.src=window._bossPortraitBase+"portrait-"+bt+".png";
    });
    window._weaponIconBase=_artBase+"ui/";
  })()}catch(e){}
  setupWeaponSelect();if(window._loadLog)window._loadLog("init() 完成 ✓ loop启动");loop();
  // Dismiss Capacitor splash screen — try multiple methods
  try{var _sp=window.Capacitor&&(Capacitor.Plugins&&Capacitor.Plugins.SplashScreen)||(Capacitor.SplashScreen);
    if(_sp&&_sp.hide)_sp.hide({fadeOutDuration:200})}catch(e){}
  // Fallback: force dismiss after 3s no matter what
  setTimeout(function(){try{var _sp2=window.Capacitor&&(Capacitor.Plugins&&Capacitor.Plugins.SplashScreen);
    if(_sp2&&_sp2.hide)_sp2.hide()}catch(e){}},3000);
}

function safeInit(){
  try{init()}
  catch(e){
    console.error("init() failed:",e.message,e.stack);
    var l=document.getElementById("loadingScreen");if(l)l.style.display="none";
    var d=document.createElement("div");
    d.style.cssText="position:fixed;inset:0;background:#f1e6d4;color:#171310;display:flex;align-items:center;justify-content:center;font:16px sans-serif;padding:20px;text-align:center;z-index:99999";
    d.textContent="加载失败: "+e.message;
    document.body.appendChild(d);
  }
}

document.addEventListener("visibilitychange",function(){
  if(document.hidden&&G&&G.state==="playing"){togglePause()}
  if(!document.hidden&&window.GameSound){try{GameSound.init()}catch(e){}}
});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",safeInit);else safeInit();
})();
