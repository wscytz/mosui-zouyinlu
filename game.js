(function(){
"use strict";

function dstSq(a,b){var dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy}
function dst(a,b){return Math.sqrt(dstSq(a,b))}
function ang(a,b){return Math.atan2(b.y-a.y,b.x-a.x)}
function collideSq(a,b,extraR){var r=(a.r||0)+(b.r||0)+(extraR||0);return dstSq(a,b)<r*r}
function cl(v,lo,hi){return v<lo?lo:v>hi?hi:v}
function rn(a,b){return a+Math.random()*(b-a)}
function ri(a,b){return Math.floor(rn(a,b+1))}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function shuf(a){for(var i=a.length-1;i>0;i--){var j=ri(0,i);var t=a[i];a[i]=a[j];a[j]=t}return a}
function moveScale(p){var m=p.stats.spd;if(p.killSpdTimer>0)m+=0.25;return m}
function snd(name){if(window.GameSound&&window.GameSound.play)GameSound.play(name)}
function pushLimited(list,item,max){if(list.length>=max)list.splice(0,list.length-max+1);list.push(item)}
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
  return p>0.95?0.25:p>0.85?0.4:p>0.72?0.6:p>0.55?0.8:1;
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
}
function addFire(g,f){
  f.maxLife=f.life;
  if(f.tickOffset==null)f.tickOffset=(g.time+g.fires.length)%20;
  if(f.healTickOffset==null)f.healTickOffset=(g.time+g.fires.length*3)%40;
  pushLimited(g.fires,f,LIMITS.fires)
}
function addEProj(g,ep){pushLimited(g.eProj,ep,LIMITS.eProj)}
function shake(g,dur,amp){g.shakeT=Math.max(g.shakeT,dur);g.shakeAmp=Math.max(g.shakeAmp||0,amp)}
function screenFlash(c,w,h,a,iC,oC,iR,oR){c.globalAlpha=a;var g=c.createRadialGradient(w/2,h/2,w*iR,w/2,h/2,w*oR);g.addColorStop(0,iC);g.addColorStop(1,oC);c.fillStyle=g;c.fillRect(0,0,w,h)}
function pushAttack(g,atk){pushLimited(g.attacks,atk,LIMITS.attacks)}
function spawnJudgment(g,e,reason){
  var text=pick(JUDGMENTS);
  pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:text,life:50,maxLife:50,reason:reason},LIMITS.floatTexts);
}

var keys={},mouse={x:W/2,y:H/2,down:false},nextEnemyId=1;
var canvas,ctx,G=null,bgCanvas=null;

// --- Meta-progression (localStorage) ---
var META_KEY="mosui_meta";
function loadMeta(){
  try{var d=JSON.parse(localStorage.getItem(META_KEY));if(d&&d.version===2)return d}catch(e){}
  return{version:2,totalKills:0,totalRuns:0,bestWave:0,bestGrade:"",bossKills:0,
    weaponsCleared:{},relicsDiscovered:{},cursesUsed:{},mojiangjunKills:0}}
function saveMeta(m){try{localStorage.setItem(META_KEY,JSON.stringify(m))}catch(e){}}
var meta=loadMeta();
function metaRecordRun(g){
  var won=g.state==="victory";
  meta.totalRuns++;meta.totalKills+=g.kills;
  if(g.wave>meta.bestWave)meta.bestWave=g.wave;
  var grade=calcGrade(g);
  if(grade&&!meta.bestGrade||gradePriority(grade)>gradePriority(meta.bestGrade))meta.bestGrade=grade;
  if(won){var wid=g.weapon.id;meta.weaponsCleared[wid]=(meta.weaponsCleared[wid]||0)+1}
  g.relics.forEach(function(r){meta.relicsDiscovered[r.id]=true});
  if(g.curse)meta.cursesUsed[g.curse.id]=true;
  saveMeta(meta);
}
function calcGrade(g){
  var won=g.state==="victory";var score=0;
  if(won)score+=40;score+=Math.min(g.kills,100)*0.3;score+=g.relics.length*2;
  if(g.diff==="hard")score+=10;else if(g.diff==="nightmare")score+=20;
  if(won)score+=Math.floor(g.player.hp/g.player.maxHp*10);score=Math.floor(score);
  if(score>=90)return"S";else if(score>=75)return"甲";else if(score>=60)return"乙";
  else if(score>=40)return"丙";else return"丁";
}
function gradePriority(g){var m={"S":5,"甲":4,"乙":3,"丙":2,"丁":1};return m[g]||0}

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
    dodgeT:0,dodgeDx:0,dodgeDy:0,dodgeCd:0,dodgeQueued:false,justDodgedT:0,
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
    execCritT:0,
    // curse flags
    noDodge:false,noWaveHeal:false,noEvolution:false,
    maxHpOverride:0,extraStartRelics:0,extraRelicChoice:false,
    enemyHpMult:1,allElite:false,relicPower:1,
    idleT:0}
}

var DIFF={normal:{hpM:1,spdM:1,dmgM:1},hard:{hpM:1.35,spdM:1.15,dmgM:1.25},nightmare:{hpM:1.8,spdM:1.3,dmgM:1.5}};

function newGame(wid,diff){
  _lastHp=-1;
  var w=WEAPONS.filter(function(x){return x.id===wid})[0];
  if(!w){console.warn("Invalid weapon id: "+wid+", defaulting to jian");w=WEAPONS[0];}
  nextEnemyId=1;
  return{state:"playing",weapon:w,wave:0,kills:0,time:0,diff:diff||"normal",
    shakeT:0,shakeAmp:0,shakeX:0,shakeY:0,freezeT:0,hintT:180,ended:false,dmgDir:null,slowMo:0,
    killStreak:0,killStreakT:0,relicFlash:0,critFlash:0,bossFlash:0,
    bossWaveEntrance:0,deathCircle:null,
    hints:{relic:false,evo:false,boss:false},encountered:{},
    inkWipe:0,
    player:mkPlayer(),enemies:[],attacks:[],particles:[],fires:[],eProj:[],
    relics:[],relicPool:shuf(RELICS.slice()),
    stage:null,stageDesc:"",announce:"",announceT:0,execFlash:null,evolution:null,evolution2:null,floatTexts:[],decoys:[],
    kites:[],frosts:[],waveTotal:0,waveCleared:false,waveClearT:0,
    bossType:pick(["boss","mojiangjun"]),curse:null,pendingDeathbursts:[],
    perf:{lastT:0,fps:60,pressure:0,peaks:{enemies:0,attacks:0,particles:0,fires:0,eProj:0,floatTexts:0,decoys:0,kites:0,frosts:0}}}
}

function showHint(g,key,text){
  if(g.hints[key])return;g.hints[key]=true;
  pushLimited(g.floatTexts,{x:W/2,y:H/2+60,text:text,life:150,maxLife:150,reason:"hint"},LIMITS.floatTexts);
}

function spawnP(g,x,y,type,n){
  n=Math.max(1,Math.floor(n*perfMul(g)));
  for(var i=0;i<n;i++){var a=rn(0,Math.PI*2),s=rn(1,4);
    var life=rn(18,40);
    var p={x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
      life:life,maxLife:life,size:rn(2,7),type:type};
    pushLimited(g.particles,p,LIMITS.particles)}
}

function spawnInk(g,x,y,n,col){
  n=Math.max(1,Math.floor(n*perfMul(g)));
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
  if(side===0){x=A.l+10;y=rn(A.t+20,A.b-20)}
  else if(side===1){x=A.r-10;y=rn(A.t+20,A.b-20)}
  else if(side===2){x=rn(A.l+20,A.r-20);y=A.t+10}
  else{x=rn(A.l+20,A.r-20);y=A.b-10}
  var waveScale=opts.noScale?1:(1+Math.max(0,g.wave)*WAVE_SCALE.hpPerWave);
  var dCfg=DIFF[g.diff]||DIFF.normal;
  var p=g.player;
  var hp=Math.max(1,Math.floor(t.hp*waveScale*(opts.hpMul||1)*dCfg.hpM*(p.enemyHpMult||1)));
  var spd=t.spd*(1+Math.max(0,g.wave)*WAVE_SCALE.spdPerWave)*(opts.spdMul||1)*dCfg.spdM;
  var shield=t.hasShield?Math.floor((t.shield||0)*waveScale):0;
  var diffEliteBonus=g.diff==="hard"?0.08:g.diff==="nightmare"?0.18:0;
  var eliteChance=Math.min(0.4,0.1+g.wave*0.025+diffEliteBonus);
  var elite=(g.wave>=3||p.allElite)&&!t.isBoss&&(p.allElite||Math.random()<eliteChance);
  var eliteAbility=null;
  if(elite){hp=Math.floor(hp*1.5);spd*=1.3;eliteAbility=pick(["blink","deathburst","enrage","armored"]);
    if(eliteAbility==="armored")spd*=0.7}
  if(g.enemies.length>=LIMITS.enemies)return;
  if(!g.encountered[type]&&t.tip){g.encountered[type]=true;
    pushLimited(g.floatTexts,{x:W/2,y:H/2+40,text:t.name+" — "+t.tip,life:120,maxLife:120,reason:"hint"},LIMITS.floatTexts)}
  g.enemies.push({id:nextEnemyId++,x:x,y:y,type:type,name:t.name,hp:hp,maxHp:hp,spd:spd,r:t.r,
    dmg:Math.max(1,Math.ceil(t.dmg*dCfg.dmgM)),atkR:t.atkR,atkCd:t.atkCd,col:t.col,edge:t.edge,
    ranged:!!t.ranged,pSpd:t.pSpd||0,fireTrail:!!t.fireTrail,isBoss:!!t.isBoss,
    fanShot:t.fanShot||1,charge:!!t.charge,chargeCd:t.chargeCd||100,chargeSpeed:t.chargeSpeed||4,
    bossChargeT:t.isBoss?0:undefined,bossChargeCdT:t.isBoss?120:undefined,
    bossPrepT:t.isBoss?0:undefined,bossPrepAng:0,
    chargeCdT:ri(45,105),chargeT:0,chargeVx:0,chargeVy:0,prepT:0,stageRevived:false,
    elite:elite,eliteAbility:eliteAbility,armorMult:eliteAbility==="armored"?0.5:1,
    blinkCd:480,blinkT:0,enraged:false,
    summoner:!!t.summoner,summonCd:t.summonCd||120,summonMax:t.summonMax||4,summonCdT:ri(30,80),summonCount:0,
    splitter:!!t.splitter,splitCount:t.splitCount||2,splitHpRatio:t.splitHpRatio||0.5,isSplit:!!opts.isSplit,
    hasShield:shield>0,shield:shield,maxShield:shield,shieldCd:0,shieldRegen:t.shieldRegen||300,
    cdT:0,slowT:0,fearT:0,hitFlash:0,bob:rn(0,Math.PI*2),deathT:0,desperate:!!t.desperate,
    spawnGraceT:0})
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
  }
}

function stageSpeedFactor(g,x,y){
  if(!g.stage||g.stage.id!=="ash")return 1;
  for(var i=0;i<g.stage.zones.length;i++){
    var z=g.stage.zones[i];
    var dx=x-z.x,dy=y-z.y;
    if(dx*dx+dy*dy<z.r*z.r)return 0.72;
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
  var st=g.stage,dx=st.cx-obj.x,dy=st.cy-obj.y,d=Math.sqrt(dx*dx+dy*dy);
  if(d<4||d>st.r)return;
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
  }
}

function spawnReturnInk(g,atk){
  var p=g.player,a=atk.angle!=null?atk.angle:p.facing;
  var power=Math.max(1,p.stats.returnInk||0);
  var dist=atk.range?atk.range*0.65:(atk.r||80)*0.45;
  var x=atk.x+Math.cos(a)*dist,y=atk.y+Math.sin(a)*dist,spd=5;
  pushAttack(g,{x:x,y:y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
    dmg:Math.max(1,Math.floor(atk.dmg*(0.3+power*0.08))),crit:false,r:5*p.stats.projSize,
    life:34,maxLife:34,type:"proj",bounce:true,bounced:false,pierce:false,
    hitMap:{},echo:true});
}

function addAttack(g,atk){
  var p=g.player;
  if(!atk.hitMap)atk.hitMap={};
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
  var baseFreeze=e.isBoss?22:9;
  if(e.isBoss)g.slowMo=30;
  if(baseFreeze===9&&p.killAtkTimer>0)baseFreeze=4;
  g.freezeT=Math.max(g.freezeT,baseFreeze);shake(g,e.isBoss?16:8,e.isBoss?7:4);
  g.kills++;g.killStreak++;g.killStreakT=90;
  if(g.kills===10||g.kills===25||g.kills===50||g.kills===100)snd("killMilestone");
  // kill streak milestones
  var ks=g.killStreak;
  if(ks===3){pushLimited(g.floatTexts,{x:W/2,y:H/2,text:"三连斩",life:60,maxLife:60,reason:"streak"},LIMITS.floatTexts);spawnP(g,p.x,p.y,"accent",4)}
  else if(ks===5){pushLimited(g.floatTexts,{x:W/2,y:H/2,text:"五连斩",life:70,maxLife:70,reason:"streak"},LIMITS.floatTexts);spawnP(g,p.x,p.y,"accent",8);shake(g,8,3)}
  else if(ks===10){pushLimited(g.floatTexts,{x:W/2,y:H/2,text:"十连斩",life:80,maxLife:80,reason:"streak"},LIMITS.floatTexts);spawnP(g,p.x,p.y,"accent",14);shake(g,12,5);g.relicFlash=6}
  else if(ks===20){pushLimited(g.floatTexts,{x:W/2,y:H/2,text:"百鬼夜行",life:90,maxLife:90,reason:"streak"},LIMITS.floatTexts);spawnP(g,p.x,p.y,"accent",20);shake(g,16,7);g.relicFlash=8}
  var dcol=DEATH_COLOR[e.type]||"ink";spawnInk(g,e.x,e.y,16,dcol);spawnInk(g,e.x,e.y,8,"accent");
  spawnP(g,e.x,e.y,dcol,e.isBoss?12:6);
  if(e.elite){spawnInk(g,e.x,e.y,12,"gold");for(var ei=0;ei<8;ei++){var ea=ei*Math.PI/4;
    spawnP(g,e.x+Math.cos(ea)*16,e.y+Math.sin(ea)*16,"gold",2)}
    // Elite deathburst: damage zone after frame-based delay
    if(e.eliteAbility==="deathburst"){
      pushLimited(g.floatTexts,{x:e.x,y:e.y-20,text:"爆",life:25,maxLife:25,reason:"deathburst"},LIMITS.floatTexts);
      g.pendingDeathbursts=g.pendingDeathbursts||[];
      g.pendingDeathbursts.push({x:e.x,y:e.y,dmg:Math.ceil(e.dmg*1.5),timer:30,r:50})}
  }
  // 武器特化击杀粒子
  var wt=g.weapon.type;
  if(wt==="melee"){for(var wi=0;wi<5;wi++)spawnP(g,e.x+rn(-8,8),e.y+rn(-8,8),"ink",1)}
  else if(wt==="ranged"){for(var wi=0;wi<3;wi++)spawnP(g,e.x,e.y,"moss",2)}
  else if(wt==="aoe"){for(var wi=0;wi<4;wi++){var wa=wi*Math.PI/2;spawnP(g,e.x+Math.cos(wa)*10,e.y+Math.sin(wa)*10,"moss",1)}}
  else if(wt==="dash"){for(var wi=0;wi<4;wi++)spawnP(g,e.x+rn(-10,10),e.y+rn(-10,10),"accent",2)}
  // Boss死亡额外爆发
  if(e.isBoss){for(var bi=0;bi<16;bi++){var ba=bi*Math.PI*2/16;
    spawnP(g,e.x+Math.cos(ba)*15,e.y+Math.sin(ba)*15,"accent",2);
    spawnP(g,e.x+Math.cos(ba)*30,e.y+Math.sin(ba)*30,"gold",1)}
    for(var bi2=0;bi2<24;bi2++){var ba2=bi2*Math.PI*2/24;
      spawnInk(g,e.x+Math.cos(ba2)*rn(20,50),e.y+Math.sin(ba2)*rn(20,50),2,"boss")}
    g.freezeT=Math.max(g.freezeT,30);shake(g,20,10);
    pushLimited(g.floatTexts,{x:e.x,y:e.y-40,text:"邪祟伏诛",life:80,maxLife:80,reason:"bossDeath"},LIMITS.floatTexts)}
  g.execFlash=e;
  stageOnEnemyKilled(g,e);
  if(e.isBoss)spawnJudgment(g,e,"boss");
  else if(opts&&opts.crit&&g.weapon.type==="melee")spawnJudgment(g,e,"crit");
  else if(opts&&opts.weakpoint)spawnJudgment(g,e,"weak");
  else if(opts&&opts.combo3)spawnJudgment(g,e,"combo");
  if(p.fireOnKill&&source!=="fire")addFire(g,{x:e.x,y:e.y,r:28,life:120,dmg:2,
    owner:"player",kind:"phosphor",expanded:false});
  if(p.killHeal>0){var oldHp=p.hp;p.hp=Math.min(p.maxHp,p.hp+p.killHeal);
    var healed=p.hp-oldHp;if(healed>0)pushLimited(g.floatTexts,{x:p.x,y:p.y-p.r-12,text:"+"+healed,life:30,maxLife:30,reason:"heal"},LIMITS.floatTexts)}
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
    var nearest=null,nd=999999;
    g.enemies.forEach(function(o){if(o.hp>0&&o!==e){var d=dstSq(o,e);if(d<nd){nd=d;nearest=o}}});
    if(nearest)damageEnemy(g,nearest,Math.floor(8+p.stats.dmg*3),"soul");
  }
  if(p.fireExpand&&source==="fire"){
    g.fires.forEach(function(f){if(f.owner==="player"&&f.kind==="phosphor"&&!f.expanded&&dstSq(f,e)<RANGES.fireExpand*RANGES.fireExpand){
      f.r=Math.max(f.r,42);f.expanded=true;spawnInk(g,f.x,f.y,4,"fire")}})}
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
  // kill streak bonus: 5+ → +10%, 10+ → +20%
  if(g.killStreak>=10)dmg=Math.floor(dmg*1.2);
  else if(g.killStreak>=5)dmg=Math.floor(dmg*1.1);
  if(e.hasShield&&e.shield>0)dmg=Math.floor(dmg*0.5);
  dmg=Math.floor(dmg*(e.armorMult||1));
  e.hp-=Math.max(1,dmg);e.hitFlash=6;
  if(e.hasShield&&e.shield>0){
    e.shield-=Math.max(1,Math.floor(dmg));
    if(e.shield<=0){e.shield=0;e.hasShield=false;e.shieldCd=e.shieldRegen;snd("shieldBreak");spawnInk(g,e.x,e.y,8,"ink")}
  }
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
  g.fires=g.fires.filter(function(f){return f.owner==="player"});
}

function startWave(g){
  snd("waveStart");
  cleanupWave(g);
  var w;
  if(g.wave<WAVE_BUDGETS.length&&WAVE_BUDGETS[g.wave]>0){
    // Procedural wave
    w=generateWave(g.wave,g.diff||"normal");
  }
  if(!w){
    // Boss wave (last wave)
    var bossT=g.bossType||"boss";
    var supportPool=["gudeng","jiangshi","fenshen","zhikuang","zhikui","youhun"];
    var sup=[];
    for(var si=0;si<2+ri(0,2);si++)sup.push({t:pick(supportPool),n:1});
    w={label:"镇守 · "+(bossT==="mojiangjun"?"墨阵殿":"画皮堂"),mod:pick(["lantern","mask","inkpool"]),
      flavor:bossT==="mojiangjun"?"墨将军镇守此地。以墨为甲，以书为兵。":"画皮娘子镇守此地。她有千面，你的刀只有一面。",
      list:[{t:bossT,n:1}].concat(sup)};
  }
  if(!w){g.state="victory";return}
  startStage(g,w);
  g.announce=w.label+" · "+getStageDef(w.mod).name;g.announceT=110;
  g.waveCleared=false;g.waveClearT=0;
  g.waveFlavor=w.flavor||"";
  if(g.wave>0)g.inkWipe=30;
  // Special wave handling
  var specialWave=w.special||null;
  if(specialWave==="elite"||specialWave==="elite_horde"){
    g.player.allElite=true;g.announce=w.label+" · 精英潮";g.announceT=110;
    showHint(g,"boss","精英潮涌！所有敌人皆为精英。");
  }else if(specialWave==="horde"){
    g.announce=w.label+" · 群魔潮";g.announceT=110;
    showHint(g,"boss","群魔蜂拥而至！杀出一条血路。");
  }else if(specialWave==="survival"){
    g.announce=w.label+" · 生存";g.announceT=110;
    showHint(g,"boss","撑住！敌人源源不断。");
  }
  // Boss wave — activate screen effect + entrance cinematic
  var hasBoss=w.list.some(function(e){return ETYPE[e.t]&&ETYPE[e.t].isBoss});
  if(hasBoss){g.bossWaveEntrance=50;snd("bossIntro");
    var bossName=w.list.filter(function(e){return ETYPE[e.t]&&ETYPE[e.t].isBoss})[0];
    var bInfo=bossName?ETYPE[bossName.t]:null;
    showHint(g,"boss","Boss战 — "+(bInfo?bInfo.tip:"小心应战"));}
  var frame=document.querySelector&&document.querySelector(".game-frame");
  if(frame){if(hasBoss)frame.classList.add("is-boss-wave");else frame.classList.remove("is-boss-wave")}
  w.list.forEach(function(e){for(var i=0;i<e.n;i++)spawnEnemy(g,e.t,e)});
  g.player.allElite=false;g.waveTotal=g.enemies.length;
  g.enemies.forEach(function(en){en.spawnGraceT=Math.max(en.spawnGraceT||0,30)});
}

function pAtk(g){
  var p=g.player,w=g.weapon,s=p.stats;
  var fastAtk=p.killAtkSpd&&p.killAtkTimer>0;
  var cdMult=fastAtk?TUNING.fastAtkCdMult:1;
  var pMul=fastAtk?TUNING.fastAtkParticleMult:1;
  if(p.atkCd>0)return;
  p.atkCd=Math.max(CAPS.atkCdFloor,Math.floor(w.cd*cdMult*s.atkSpd));p.atkCdMax=p.atkCd;p.atkCount++;
  // 连段
  if(p.comboTimer>0)p.comboCount++;else p.comboCount=1;
  p.comboTimer=TUNING.comboWindow;
  // 蓄力（墨龙珠）
  var chargeBonus=1;
  if(p.chargeDmg>0&&p.chargeTimer>=TUNING.chargeThreshold){chargeBonus=1+p.chargeDmg;p.charged=true}
  p.chargeTimer=0;

  var rng=w.range*s.range;
  var effectiveSoul=p.soulDmg+(p.soulDmgPerRelic?g.relics.length:0);
  var dmg=Math.floor(w.dmg*s.dmg)+effectiveSoul;
  // 低血增伤（祟面香灰）
  if(p.lowHpDmg>0&&p.hp<=p.maxHp*TUNING.lowHpThreshold)dmg=Math.floor(dmg*(1+p.lowHpDmg));
  // 低血增范围（血墨混染）
  if(p.lowHpRange&&p.hp<=p.maxHp*0.35)rng*=1.4;
  // 蓄力增伤
  dmg=Math.floor(dmg*chargeBonus);
  // 暴击
  var effectiveCrit=Math.min(s.critRate+(p.execCritT>0?0.2:0),CAPS.critRate);
  var crit=Math.random()<effectiveCrit;
  if(crit)dmg=Math.floor(dmg*s.critDmg);
  else if(p.guxuePenalty)dmg=Math.floor(dmg*0.88);
  // justDodged bonus: all weapons get +20% damage after a successful dodge
  if(p.justDodged)dmg=Math.floor(dmg*1.2);

  // 斩妖剑：multi决定同劈几刀
  if(w.type==="melee"){
    var comboArc=w.arc,comboRng=rng,comboDmg=dmg;
    if(p.comboCount%3===0){comboArc=w.arc*TUNING.combo3Arc;comboRng=rng*TUNING.combo3Range;comboDmg=Math.floor(dmg*TUNING.combo3Dmg)}
    if(p.wideSlash)comboArc*=1.2;
    for(var si=0;si<s.multi;si++){
      var sOff=(si-(s.multi-1)/2)*0.18;
      addAttack(g,{x:p.x,y:p.y,angle:p.facing+sOff,arc:comboArc,range:comboRng,
        dmg:comboDmg,crit:crit,life:12,maxLife:12,type:"slash",
        pierce:(p.pierceOnDodge&&p.justDodged)||(p.comboCount%3===0),
        hitMap:{}});
    }
    spawnInk(g,p.x+Math.cos(p.facing)*rng*0.6,p.y+Math.sin(p.facing)*rng*0.6,
      Math.max(2,Math.floor((p.comboCount%3===0?8:4)*pMul)),"ink");
  // 符骨笔：multi决定扇形弹数
  }else if(w.type==="ranged"){
    var basePSpd=w.spd||7,basePSize=8*s.projSize;
    var isBig=p.comboCount%5===0;
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
    for(var ri=0;ri<s.multi;ri++){
      var decay=ri>0?(p.ringNoDecay?0:0.25):0;
      var ar=rng*(1+bellCombo*0.06)*(1-ri*0.2);
      addAttack(g,{x:p.x,y:p.y,r:ar,dmg:Math.floor(dmg*(1-decay)),crit:crit,
        life:20,maxLife:20,type:"ring",expand:ar/20,
        slow:p.ringSlow});
    }
    spawnInk(g,p.x,p.y,Math.max(2,Math.floor((4+Math.min(bellCombo,6))*pMul)),"moss");
  // 伏魔伞：宽弧线扫击，受伤后反击加伤
  }else if(w.type==="dash"){
    var dashDmg=dmg,spdPower=moveScale(p);
    dashDmg=Math.floor(dashDmg*(1+Math.max(0,spdPower-1)*0.45));
    if(p.justDodged)dashDmg=Math.floor(dashDmg*1.8);
    var dashRng=rng*(0.9+spdPower*0.1);
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
  }
  // 墨刃遗物
  if(p.tripleBlade&&p.atkCount%3===0){
    addAttack(g,{x:p.x,y:p.y,vx:Math.cos(p.facing)*5,vy:Math.sin(p.facing)*5,
      dmg:Math.floor(dmg*0.6),crit:false,r:6*s.projSize,life:30,maxLife:30,type:"proj",
      bounce:p.bounce,bounced:false,pierce:false});
  }
  // 斩魔进化：每3击追踪墨刃
  if(p.seekBlade&&p.atkCount%3===0){
    var nearest=null,nd=999;
    g.enemies.forEach(function(e){if(e.hp<=0)return;var d=dstSq(p,e);if(d<nd){nd=d;nearest=e}});
    if(nearest){
      var sa=Math.atan2(nearest.y-p.y,nearest.x-p.x);
      addAttack(g,{x:p.x,y:p.y,vx:Math.cos(sa)*6,vy:Math.sin(sa)*6,
        dmg:Math.floor(dmg*0.5),crit:false,r:5,life:35,maxLife:35,type:"proj",
        seek:true,seekTarget:nearest});
    }
  }
  if(p.charged){spawnInk(g,p.x,p.y,10,"accent");p.charged=false}
  if(w.type==="melee")snd("swordSlash");
  else if(w.type==="ranged")snd("brushShot");
  else if(w.type==="aoe")snd("bellRing");
  else if(w.type==="dash")snd("umbrellaDash");
  p.justDodged=false;p.justDodgedT=0;
}

function hurtP(g,dmg,src){
  var p=g.player;
  if(p.invTimer>0)return;
  // 墨池加成：敌人在墨池中攻击力+30%
  if(src&&inkPoolCheck(g,src.x,src.y)===1)dmg=Math.floor(dmg*TUNING.inkPoolDmgMult);
  // 伤害减免
  dmg=Math.floor(dmg*(1-p.stats.def));
  // 额外受伤（血墨混染）
  if(p.extraDmgTaken>0)dmg=Math.floor(dmg*(1+p.extraDmgTaken));
  // 收阴袋护盾（在扣血前生效）
  if(p.killShield&&p.shieldStack>0){dmg=Math.max(1,dmg-p.shieldStack*4);p.shieldStack=0;
    snd("shieldBreak");spawnInk(g,p.x,p.y,6,"gold")}
  snd("playerHurt");
  if(p.decoyHP>0){var oldDecoy=p.decoyHP;p.decoyHP-=dmg;
    if(p.decoyHP<0){p.hp+=p.decoyHP;p.decoyHP=0}
    if(p.decoyHP<oldDecoy)spawnInk(g,p.x,p.y,4,"ghost")}
  else{p.hp-=dmg}
  // 反伤（镇墓兽首）
  if(p.thorns>0&&src){damageEnemy(g,src,Math.floor(dmg*p.thorns),"thorns");
    spawnInk(g,src.x,src.y,4,"accent")}
  p.invTimer=TUNING.hurtInvFrames;shake(g,4,4);p.hurtFlash=12;
  if(src)g.dmgDir={ang:ang(p,src),t:20};
  spawnInk(g,p.x,p.y,5,"accent");
  // 复活（招魂残幡）
  if(p.hp<=0){
    if(p.revive&&!p.hasRevived){p.hasRevived=true;p.hp=Math.floor(p.maxHp*TUNING.reviveHpRatio);
      p.invTimer=60;snd("revive");spawnInk(g,p.x,p.y,20,"accent");return}
    p.hp=0;g.freezeT=22;shake(g,16,10);
    var killerName=src&&src.name?src.name:"未知";
    g.deathCircle={x:p.x,y:p.y,r:0,maxR:180,life:22,killer:killerName};
    spawnInk(g,p.x,p.y,35,"ink");spawnInk(g,p.x,p.y,20,"accent");
    for(var di=0;di<16;di++){var da=di*Math.PI*2/16;
      spawnP(g,p.x+Math.cos(da)*24,p.y+Math.sin(da)*24,"ink",2)}
    g.state="dying"}
}

function hitE(g,atk,e){
  var p=g.player;
  var dmg=atk.dmg;
  // 连击递增（墨池残砚）
  if(p.comboDmg){
    if(p.comboHitId===e){p.comboHitCount=Math.min(p.comboHitCount+1,8);
      dmg=Math.floor(dmg*(1+p.comboHitCount*0.08))}
    else p.comboHitCount=0;
    p.comboHitId=e}
  // 弱点标记（铜镜照妖）
  if(atk.crit&&p.weakpointDmg>0){p.weakTargets[e.id]=90}
  var isWeak=p.weakTargets[e.id]&&p.weakTargets[e.id]>0;
  if(isWeak)dmg=Math.floor(dmg*(1+p.weakpointDmg));
  var killed=damageEnemy(g,e,dmg,"hit",{crit:!!atk.crit,weakpoint:isWeak,combo3:p.comboCount%3===0});
  if(killed&&p.comboHitId===e)p.comboHitId=null;
  if(p.slowOnHit>0)e.slowT=Math.max(e.slowT,30);
  // 裂冰诀：暴击留冰冻区
  if(atk.crit&&p.frostOnCrit){
    pushLimited(g.frosts,{x:e.x,y:e.y,r:45,life:60,maxLife:60},LIMITS.frosts);snd("frostCreate")}
  // 单次遍历：恐惧 + 魂链 + 爆裂
  if((atk.crit&&p.fearOnCrit)||p.soulChain||atk.burst){
    var doFear=atk.crit&&p.fearOnCrit;
    var fearR=RANGES.fear*RANGES.fear;
    var doSoul=!!p.soulChain,sc=0,soulR=RANGES.soulChain*RANGES.soulChain;
    g.enemies.forEach(function(o){
      if(o===e||o.hp<=0)return;
      var dSq=dstSq(o,e);
      if(doFear&&dSq<fearR)o.fearT=60;
      if(doSoul&&dSq<soulR&&sc<CAPS.soulChain){damageEnemy(g,o,Math.floor(atk.dmg*0.3),"soul");spawnP(g,o.x,o.y,"soul",3);sc++}
      if(atk.burst&&dSq<RANGES.burst*RANGES.burst){damageEnemy(g,o,Math.floor(atk.dmg*0.4),"burst")}
    });
  }
  spawnInk(g,e.x,e.y,atk.crit?8:4,"ink");
  if(atk.crit){g.critFlash=12;for(var ci=0;ci<8;ci++){var ca=ci*Math.PI/4;
    spawnP(g,e.x+Math.cos(ca)*10,e.y+Math.sin(ca)*10,"accent",2)}}
  shake(g,atk.crit?6:3,atk.crit?5:3);
  // floating damage number
  var dn=dmg,dr=atk.crit?"critDmg":(isWeak?"weakDmg":"dmg");
  pushLimited(g.floatTexts,{x:e.x+rn(-8,8),y:e.y-e.r-6,text:""+dn,life:30,maxLife:30,reason:dr},LIMITS.floatTexts);
  if(atk.crit&&g.freezeT<3)g.freezeT=g.player.killAtkTimer>0?1:3;
  else if(g.freezeT<1)g.freezeT=1;
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
  var dx=px-cx,dy=py-cy,d=Math.sqrt(dx*dx+dy*dy);
  if(d>range)return false;
  var da=Math.atan2(dy,dx)-a;
  while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
  return Math.abs(da)<arc/2
}

function startDodge(g,dx,dy){
  var p=g.player;
  if(p.noDodge){p.dodgeQueued=false;return}
  if(p.dodgeCd>0||p.dodgeT>0){p.dodgeQueued=false;return}
  var len=Math.sqrt(dx*dx+dy*dy),a=p.facing;
  if(len>0.1)a=Math.atan2(dy,dx);
  p.dodgeT=TUNING.dodgeDuration;var cd=TUNING.dodgeCooldown;
  if(p.dodgeSpdScale){var excess=Math.round((p.stats.spd-1)*10)/10;if(excess>0)cd-=Math.min(10,Math.floor(excess/0.1)*2)}
  p.dodgeCd=cd;
  var sp=moveScale(p);
  p.dodgeDx=Math.cos(a)*9*sp;p.dodgeDy=Math.sin(a)*9*sp;
  p.invTimer=Math.max(p.invTimer,TUNING.dodgeInvFrames);
  p.justDodged=true;p.justDodgedT=TUNING.justDodgedWindow;p.dodgeQueued=false;
  snd("playerDodge");spawnInk(g,p.x,p.y,7,"ink");
  if(p.decoyOnDodge){
    pushLimited(g.decoys,{x:p.x,y:p.y,life:50,maxLife:50,r:p.r},LIMITS.decoys);
  }
}

function update(g){
  if(g.state==="dying"){g.time++;
    g.freezeT--;if(g.deathCircle)g.deathCircle.r+=g.deathCircle.maxR/g.deathCircle.life;
    if(g.freezeT<=0)g.state="over";
    return}
  if(g.state==="victory"){g.time++;g.freezeT--;
    if(g.freezeT<=0)g.freezeT=0;
    return}
  // Mobile pause button (before state guard so unpause works)
  var mobPause=window._mobileInput&&window._mobileInput.pausing;
  if(mobPause){window._mobileInput.pausing=false;togglePause();return}
  if(g.state!=="playing")return;
  g.time++;
  if(g.announceT>0)g.announceT--;
  if(g.hintT>0)g.hintT--;
  if(g.killStreakT>0){g.killStreakT--;if(g.killStreakT<=0)g.killStreak=0}
  if(g.relicFlash>0)g.relicFlash--;
  if(g.critFlash>0)g.critFlash--;
  if(g.dmgDir&&g.dmgDir.t>0){g.dmgDir.t--;if(g.dmgDir.t<=0)g.dmgDir=null}
  if(g.bossFlash>0)g.bossFlash--;
  if(g.shakeT>0){g.shakeT--;var si=g.shakeAmp||3;g.shakeX=rn(-si,si);g.shakeY=rn(-si,si)}
  else{g.shakeX=0;g.shakeY=0;g.shakeAmp=0}
  if(g.freezeT>0){g.freezeT--;return}
  // slow motion: skip every other frame
  if(g.slowMo>0){g.slowMo--;if(g.time%2===0)return}
  if(g.inkWipe>0)g.inkWipe--;
  if(g.bossWaveEntrance>0){g.bossWaveEntrance--;shake(g,4,3)}

  var p=g.player,dx=0,dy=0;
  var mob=window._mobileInput;
  if(mob&&mob.active){dx=mob.dx;dy=mob.dy}else{
    if(keys["w"]||keys["arrowup"])dy=-1;
    if(keys["s"]||keys["arrowdown"])dy=1;
    if(keys["a"]||keys["arrowleft"])dx=-1;
    if(keys["d"]||keys["arrowright"])dx=1;
  }

  var rect=canvas.getBoundingClientRect();
  var mouseX=rect.width>0?(mouse.x-rect.left)*(W/rect.width):p.x,mouseY=rect.height>0?(mouse.y-rect.top)*(H/rect.height):p.y;
  if(mob&&mob.active&&mob.attacking)p.facing=mob.aimAngle;
  else p.facing=Math.atan2(mouseY-p.y,mouseX-p.x);

  var movedThisFrame=false;
  if(mob&&mob.dodging){p.dodgeQueued=true;mob.dodging=false}
  if(p.dodgeQueued)startDodge(g,dx,dy);
  if(p.dodgeT>0){p.x+=p.dodgeDx;p.y+=p.dodgeDy;p.dodgeT--;movedThisFrame=true;
    if(g.time%2===0)spawnP(g,p.x+rn(-6,6),p.y+rn(-6,6),"ink",2)}
  else if(p.dashT>0){p.x+=p.dashDx;p.y+=p.dashDy;p.dashT--;movedThisFrame=true;
    if(g.time%2===0)spawnP(g,p.x+rn(-4,4),p.y+rn(-4,4),"accent",2)}
  else if(dx||dy){var spdMul=moveScale(p)*stageSpeedFactor(g,p.x,p.y);
    if(inkPoolCheck(g,p.x,p.y)===2)spdMul*=1.2;
    var len=Math.sqrt(dx*dx+dy*dy);
    var mx=(dx/len)*p.spd*spdMul,my=(dy/len)*p.spd*spdMul;
    p.x+=mx;p.y+=my;p.lastDx=mx;p.lastDy=my;movedThisFrame=true;
  }
  p.x=cl(p.x,A.l+p.r,A.r-p.r);p.y=cl(p.y,A.t+p.r,A.b-p.r);
  // expose positions for mobile auto-aim
  window._playerPos={x:p.x,y:p.y};window._lastEnemies=g.enemies;
  if(movedThisFrame){p.idleT=0}else{p.idleT++}
  if(movedThisFrame&&p.inkTrail&&g.time%12===0){addFire(g,{x:p.x,y:p.y,r:18,life:90,dmg:0,slow:true});
    spawnP(g,p.x+rn(-8,8),p.y+rn(-8,8),"ink",1)}
  if((dx||dy)&&g.time%4===0){
    var trvx=p.lastDx?p.lastDx*0.3+rn(-0.3,0.3):rn(-0.3,0.3);
    var trvy=p.lastDy?p.lastDy*0.3+rn(-0.3,0.3):rn(-0.3,0.3);
    var trailType=g.weapon.type==="dash"?"accent":g.weapon.type==="ranged"?"moss":"ink";
    pushLimited(g.particles,{x:p.x+rn(-4,4),y:p.y+rn(-4,4),
    vx:trvx,vy:trvy,life:rn(25,50),maxLife:50,size:rn(1.5,4),type:trailType},LIMITS.particles)}
  // dash trail ink splatter
  if(p.dashT>0&&g.time%2===0){
    pushLimited(g.particles,{x:p.x+rn(-5,5),y:p.y+rn(-5,5),
      vx:rn(-1.2,1.2),vy:rn(-0.6,0.6),life:rn(16,24),maxLife:24,size:rn(2,6),type:"accent"},LIMITS.particles);
    if(g.time%5===0)pushLimited(g.particles,{x:p.x-p.dashDx*0.3+rn(-3,3),y:p.y-p.dashDy*0.3+rn(-3,3),
      vx:rn(-0.5,0.5),vy:rn(-0.3,0.3),life:rn(12,20),maxLife:20,size:rn(1,3),type:"ink"},LIMITS.particles)}

  if((mouse.down||(mob&&mob.attacking))&&p.atkCd<=0)pAtk(g);
  if(p.atkCd>0)p.atkCd--;
  if(p.invTimer>0)p.invTimer--;
  if(p.hurtFlash>0)p.hurtFlash--;
  if(p.dodgeCd>0)p.dodgeCd--;
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
  if(p.killAtkTimer>0)p.killAtkTimer--;
  if(p.execCritT>0)p.execCritT--;
  // 弱点标记计时
  for(var k in p.weakTargets){if(p.weakTargets[k]>0)p.weakTargets[k]--;
    if(p.weakTargets[k]<=0)delete p.weakTargets[k]}
  updateStage(g);

  // enemies
  var slowAmt=Math.max(p.slowOnHit,0.3);
  for(var i=g.enemies.length-1;i>=0;i--){
    var e=g.enemies[i];
    if(e.hp<=0){if(!e.deathT)e.deathT=18;e.deathT--;if(e.deathT<=0){g.enemies.splice(i,1);continue}continue}
    if(e.hitFlash>0)e.hitFlash--;
    if(e.slowT>0)e.slowT--;
    if(e.fearT>0)e.fearT--;
    if(e.spawnGraceT>0)e.spawnGraceT--;
    if(e.cdT>0)e.cdT--;
    if(e.chargeCdT>0)e.chargeCdT--;
    if(e.bossChargeCdT>0)e.bossChargeCdT--;
    e.bob+=0.06;
    if(e.spawnGraceT>0)continue;
    var spd=e.spd*(e.slowT>0?(1-slowAmt):1);
    if(e.isBoss&&e.type!=="mojiangjun"&&e.hp<e.maxHp*TUNING.bossEnrageHp&&!e.enraged){e.enraged=true;spd*=TUNING.bossEnrageSpdMult;
      snd("bossEnrage");shake(g,10,8);g.bossFlash=8;
      spawnInk(g,e.x,e.y,20,"fire");g.freezeT=Math.max(g.freezeT,6);
      pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:e.name+" · 怒",life:80,maxLife:80,reason:"streak"},LIMITS.floatTexts)}
    else if(e.isBoss&&e.type!=="mojiangjun"&&e.enraged)spd*=TUNING.bossEnrageSpdMult;
    if(e.isBoss&&e.type!=="mojiangjun"&&e.hp<e.maxHp*TUNING.bossDesperateHp&&!e.desperate){e.desperate=true;
      e.atkCd=Math.max(18,Math.floor(e.atkCd*0.6));e.fanShot=Math.min(7,e.fanShot+2);
      snd("bossEnrage");shake(g,14,10);
      spawnInk(g,e.x,e.y,28,"fire");spawnInk(g,e.x,e.y,16,"accent");
      for(var di=0;di<12;di++){var da=di*Math.PI*2/12;
        spawnP(g,e.x+Math.cos(da)*30,e.y+Math.sin(da)*30,"fire",2)}
      g.freezeT=Math.max(g.freezeT,10);g.bossFlash=12;
      pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:e.name+" · 绝望",life:90,maxLife:90,reason:"streak"},LIMITS.floatTexts);
      pushLimited(g.floatTexts,{x:e.x,y:e.y-30,text:"回光返照",life:60,maxLife:60,reason:"desperate"},LIMITS.floatTexts);}
    var toP=ang(e,p),dToPSq=dstSq(e,p),specialMove=false;
    // decoy attraction: affect movement AND attack targeting
    var targetX=p.x,targetY=p.y;
    var decoyTarget=null,decoyDist=Infinity;
    for(var di=0;di<g.decoys.length;di++){var dd=dstSq(e,g.decoys[di]);
      if(dd<decoyDist){decoyDist=dd;decoyTarget=g.decoys[di]}}
    if(decoyTarget&&decoyDist<RANGES.decoyAttract*RANGES.decoyAttract){toP=ang(e,decoyTarget);dToPSq=dstSq(e,decoyTarget);targetX=decoyTarget.x;targetY=decoyTarget.y}
    if(e.chargeT>0){
      e.x+=e.chargeVx;e.y+=e.chargeVy;e.chargeT--;specialMove=true;
      if(g.time%3===0)spawnInk(g,e.x,e.y,1,"accent");
      {var mr=e.r+p.r+4;if(dstSq(e,p)<mr*mr&&p.invTimer<=0)hurtP(g,Math.floor(e.dmg*1.25),e)}
    }else if(e.prepT>0){
      e.prepT--;spd*=0.12;
      if(e.prepT<=0){var ca=Math.atan2(targetY-e.y,targetX-e.x);
        e.chargeVx=Math.cos(ca)*e.chargeSpeed;e.chargeVy=Math.sin(ca)*e.chargeSpeed;e.chargeT=18}
    }else if(e.charge&&e.chargeCdT<=0&&dToPSq<RANGES.chargeMax*RANGES.chargeMax&&dToPSq>RANGES.chargeMin*RANGES.chargeMin){
      e.prepT=16;e.chargeCdT=e.chargeCd;spawnInk(g,e.x,e.y,5,"accent");
    }
    if(!specialMove){
      if(e.fearT>0){e.x-=Math.cos(toP)*spd*1.2;e.y-=Math.sin(toP)*spd*1.2}
      else if(!e.ranged||dToPSq>RANGES.rangedMin*RANGES.rangedMin){e.x+=Math.cos(toP)*spd;e.y+=Math.sin(toP)*spd}
    }
    e.x=cl(e.x,A.l+e.r,A.r-e.r);e.y=cl(e.y,A.t+e.r,A.b-e.r);
    g.enemies.forEach(function(o){if(o===e||o.hp<=0)return;
      var dSq=dstSq(e,o),minD=e.r+o.r;
      if(dSq<minD*minD&&dSq>0.01){
        var d=Math.sqrt(dSq),push=(minD-d)*0.25;var pa=ang(o,e);
        e.x+=Math.cos(pa)*push;e.y+=Math.sin(pa)*push}});
    e.x=cl(e.x,A.l+e.r,A.r-e.r);e.y=cl(e.y,A.t+e.r,A.b-e.r);
    if(e.fireTrail&&g.time%20===0)addFire(g,{x:e.x,y:e.y,r:16,life:80,dmg:2});
    dToPSq=dstSq(e,p);
    if(e.cdT<=0){
      if(e.ranged&&dToPSq<e.atkR*e.atkR&&dToPSq>RANGES.rangedMin*RANGES.rangedMin){var a=Math.atan2(targetY-e.y,targetX-e.x);
        for(var fs=0;fs<e.fanShot;fs++){
          var fa=a+(fs-(e.fanShot-1)/2)*0.24;
          addEProj(g,{x:e.x,y:e.y,vx:Math.cos(fa)*e.pSpd,vy:Math.sin(fa)*e.pSpd,
            r:5,dmg:Math.max(1,Math.floor(e.dmg*(e.fanShot>1?0.82:1))),life:58,_src:e});
        }
        e.cdT=e.atkCd}
      else if(!e.ranged&&dToPSq<(e.atkR+p.r)*(e.atkR+p.r)){if(p.invTimer<=0)hurtP(g,e.dmg,e);e.cdT=e.atkCd}}
    if(e.isBoss&&e.type!=="mojiangjun"&&g.time%90===0){for(var ba=0;ba<8;ba++){var baA=ba*Math.PI/4;
      addEProj(g,{x:e.x,y:e.y,vx:Math.cos(baA)*3,vy:Math.sin(baA)*3,
      r:6,dmg:e.dmg*0.6,life:60,_src:e})}}
    // boss enraged: spiral bullets every 60 frames
    if(e.isBoss&&e.type!=="mojiangjun"&&e.enraged&&g.time%60===0){var spBase=g.time*0.12;
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
      if(e.bossPrepT<=0){var bpA=Math.atan2(targetY-e.y,targetX-e.x);
        e.bossChargeVx=Math.cos(bpA)*5.5;e.bossChargeVy=Math.sin(bpA)*5.5;e.bossChargeT=14}
    }else if(e.isBoss&&e.type==="boss"&&e.desperate&&e.bossChargeCdT<=0&&dToPSq<200*200){
      e.bossPrepT=20;snd("bossEnrage");shake(g,4,3);
      e.bossPrepAng=Math.atan2(targetY-e.y,targetX-e.x);
    }
    // --- 墨将军 Boss AI ---
    if(e.type==="mojiangjun"){
      var mjjPhase=e.hp>e.maxHp*0.6?1:e.hp>e.maxHp*0.25?2:3;
      if(!e._mjjPhase||e._mjjPhase!==mjjPhase){
        e._mjjPhase=mjjPhase;
        if(mjjPhase===2){snd("bossEnrage");shake(g,10,6);
          pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:"墨将军 · 召书",life:80,maxLife:80,reason:"streak"},LIMITS.floatTexts)}
        if(mjjPhase===3){snd("bossEnrage");shake(g,14,10);e.spd=1.6;
          pushLimited(g.floatTexts,{x:W/2,y:H/2-40,text:"墨将军 · 狂书",life:90,maxLife:90,reason:"streak"},LIMITS.floatTexts);
          g.freezeT=Math.max(g.freezeT,8)}
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
        if(g.time%140===0&&!specialMove&&dToPSq<200*200){
          var mca=Math.atan2(p.y-e.y,p.x-e.x);
          e.chargeVx=Math.cos(mca)*5.5;e.chargeVy=Math.sin(mca)*5.5;e.chargeT=14;
          snd("playerDodge");shake(g,4,3)}
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
    if(!e.hasShield&&e.shieldCd>0){e.shieldCd--;if(e.shieldCd<=0){e.shield=e.maxShield;e.hasShield=true;
      spawnInk(g,e.x,e.y,5,"ink");snd("chargeReady")}}
  }

  // enemy projectiles + off-screen warnings
  for(var i=g.eProj.length-1;i>=0;i--){
    var ep=g.eProj[i];ep.x+=ep.vx;ep.y+=ep.vy;ep.life--;
    // enemy projectile trail (every 4 frames)
    if(g.time%4===0&&perfMul(g)>0.4){
      pushLimited(g.particles,{x:ep.x+rn(-1,1),y:ep.y+rn(-1,1),
        vx:rn(-0.2,0.2),vy:rn(-0.2,0.2),life:6,maxLife:6,size:rn(1,2.5),type:"ink"},LIMITS.particles)}
    if(ep.life<=0||ep.x<A.l||ep.x>A.r||ep.y<A.t||ep.y>A.b){g.eProj.splice(i,1);continue}
    {var mr=ep.r+p.r;if(collideSq(ep,p)&&p.invTimer<=0){hurtP(g,ep.dmg,ep._src);g.eProj.splice(i,1)}}}

  // player attacks
  for(var i=g.attacks.length-1;i>=0;i--){
    var atk=g.attacks[i];atk.life--;
    if(atk.life<=0){g.attacks.splice(i,1);continue}
    if(atk.type==="proj"){
      if(atk.seek&&atk.seekTarget&&atk.seekTarget.hp>0){
        var ta=Math.atan2(atk.seekTarget.y-atk.y,atk.seekTarget.x-atk.x);
        var ca=Math.atan2(atk.vy,atk.vx);var diff=ta-ca;
        while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
        var turn=Math.min(Math.abs(diff),0.08);
        var na=ca+(diff>0?turn:-turn);
        var sp=Math.sqrt(atk.vx*atk.vx+atk.vy*atk.vy);
        atk.vx=Math.cos(na)*sp;atk.vy=Math.sin(na)*sp;
      }
      atk.x+=atk.vx;atk.y+=atk.vy;
      // projectile trail particle (every 3 frames)
      if(g.time%3===0&&perfMul(g)>0.4){
        pushLimited(g.particles,{x:atk.x+rn(-2,2),y:atk.y+rn(-2,2),
          vx:rn(-0.3,0.3),vy:rn(-0.3,0.3),life:8,maxLife:8,size:rn(1.5,3),type:"accent"},LIMITS.particles)}
      if(atk.bounce&&!atk.bounced&&atk.life<atk.maxLife*0.4){atk.vx*=-1;atk.vy*=-1;atk.bounced=true}
      if(atk.x<A.l||atk.x>A.r||atk.y<A.t||atk.y>A.b){g.attacks.splice(i,1);continue}
      var hitR=(atk.r||8);
      g.enemies.forEach(function(e){if(atk.life<=0||e.hp<=0||e.spawnGraceT>0||atk.hitMap[e.id])return;
        var tr=hitR+e.r;if(dstSq(atk,e)<tr*tr){hitE(g,atk,e);atk.hitMap[e.id]=true;if(!atk.pierce)atk.life=0}});
      if(atk.life<=0){g.attacks.splice(i,1);continue}
    }else if(atk.type==="slash"||atk.type==="dashSlash"){
      if(atk.delay&&atk.delay>0){atk.delay--;continue}
      g.enemies.forEach(function(e){if(e.hp<=0||e.spawnGraceT>0||atk.hitMap[e.id])return;
        if(ptInArc(e.x,e.y,atk.x,atk.y,atk.angle,atk.arc,atk.range)){hitE(g,atk,e);
          atk.hitMap[e.id]=true}});
    }else if(atk.type==="ring"){
      atk.r=atk.expand*(atk.maxLife-atk.life);
      var ringR=atk.r;
      g.enemies.forEach(function(e){if(e.hp<=0||e.spawnGraceT>0||atk.hitMap[e.id])return;
        if(collideSq(atk,e)){
          if(atk.slow)e.slowT=Math.max(e.slowT,45);
          hitE(g,atk,e);atk.hitMap[e.id]=true}});    }
  }

  // fires / ink trails
  for(var i=g.fires.length-1;i>=0;i--){var f=g.fires[i];f.life--;
    if(f.life<=0){g.fires.splice(i,1);continue}
    if(f.slow){g.enemies.forEach(function(e){if(e.hp>0){if(collideSq(f,e))e.slowT=Math.max(e.slowT,15)}})}
    else if(f.owner==="player"){
      g.enemies.forEach(function(e){if(e.hp>0&&e.spawnGraceT<=0){var mr=f.r+e.r;if(dstSq(f,e)<mr*mr&&((g.time+f.tickOffset)%20===0)){
        if(damageEnemy(g,e,f.dmg,"fire"))spawnInk(g,e.x,e.y,10,"fire");
      }}})}
    else{var mr=f.r+p.r;if(dstSq(f,p)<mr*mr&&p.invTimer<=0&&((g.time+f.tickOffset)%15===0))hurtP(g,f.dmg)}
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
    var nearest=null,nd=Infinity;
    for(var ki=0;ki<g.enemies.length;ki++){var ke=g.enemies[ki];if(ke.hp<=0||ke.spawnGraceT>0)continue;
      var kd=dstSq(k,ke);if(kd<nd){nd=kd;nearest=ke}}
    if(nearest){var ka=Math.atan2(nearest.y-k.y,nearest.x-k.x);k.angle=ka;
      k.x+=Math.cos(ka)*k.speed;k.y+=Math.sin(ka)*k.speed;
      if(nd<(nearest.r+k.r)*(nearest.r+k.r)){
        var killed=damageEnemy(g,nearest,k.dmg,"kite");
        snd("kiteHit");spawnInk(g,k.x,k.y,6,"accent");shake(g,2,3);g.kites.splice(i,1);continue}}
    else{k.x+=Math.cos(k.life*0.1)*k.speed*0.3;k.y+=Math.sin(k.life*0.1)*k.speed*0.3}
    k.x=cl(k.x,A.l,A.r);k.y=cl(k.y,A.t,A.b)}

  // frosts (裂冰诀)
  for(var i=g.frosts.length-1;i>=0;i--){var fr=g.frosts[i];fr.life--;
    if(fr.life<=0){g.frosts.splice(i,1);continue}
    var frR=fr.r*(fr.life/fr.maxLife);g.enemies.forEach(function(e){if(e.hp>0){var mr=frR+e.r;if(dstSq(fr,e)<mr*mr)e.slowT=Math.max(e.slowT,20)}})}

  markPerf(g);

  // wave check
  if(g.enemies.length===0&&g.announceT<=0&&!g.waveCleared){
    g.waveCleared=true;g.waveClearT=50;
    spawnInk(g,p.x,p.y,18,"accent");
    var sCol={calm:"ghost",ash:"ash",well:"moss",mask:"ghost",lantern:"gold",inkpool:"ink"}[g.stage?g.stage.id:"calm"]||"accent";
    for(var wci=0;wci<12;wci++){var wca=wci*Math.PI*2/12;
      spawnP(g,p.x+Math.cos(wca)*40,p.y+Math.sin(wca)*40,sCol,2)}
    // screen center celebration burst
    for(var cbi=0;cbi<16;cbi++){var cba=cbi*Math.PI*2/16;
      spawnP(g,W/2+Math.cos(cba)*rn(20,60),H/2+Math.sin(cba)*rn(15,40),sCol,2)}
    var wcl=g.announce?g.announce.split(" · ")[0]:"";
    var wcEl=document.getElementById("waveClear");
    if(wcEl)wcEl.textContent=wcl?wcl+" · 完成":"波次完成";
    if(wcEl){wcEl.classList.remove("is-active");void wcEl.offsetWidth;wcEl.classList.add("is-active")}
    snd("waveClear");
  }
  if(g.waveCleared){g.waveClearT--;if(g.waveClearT>0){updateHUD(g);return}
    g.waveCleared=false;g.waveClearT=0;
    g.wave++;
    if(g.wave>=WAVE_BUDGETS.length){g.state="victory";g.freezeT=35;
      for(var vi=0;vi<60;vi++){var va=rn(0,Math.PI*2),vr=rn(30,160);
        spawnP(g,p.x+Math.cos(va)*vr,p.y+Math.sin(va)*vr,"accent",3)}
      spawnInk(g,p.x,p.y,40,"accent");spawnInk(g,p.x,p.y,25,"gold");
      var wcol=g.weapon.type==="melee"?C.ink:g.weapon.type==="ranged"?C.moss:
        g.weapon.type==="aoe"?"rgba(77,97,86,0.8)":C.gold;
      spawnInk(g,p.x,p.y,30,wcol);
      shake(g,28,8);
      pushLimited(g.floatTexts,{x:W/2,y:H/2-60,text:g.weapon.name+" · 走阴完毕",life:90,maxLife:90,reason:"victory"},LIMITS.floatTexts);
      return}
    showRelic(g)}
  // Pending deathbursts (frame-based)
  if(g.pendingDeathbursts&&g.pendingDeathbursts.length>0){
    for(var dbi=g.pendingDeathbursts.length-1;dbi>=0;dbi--){
      var db=g.pendingDeathbursts[dbi];db.timer--;
      if(db.timer<=0){
        if(dstSq(p,{x:db.x,y:db.y})<db.r*db.r+p.r*p.r&&p.invTimer<=0)
          hurtP(g,db.dmg,{x:db.x,y:db.y});
        spawnInk(g,db.x,db.y,10,"accent");shake(g,4,3);
        g.pendingDeathbursts.splice(dbi,1)}}}
  updateHUD(g);
}

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
  // ink wipe transition
  if(g.inkWipe>0){
    var wipeProg=g.inkWipe/30;
    var wipeR=wipeProg*Math.sqrt(W*W+H*H)*0.6;
    c.fillStyle=C.ink;c.beginPath();
    c.rect(0,0,W,H);
    c.arc(W/2,H/2,Math.max(1,wipeR),0,Math.PI*2,true);
    c.fill();c.globalAlpha=1}

  // fires / ink trails
  g.fires.forEach(function(f){var ml=f.maxLife||f.life;var t=f.life/ml;var a=t*0.5;var rr=Math.max(1,f.r*Math.pow(t,0.7));
    if(f.slow){c.globalAlpha=a;c.fillStyle="rgba(23,19,16,0.35)";c.beginPath();
      c.arc(f.x,f.y,rr,0,Math.PI*2);c.fill()}
    else{c.globalAlpha=a;c.fillStyle=C.fire;c.shadowColor=C.fire;c.shadowBlur=12;
      c.beginPath();c.arc(f.x,f.y,rr,0,Math.PI*2);c.fill();
      c.shadowBlur=0;c.globalAlpha=a*0.5;c.fillStyle="#f7efe5";
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

  // enemy proj
  g.eProj.forEach(function(ep){
    c.globalAlpha=0.3;c.fillStyle=C.soft;
    c.beginPath();c.arc(ep.x-ep.vx*0.5,ep.y-ep.vy*0.5,ep.r*0.6,0,Math.PI*2);c.fill();
    c.globalAlpha=0.85;c.fillStyle=C.soft;c.shadowColor=C.ink;c.shadowBlur=6;
    c.beginPath();c.arc(ep.x,ep.y,ep.r,0,Math.PI*2);c.fill();c.shadowBlur=0;
    c.globalAlpha=0.4;c.fillStyle="#f7efe5";
    c.beginPath();c.arc(ep.x,ep.y,ep.r*0.35,0,Math.PI*2);c.fill();
    c.globalAlpha=1});
  // off-screen enemy projectile warnings (edge indicators for incoming threats)
  g.eProj.forEach(function(ep){
    var dx=ep.x-p.x,dy=ep.y-p.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d>120&&d<280){
      var a=Math.atan2(dy,dx);
      var ix=cl(p.x+Math.cos(a)*90,A.l+8,A.r-8);
      var iy=cl(p.y+Math.sin(a)*90,A.t+8,A.b-8);
      var pulse=0.3+0.2*Math.sin(g.time*0.3);
      c.globalAlpha=pulse;c.fillStyle=C.accent;
      c.beginPath();c.arc(ix,iy,3,0,Math.PI*2);c.fill();
      c.globalAlpha=1}});

  // attacks
  g.attacks.forEach(function(atk){
    var prog=1-atk.life/atk.maxLife;
    if(atk.type==="dashSlash"){
      c.save();c.translate(atk.x,atk.y);c.rotate(atk.angle);
      var dR=atk.range*(0.5+prog*0.5);
      // motion trail
      c.globalAlpha=0.2*(1-prog);c.strokeStyle=C.accent;c.lineWidth=8+prog*8;c.lineCap="round";
      c.beginPath();c.arc(0,0,dR,-atk.arc/2,atk.arc/2);c.stroke();
      // main arc
      c.globalAlpha=0.7*(1-prog);c.lineWidth=4+prog*5;
      c.shadowColor=C.accent;c.shadowBlur=14;c.beginPath();
      c.arc(0,0,dR,-atk.arc/2,atk.arc/2);c.stroke();
      // bright core
      c.shadowBlur=0;c.globalAlpha=0.5*(1-prog);c.strokeStyle="#f7efe5";c.lineWidth=1.5;c.beginPath();
      c.arc(0,0,dR*0.95,-atk.arc/2,atk.arc/2);c.stroke();
      // umbrella ribs radiating from center
      c.globalAlpha=0.18*(1-prog);c.strokeStyle=C.accent;c.lineWidth=1;
      for(var di=0;di<5;di++){var da=-atk.arc/2+atk.arc*(di+0.5)/5;
        c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(da)*dR*1.1,Math.sin(da)*dR*1.1);c.stroke()}
      c.restore();
    }else if(atk.type==="slash"){
      c.save();c.translate(atk.x,atk.y);c.rotate(atk.angle);
      var sR=atk.range*(0.6+prog*0.4);
      c.globalAlpha=0.6*(1-prog);c.strokeStyle=C.ink;c.lineWidth=3+prog*4;c.lineCap="round";
      c.shadowColor=C.ink;c.shadowBlur=8;c.beginPath();
      c.arc(0,0,sR,-atk.arc/2,atk.arc/2);c.stroke();
      c.shadowBlur=0;
      // white inner arc for sharpness
      c.globalAlpha=0.35*(1-prog);c.strokeStyle="#f7efe5";c.lineWidth=1.5;c.beginPath();
      c.arc(0,0,sR*0.92,-atk.arc/2,atk.arc/2);c.stroke();
      // ink splatter dots along arc
      c.globalAlpha=0.3*(1-prog);c.fillStyle=C.ink;
      for(var si=0;si<4;si++){var sa=-atk.arc/2+atk.arc*(si+0.5)/4;
        var sd=sR+rn(-3,6);c.beginPath();c.arc(Math.cos(sa)*sd,Math.sin(sa)*sd,rn(1,2.5),0,Math.PI*2);c.fill()}
      c.restore();
    }else if(atk.type==="proj"){
      var pR=atk.r||8;
      var pCol=atk.bounced?C.accent:atk.echo?"rgba(163,58,45,0.7)":C.moss;
      var pShadow=atk.bounced?C.accent:atk.echo?C.accent:C.moss;
      c.fillStyle=pCol;
      // 3-frame fading trail
      c.globalAlpha=0.15;c.beginPath();c.arc(atk.x-atk.vx*2,atk.y-atk.vy*2,pR*0.5,0,Math.PI*2);c.fill();
      c.globalAlpha=0.3;c.beginPath();c.arc(atk.x-atk.vx,atk.y-atk.vy,pR*0.7,0,Math.PI*2);c.fill();
      c.globalAlpha=0.85;c.shadowColor=pShadow;c.shadowBlur=10;
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
      // ripple rings (decorative concentric)
      c.globalAlpha=0.12*(1-prog);c.strokeStyle=C.moss;c.lineWidth=1;
      for(var ri=0;ri<3;ri++){var rr=r*(0.35+ri*0.2);c.beginPath();c.arc(atk.x,atk.y,rr,0,Math.PI*2);c.stroke()}
      // outer ring
      c.globalAlpha=0.5*(1-prog);c.strokeStyle=C.moss;c.lineWidth=4+prog*6;
      c.shadowColor=C.moss;c.shadowBlur=14;c.beginPath();c.arc(atk.x,atk.y,r,0,Math.PI*2);c.stroke();
      // inner bright edge
      c.shadowBlur=0;c.globalAlpha=0.2*(1-prog);c.strokeStyle="#f7efe5";c.lineWidth=1.5;
      c.beginPath();c.arc(atk.x,atk.y,r*0.88,0,Math.PI*2);c.stroke();
      c.globalAlpha=1;
    }
  });

  // enemies
  g.enemies.forEach(function(e){if(e.hp<=0&&(!e.deathT||e.deathT<=0))return;
    var by=Math.sin(e.bob)*2;c.save();c.translate(e.x,e.y+by);
    // spawn fade-in
    if(e.spawnGraceT>0){var sg=e.spawnGraceT/30;var invSg=1-sg;
      var bounceScale=0.18+0.82*Math.pow(invSg,0.55)+0.12*Math.sin(invSg*Math.PI)*Math.pow(sg,2);
      c.globalAlpha=Math.min(1,invSg*1.3);
      c.scale(bounceScale,bounceScale);
      c.globalAlpha=Math.max(0,sg*0.7);c.strokeStyle=C.accent;c.lineWidth=2.5*sg+0.5;
      c.shadowColor=e.isBoss?C.accent:C.ink;c.shadowBlur=16*sg;
      c.beginPath();c.arc(0,0,e.r+18*sg,0,Math.PI*2);c.stroke();c.shadowBlur=0;
      c.globalAlpha=Math.max(0,sg*0.5);c.strokeStyle="#f7efe5";c.lineWidth=1.5;
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
        c.shadowColor=C.accent;c.shadowBlur=18*(1-dt);
        for(var dri=0;dri<3;dri++){c.beginPath();c.arc(0,0,e.r+14+(1-dt)*30+dri*10,0,Math.PI*2);c.stroke()}
        c.shadowBlur=0;
        c.globalAlpha=Math.max(0,dt*0.7-0.3);c.fillStyle="#f7efe5";
        c.beginPath();c.arc(0,0,e.r*dt,0,Math.PI*2);c.fill();
      }
      c.globalAlpha=dt}
    if(e.hitFlash>0){c.globalAlpha=0.5+0.15*e.hitFlash;c.fillStyle="#fff";c.beginPath();
      c.arc(0,0,e.r+4,0,Math.PI*2);c.fill();
      c.globalAlpha=0.15*e.hitFlash;c.strokeStyle=C.accent;c.lineWidth=2;c.beginPath();
      c.arc(0,0,e.r+6,0,Math.PI*2);c.stroke();c.globalAlpha=1}
    if(e.elite){var ePulse=0.35+0.15*Math.sin(g.time*0.12);
      c.globalAlpha=ePulse;c.strokeStyle=C.gold;c.lineWidth=2;
      c.shadowColor=C.gold;c.shadowBlur=8;
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
    c.fillStyle=e.col;c.strokeStyle=e.edge;c.lineWidth=2;
    c.shadowColor=e.edge;c.shadowBlur=8;
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
    }else{
      c.beginPath();c.arc(0,0,e.r,0,Math.PI*2);c.fill();c.stroke()}
    c.shadowBlur=0;
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
    // 护盾环（墨盾鬼）
    if(e.hasShield&&e.shield>0){c.strokeStyle=C.ink;c.lineWidth=2;c.globalAlpha=0.5;c.setLineDash([4,4]);
      c.beginPath();c.arc(0,0,e.r+6,0,Math.PI*2*(e.shield/e.maxShield));c.stroke();c.setLineDash([]);c.globalAlpha=1}
    // 召唤者标记（纸鸢匠）
    if(e.summoner){c.strokeStyle=C.gold;c.lineWidth=1.5;c.globalAlpha=0.55;c.setLineDash([3,5]);
      c.beginPath();c.arc(0,0,e.r+10,0,Math.PI*2);c.stroke();c.setLineDash([]);c.globalAlpha=1}
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
  c.fillStyle=C.ink;c.shadowColor=C.ink;c.shadowBlur=10;
  c.beginPath();c.arc(0,0,p.r,0,Math.PI*2);c.fill();c.shadowBlur=0;
  // weapon type ring with idle pulse
  var wCol=g.weapon.type==="melee"?C.accent:g.weapon.type==="ranged"?C.moss:
    g.weapon.type==="aoe"?"rgba(77,97,86,0.6)":C.gold;
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
  c.globalAlpha=1;
  var idlePulse=Math.min(1,p.idleT/90);var pulseAlpha=0.3+0.18*Math.sin(g.time*0.06)*idlePulse;
  var pulseR=p.r+2+Math.sin(g.time*0.05)*2*idlePulse;
  c.strokeStyle=wCol;c.lineWidth=2;c.beginPath();c.arc(0,0,pulseR,0,Math.PI*2);c.stroke();
  // idle glow aura
  if(idlePulse>0.5){
    c.globalAlpha=pulseAlpha*0.5;c.fillStyle=wCol;c.shadowColor=wCol;c.shadowBlur=10+6*Math.sin(g.time*0.07);
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
  c.strokeStyle="#f7efe5";c.lineWidth=2;c.lineCap="round";c.beginPath();
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
  // dodge cooldown arc
  if(p.dodgeCd>0){var dcProg=p.dodgeCd/TUNING.dodgeCooldown;c.strokeStyle="rgba(23,19,16,0.25)";c.lineWidth=2;
    c.beginPath();c.arc(0,0,p.r+14,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-dcProg));c.stroke()}
  // perfect dodge ring (justDodged window)
  if(p.justDodged&&p.justDodgedT>0){var jdProg=p.justDodgedT/TUNING.justDodgedWindow;
    c.globalAlpha=jdProg*0.6;c.strokeStyle=C.gold;c.lineWidth=2;
    c.shadowColor=C.gold;c.shadowBlur=6;
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
  c.globalAlpha=1;c.restore();

  // 连段计数 (enhanced combo display)
  if(p.comboCount>1){var cc=p.comboCount;
    var comboSin=Math.sin(g.time*0.18);var comboScale=1+Math.min(cc,20)*0.015+comboSin*0.03*Math.min(cc,10);
    var comboAlpha=0.65+Math.min(cc,15)*0.025;
    // progressive color palette
    if(cc>=20){c.fillStyle=C.accent;c.shadowColor=C.fire;c.shadowBlur=14+comboSin*6}
    else if(cc>=15){c.fillStyle=C.fire;c.shadowColor=C.accent;c.shadowBlur=10+comboSin*4}
    else if(cc>=10){c.fillStyle=C.accent;c.shadowColor="rgba(163,58,45,0.6)";c.shadowBlur=8+comboSin*3}
    else if(cc>=7){c.fillStyle="#6b3a5c";c.shadowColor="rgba(107,58,92,0.4)";c.shadowBlur=4+comboSin*2}
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
  g.enemies.forEach(function(e){
    if(e.hp<=0||e.spawnGraceT>0)return;
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

  // particles
  g.particles.forEach(function(pt){var alpha=pt.life/pt.maxLife;c.globalAlpha=alpha*0.7;
    c.fillStyle=PCOL[pt.type]||C.ink;
    var ps=Math.max(0.5,pt.size*alpha);
    if(pt.type==="fire"){
      // teardrop for fire
      c.beginPath();c.arc(pt.x,pt.y+ps*0.2,ps*0.6,0,Math.PI*2);c.fill();
      c.beginPath();c.moveTo(pt.x,pt.y-ps);c.lineTo(pt.x-ps*0.5,pt.y+ps*0.3);
      c.lineTo(pt.x+ps*0.5,pt.y+ps*0.3);c.closePath();c.fill();
    }else if(pt.type==="soul"){
      // diamond for soul
      c.beginPath();c.moveTo(pt.x,pt.y-ps);c.lineTo(pt.x+ps*0.6,pt.y);
      c.lineTo(pt.x,pt.y+ps);c.lineTo(pt.x-ps*0.6,pt.y);c.closePath();c.fill();
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

  // floatTexts (判词 + 连段 + 伤害数字)
  g.floatTexts.forEach(function(ft){
    var a=ft.life/ft.maxLife;
    if(ft.reason==="comboBreak"){
      c.globalAlpha=a*0.6;c.fillStyle=C.soft;
      c.font='400 '+(12*a)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="dmg"){
      c.globalAlpha=cl(a,0,1)*0.75;c.fillStyle=C.ink;
      c.font='500 '+(11+(1-a)*3)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="critDmg"){
      c.globalAlpha=cl(a,0,1)*0.9;c.fillStyle=C.accent;
      c.font='700 '+(14+(1-a)*5)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="weakDmg"){
      c.globalAlpha=cl(a,0,1)*0.85;c.fillStyle=C.moss;
      c.font='600 '+(13+(1-a)*4)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="hint"){
      c.globalAlpha=cl(a*1.5,0,0.8);c.fillStyle=C.ash;
      c.font='400 14px "STKaiti","KaiTi",serif';c.textAlign="center";
    }else if(ft.reason==="streak"){
      c.globalAlpha=cl(a,0,1);c.fillStyle=C.accent;
      c.font='900 '+(28+(1-a)*12)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
      c.shadowColor=C.accent;c.shadowBlur=12;
      c.fillText(ft.text,ft.x,ft.y);c.shadowBlur=0;return;
    }else if(ft.reason==="soul"){
      c.globalAlpha=cl(a,0,1)*0.75;c.fillStyle="rgba(100,140,120,0.9)";
      c.font='500 '+(11+(1-a)*2)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="heal"){
      c.globalAlpha=cl(a,0,1)*0.85;c.fillStyle=C.moss;
      c.font='600 '+(12+(1-a)*3)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }else if(ft.reason==="synergy"){
      c.globalAlpha=cl(a,0,1);c.fillStyle=C.gold;
      c.font='700 '+(16+(1-a)*4)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
      c.shadowColor=C.gold;c.shadowBlur=8;
      c.fillText(ft.text,ft.x,ft.y);c.shadowBlur=0;return;
    }else{
      c.globalAlpha=cl(a,0,1)*0.9;c.fillStyle=C.accent;
      c.font='600 '+(14+(1-a)*6)+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="center";
    }
    c.fillText(ft.text,ft.x,ft.y);
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
    c.shadowColor="rgba(241,230,212,0.8)";c.shadowBlur=4;
    var bossName;
    if(e.type==="mojiangjun"){
      var mjRatio=e.hp/e.maxHp;
      bossName=e.name+(mjRatio<=0.25?" · 狂书":mjRatio<=0.6?" · 召书":"");
    }else{
      bossName=e.enraged?e.name+" · 狂":e.name;
    }
    c.fillText(bossName,W/2,by-4);c.shadowBlur=0}});

  // 处决闪光
  if(g.execFlash&&g.freezeT>4){var ef=g.execFlash;
    c.globalAlpha=(g.freezeT-4)/5*0.6;c.fillStyle=C.accent;
    c.beginPath();c.arc(ef.x,ef.y,40+rn(0,10),0,Math.PI*2);c.fill();
    c.globalAlpha=(g.freezeT-4)/5*0.3;c.fillStyle="#fff";
    c.beginPath();c.arc(ef.x,ef.y,20,0,Math.PI*2);c.fill();c.globalAlpha=1}
  if(g.freezeT<=0)g.execFlash=null;

  // wave progress bar (bottom edge)
  if(g.waveTotal>0&&g.state==="playing"){
    var alive=g.enemies.filter(function(e){return e.hp>0}).length;
    var wpRatio=1-alive/g.waveTotal;
    var wpW=200,wpX=W/2-wpW/2,wpY=H-16,wpH=3;
    c.globalAlpha=0.2;c.fillStyle=C.ink;c.fillRect(wpX-1,wpY-1,wpW+2,wpH+2);
    c.globalAlpha=0.65;c.fillStyle=C.accent;c.fillRect(wpX,wpY,wpW*wpRatio,wpH);
    if(wpRatio>0.8){c.globalAlpha=0.3;c.shadowColor=C.accent;c.shadowBlur=6;
      c.fillRect(wpX,wpY,wpW*wpRatio,wpH);c.shadowBlur=0}
    c.globalAlpha=0.5;c.font='400 11px "STKaiti","KaiTi",serif';c.fillStyle=C.ash;c.textAlign="center";
    c.fillText(alive>0?"第"+(g.wave+1)+"波 · 余"+alive:"波次清除",W/2,wpY-5);
    c.globalAlpha=1}

  // kill streak
  if(g.killStreak>=2&&g.killStreakT>0){
    var ksA=cl(g.killStreakT/30,0,1);
    c.globalAlpha=ksA*0.85;c.fillStyle=C.accent;
    c.font='700 '+(16+Math.min(g.killStreak,8))+'px "STKaiti","KaiTi","Kaiti SC",serif';c.textAlign="right";
    c.fillText(g.killStreak+"连斩",W-40,H-40);
    // score multiplier
    var ksMul=1+Math.min(g.killStreak*0.1,2.0);
    if(ksMul>1.1){c.globalAlpha=ksA*0.6;c.fillStyle=C.gold;
      c.font='600 12px "STKaiti","KaiTi",serif';
      c.fillText("x"+ksMul.toFixed(1),W-40,H-22)}
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
  if(g.enemies.length>0){
    var mmS=80,mmX=12,mmY=H-mmS-12,mmCx=mmX+mmS/2,mmCy=mmY+mmS/2;
    var p=g.player;
    c.globalAlpha=0.35;c.fillStyle=C.ink;c.fillRect(mmX,mmY,mmS,mmS);
    c.strokeStyle="rgba(23,19,16,0.2)";c.lineWidth=1;c.strokeRect(mmX,mmY,mmS,mmS);
    // scale: map game area to minimap
    var mmScale=mmS/Math.max(A.r-A.l,A.b-A.t);
    g.enemies.forEach(function(e){
      var ex=mmCx+(e.x-p.x)*mmScale,ey=mmCy+(e.y-p.y)*mmScale;
      if(ex<mmX||ex>mmX+mmS||ey<mmY||ey>mmY+mmS)return;
      c.globalAlpha=e.isBoss?0.8:e.elite?0.65:0.45;
      c.fillStyle=e.isBoss?C.accent:e.elite?C.gold:C.ink;
      var er=e.isBoss?3:e.elite?2.5:1.5;
      c.beginPath();c.arc(ex,ey,er,0,Math.PI*2);c.fill();
    });
    // player dot
    c.globalAlpha=0.9;c.fillStyle="#f7efe5";
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
      "kite:"+g.kites.length+" frs:"+g.frosts.length+" kills:"+g.kills+" shields:"+p2.shieldStack,
      "peak a:"+peaks.attacks+" p:"+peaks.particles+" f:"+peaks.fires+" e:"+peaks.eProj,
      "peak t:"+peaks.floatTexts+" d:"+peaks.decoys+" k:"+peaks.kites+" fr:"+peaks.frosts,
      "pressure:"+(g.perf.pressure*100).toFixed(0)+"% rng:"+(p2.stats.range*g.weapon.range).toFixed(0)+" combo:"+p2.comboCount,
      "x:"+p2.x.toFixed(0)+" y:"+p2.y.toFixed(0)
    ];
    if(srcLine)lines.push(srcLine);
    c.globalAlpha=0.72;c.fillStyle="#000";c.fillRect(W-260,4,256,14+lines.length*14);
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
    }
    c.globalAlpha=1;
  }
  // vignette
  screenFlash(c,W,H,1,'rgba(0,0,0,0)','rgba(23,19,16,0.15)',0.3,0.7);
  c.globalAlpha=1;
  // hurt flash (player hit)
  if(p.hurtFlash>0){screenFlash(c,W,H,(p.hurtFlash/12)*0.25,'rgba(0,0,0,0)','rgba(163,58,45,1)',0.25,0.55);c.globalAlpha=1}
  // crit flash (landed critical hit)
  if(g.critFlash>0){screenFlash(c,W,H,(g.critFlash/12)*0.25,'rgba(220,180,60,0.15)','rgba(220,180,60,0)',0.15,0.5);c.globalAlpha=1}
  // boss flash (boss damage taken)
  if(g.bossFlash>0){screenFlash(c,W,H,(g.bossFlash/12)*0.3,'rgba(0,0,0,0)','rgba(107,58,92,1)',0.2,0.5);c.globalAlpha=1}
  // slow motion vignette
  if(g.slowMo>0){
    var smA=g.slowMo/30*0.15;
    screenFlash(c,W,H,smA,'rgba(23,19,16,0.2)','rgba(23,19,16,0)',0.15,0.5);c.globalAlpha=1}
  // low hp vignette warning
  if(p.hp>0&&p.hp<=p.maxHp*TUNING.lowHpThreshold){
    var lhpRatio=1-(p.hp/(p.maxHp*TUNING.lowHpThreshold));
    var lhpA=0.06+lhpRatio*0.12+0.04*Math.sin(g.time*0.12);
    screenFlash(c,W,H,lhpA,'rgba(163,58,45,0.3)','rgba(163,58,45,0)',0.2,0.55);c.globalAlpha=1}

  // 暂停遮罩
  if(g.state==="paused"){
    c.fillStyle="rgba(23,19,16,0.35)";c.fillRect(0,0,W,H);
    c.fillStyle=C.paper;c.font='700 36px "STKaiti","KaiTi",serif';c.textAlign="center";
    c.fillText("暂停",W/2,H/2-10);
    c.font='400 16px "STKaiti","KaiTi",serif';c.globalAlpha=0.7;
    c.fillText("按 ESC 继续",W/2,H/2+22);c.globalAlpha=1}

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
  // Mobile controls render hook
  if(window._renderMobileControls)window._renderMobileControls(c,W,H);
}

function drawBlob(c,x,y,r,n){
  c.beginPath();
  for(var i=0;i<=n;i++){var a=(i/n)*Math.PI*2,rr=r+Math.sin(a*3)*r*0.15;
    var px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
    if(i===0)c.moveTo(px,py);else c.lineTo(px,py)}
  c.closePath();c.fill();c.stroke()}

var _lastHp=-1;
function updateHUD(g){
  var p=g.player;
  var st=g.stage?getStageDef(g.stage.id):null;
  var el=document.getElementById("hpFill");
  if(el){
    el.style.width=(p.hp/p.maxHp*100)+"%";
    if(_lastHp>=0&&p.hp>_lastHp){el.classList.remove("is-healed");void el.offsetWidth;el.classList.add("is-healed")}
    _lastHp=p.hp;
  }
  el=document.getElementById("hpText");if(el)el.textContent=Math.ceil(p.hp);
  el=document.getElementById("hudWeapon");if(el){
    var wn=g.weapon.name;
    if(g.evolution)wn+=" → "+g.evolution.name;
    if(g.evolution2)wn+=" + "+g.evolution2.name;
    el.textContent=wn}
  el=document.getElementById("waveInfo");if(el){
    var diffTag={normal:"",hard:"险途 · ",nightmare:"噩梦 · "}[g.diff]||"";
    el.textContent=diffTag+(g.announce||"第"+(g.wave+1)+"波")+(st&&st.name!=="净坛"?" · "+st.name:"")}
  el=document.getElementById("killCount");if(el){
    var rs=Math.floor(g.time/60),rm=Math.floor(rs/60);rs=rs%60;
    el.textContent="斩祟 "+g.kills+" · "+(rm<10?"0":"")+rm+":"+(rs<10?"0":"")+rs}
  var h="";g.relics.forEach(function(r){h+='<span class="hud__relic-tag">'+r.name+'</span>'});
  if(g.evolution)h+='<span class="hud__relic-tag" style="background:rgba(163,58,45,0.18)">'+g.evolution.name+'</span>';
  if(g.evolution2)h+='<span class="hud__relic-tag" style="background:rgba(163,58,45,0.18)">'+g.evolution2.name+'</span>';
  el=document.getElementById("hudRelics");if(el)el.innerHTML=h;
}

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
  var evoCount=(g.evolution?1:0)+(g.evolution2?1:0);
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
    {c:function(s){return s.weaponType==="melee"||s.ownedTags["暴击"]},n:7,w:"暴击触发"}]
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

function relicCardHtml(r,cls){
  var debug=window._showDebug&&r._pickWhy?'<div class="relic-pick__debug">权重 '+r._pickScore+' · '+r._pickWhy+'</div>':"";
  return'<div class="relic-pick '+(cls||"")+'" data-relic="'+r.id+'"><h4>'+r.name+'</h4>'+
    '<div class="relic-pick__type"><span class="relic-type-badge">'+r.type+'</span> '+r.tags.join(" ")+'</div>'+
    '<p>'+r.effect+'</p>'+debug+'</div>'
}

function showRelic(g){
  var p=g.player;var oldHp=p.hp;
  if(!p.noWaveHeal){p.hp=Math.min(p.maxHp,p.hp+Math.floor(p.maxHp*0.2));
    if(p.hp>oldHp)spawnInk(g,p.x,p.y,8,"moss")}
  snd("relicPickup");
  var isEvo=!p.noEvolution&&(g.wave===3||g.wave===6);
  if(isEvo)showHint(g,"evo","选择一项武器进化 — 强化你的攻击方式");
  else showHint(g,"relic","选择一件遗物 — 它会强化你的构筑");
  var pool,choices;
  if(isEvo){
    var wtype=g.weapon.type;
    pool=(EVOLUTIONS[wtype]||[]).filter(function(e){return !g.evolution||e.id!==g.evolution.id});
    if(pool.length===0){isEvo=false;choices=pickRelicChoices(g)}
    else choices=pickEvolutionChoices(g,pool);
  }else{
    choices=pickRelicChoices(g);
  }
  var el=document.getElementById("relicChoices");
  var sealEl=document.getElementById("relicSeal");
  var popupEl=document.getElementById("relicPopup");
  if(!el||!sealEl||!popupEl)return;
  if(!choices||!choices.length){g.state="playing";startWave(g);return}
  if(isEvo){
    sealEl.textContent=g.wave===6?"再进化":"进化";
    el.innerHTML=choices.map(function(r){return relicCardHtml(r,"relic-pick--evo")}).join("");
  }else{
    sealEl.textContent="得物";
    el.innerHTML=choices.map(function(r){return relicCardHtml(r,"")}).join("");
  }
  popupEl.style.display="";
  g.state="waveClear";
  el.onmouseover=function(ev){if(ev.target.closest&&ev.target.closest("[data-relic]"))snd("uiBlip")};
  el.onclick=function(ev){
    var node=ev.target;
    if(node&&node.nodeType!==1)node=node.parentElement;
    var card=node&&node.closest?node.closest("[data-relic]"):null;
    if(!card)return;
    var item=choices.filter(function(r){return r.id===card.dataset.relic})[0];
    if(!item)return;snd(isEvo?"evoPickup":"relicPickup");
    el.onclick=null;
    if(isEvo){if(!g.evolution)g.evolution=item;else g.evolution2=item}else{
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
    item.fn(g.player);
    if(g.player.relicPower>1){
      var rp=g.player.relicPower;
      g.player.soulDmg=Math.floor(g.player.soulDmg*rp);
      g.player.killHeal=Math.floor(g.player.killHeal*rp);
      if(g.player.decoyHP>0)g.player.decoyHP=Math.floor(g.player.decoyHP*rp);
      g.player.stats.dmg+=(rp-1)*0.12;
      g.player.stats.critDmg+=(rp-1)*0.2}
    spawnInk(g,g.player.x,g.player.y,12,"accent");
    g.relicFlash=12;
    popupEl.style.display="none";
    g.state="playing";startWave(g)};
}

function showEnd(g){
  if(g.ended)return;g.ended=true;
  metaRecordRun(g);
  if(window.GameSound)GameSound.stopAmbient();
  snd(g.state==="victory"?"victory":"gameOver");
  var won=g.state==="victory";
  var diffLabel={normal:"平常",hard:"险途",nightmare:"噩梦"}[g.diff]||"平常";
  var diffColor={normal:"var(--ash)",hard:"var(--accent)",nightmare:"#c4523d"}[g.diff]||"var(--ash)";
  var secs=Math.floor(g.time/60);var mins=Math.floor(secs/60);secs=secs%60;
  var timeStr=(mins<10?"0":"")+mins+":"+(secs<10?"0":"")+secs;
  var subtitle=won?(g.diff==="nightmare"?"噩梦地宫，一命通关，万邪辟易。":
    g.diff==="hard"?"险途已清，胆识过人。":
    "地宫已清，你的名号将记在走阴录上。"):
    (g.diff==="nightmare"?"噩梦未竟，魂散地宫。":
    g.diff==="hard"?"险途折戟，来日再战。":
    "纸灰掩面，你的走阴之路到此为止。");
  var el=document.getElementById("endTitle");if(el)el.textContent=won?"走阴完毕":"魂归黄泉";
  el=document.getElementById("endSubtitle");if(el)el.textContent=subtitle;
  var evo=(g.evolution?g.evolution.name:"无")+(g.evolution2?" + "+g.evolution2.name:"");
  var buildLine=g.weapon.name+" → "+evo;
  var relicNames=g.relics.map(function(r){return r.name}).join(" · ");
  var grade=calcGrade(g);
  var gradeColors={S:"#c4523d","甲":"var(--accent)","乙":"var(--ink-soft)","丙":"var(--ash)","丁":"var(--ash)"};
  var isNewBest=g.wave>=meta.bestWave;
  var relicCount=Object.keys(meta.relicsDiscovered).length;
  el=document.getElementById("endStats");
  if(el)el.innerHTML=
    "<div style='font-family:var(--title-face);font-size:2.4rem;color:"+(gradeColors[grade]||"var(--ink)")+
    ";margin-bottom:8px;letter-spacing:0.1em'>"+grade+"</div>"+
    "<span style='color:"+diffColor+";font-weight:600'>"+diffLabel+"</span> · 历时 "+timeStr+
    " · 斩祟 "+g.kills+" · 波次 "+g.wave+"/"+WAVE_BUDGETS.length+" · 遗物 "+g.relics.length+"件"+
    "<br><span class='end-build'>"+buildLine+"</span>"+
    (relicNames?"<br><span class='end-relics'>"+relicNames+"</span>":"")+
    (isNewBest?"<br><span style='color:var(--accent);font-weight:600'>新纪录！</span>":"")+
    "<br><span style='font-size:0.78rem;color:var(--ash);margin-top:6px;display:inline-block'>"+
    "累计 "+meta.totalRuns+" 次走阴 · 斩祟 "+meta.totalKills+" · 图鉴 "+relicCount+"/"+RELICS.length+"</span>";
  el=document.getElementById("gameOver");if(el)el.style.display="";
}

function setupWeaponSelect(){
  var el=document.getElementById("weaponChoices");
  el.innerHTML=WEAPONS.map(function(w){
    return'<div class="weapon-pick" data-weapon="'+w.id+'"><h3>'+w.name+'</h3>'+
      '<div class="weapon-pick__tone">'+w.tone+'</div><p>'+w.blurb+'</p>'+
      '<div class="tag-row">'+w.tags.map(function(t){return'<span class="tag">'+t+'</span>'}).join("")+'</div></div>'}).join("");
  el.onclick=function(ev){var card=ev.target.closest("[data-weapon]");if(!card)return;startGame(card.dataset.weapon)};
  el.onmouseover=function(ev){var card=ev.target.closest("[data-weapon]");if(card)snd("uiBlip")};
  var tb=document.getElementById("startBtn");
  if(tb)tb.onclick=function(){
    var ts=document.getElementById("titleScreen");if(ts)ts.style.display="none";
    var ws=document.getElementById("weaponSelect");if(ws)ws.style.display="";
  };
  // Show meta stats on title screen
  var desc=document.querySelector?document.querySelector(".title-screen__desc"):null;
  if(desc&&meta.totalRuns>0){
    var relicCount=Object.keys(meta.relicsDiscovered).length;
    var clearedNames=Object.keys(meta.weaponsCleared);
    desc.innerHTML="你扮演一名替亡者走阴的夜行客，<br>手持法器深入地宫，斩妖除祟。"+
      "<br><span style='font-size:0.82rem;color:rgba(163,58,45,0.7);margin-top:4px;display:inline-block'>"+
      "走阴 "+meta.totalRuns+" 次 · 斩祟 "+meta.totalKills+" · 最高 "+meta.bestWave+" 波 · 图鉴 "+relicCount+"/"+RELICS.length+
      (meta.bestGrade?" · 最佳 "+meta.bestGrade:"")+
      "</span>";
  }
}

function startGame(wid){
  var diffEl=document.querySelector('input[name="diff"]:checked');
  var diff=diffEl?diffEl.value:"normal";
  document.getElementById("weaponSelect").style.display="none";
  document.getElementById("gameContainer").style.display="";
  document.getElementById("pauseHint").style.display="";
  G=newGame(wid,diff);
  document.body.classList.add("game-active");
  if(window.GameSound)GameSound.init();
  // Show curse selection before first wave
  showCurse(G);
}

function showCurse(g){
  if(!CURSES||CURSES.length===0){beginRun(g);return}
  var popup=document.getElementById("cursePopup");
  var choices=document.getElementById("curseChoices");
  if(!popup||!choices){beginRun(g);return}
  var pool=shuf(CURSES.slice()).slice(0,3);
  choices.innerHTML=pool.map(function(c,i){
    return'<div class="relic-pick curse-card" data-curse="'+i+'"><h4>'+c.name+'</h4>'+
      '<div class="relic-pick__type"><span class="relic-type-badge">誓印</span>'+c.tags.join(" · ")+'</div>'+
      '<p>'+c.desc+'</p></div>'}).join("")+
    '<div class="relic-pick curse-card curse-skip" data-curse="skip" style="text-align:center;opacity:0.6"><h4>不立誓</h4><p>原样进入地宫</p></div>';
  popup.style.display="";
  choices.onclick=function(ev){
    var card=ev.target.closest("[data-curse]");if(!card)return;
    var idx=card.dataset.curse;
    if(idx!=="skip"){var curse=pool[parseInt(idx)];
      curse.fn(g.player);g.curse=curse;
      snd("relicPickup");spawnInk(g,g.player.x,g.player.y,8,"fire")}
    popup.style.display="none";beginRun(g)};
}

function beginRun(g){
  var p=g.player;
  if(p.maxHpOverride>0){p.maxHp=p.maxHpOverride;p.hp=Math.min(p.hp,p.maxHp)}
  // extra start relics from curse
  if(p.extraStartRelics>0){
    for(var esi=0;esi<p.extraStartRelics;esi++){
      var rc=pickRelicChoices(g);
      if(rc.length>0){var r=rc[0];g.relics.push(r);r.fn(p)}}}
  startWave(g);updateHUD(g);canvas.focus();
  setTimeout(function(){var h=document.getElementById("controlsHint");if(h)h.classList.add("is-hidden")},3000);
}

function togglePause(){
  if(!G)return;
  var el=document.getElementById("pauseOverlay");
  if(!el)return;
  if(G.state==="playing"){G.state="paused";el.style.display="";
    var ps=document.getElementById("pauseStats");
    if(ps)ps.textContent="第 "+(G.wave+1)+" 波 · 斩祟 "+G.kills+" · 遗物 "+G.relics.length+"件";
    if(window.GameSound)GameSound.setVolume(0.1);
  }else if(G.state==="paused"){G.state="playing";el.style.display="none";
    if(window.GameSound)GameSound.setVolume(0.6);
  }
}

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
    }catch(err){console.error("render error:",err.message)}
    try{
      if(G.state==="over"||(G.state==="victory"&&G.freezeT<=0))showEnd(G);
    }catch(err){console.error("showEnd error:",err.message)}
  }
  requestAnimationFrame(loop);
}

function init(){
  canvas=document.getElementById("gameCanvas");ctx=canvas.getContext("2d");
  buildBg();
  window.addEventListener("keydown",function(e){keys[e.key.toLowerCase()]=true;
    if(e.key==="Escape")togglePause();
    if((e.key===" "||e.key==="Shift")&&G&&G.state==="playing"){
      e.preventDefault();G.player.dodgeQueued=true;
    }
    if(e.key.toLowerCase()==="t")window._showDebug=!window._showDebug;
    if(e.key.toLowerCase()==="h"){var ch=document.getElementById("controlsHint");
      if(ch)ch.classList.toggle("is-hidden")}
    if(e.key.toLowerCase()==="r"&&G&&(G.state==="over"||G.state==="victory")){
      var rb=document.getElementById("restartBtn");if(rb)rb.click()}});
  window.addEventListener("keyup",function(e){keys[e.key.toLowerCase()]=false});
  window.addEventListener("blur",function(){keys={};mouse.down=false});
  window.addEventListener("mousemove",function(e){mouse.x=e.clientX;mouse.y=e.clientY});
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
  document.getElementById("restartBtn").addEventListener("click",function(){
    document.getElementById("gameOver").style.display="none";
    document.getElementById("gameContainer").style.display="none";
    document.getElementById("pauseHint").style.display="none";
    document.getElementById("weaponSelect").style.display="";
    keys={};G=null;document.body.classList.remove("game-active")});
  document.getElementById("resumeBtn").addEventListener("click",togglePause);
  setupWeaponSelect();loop();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
