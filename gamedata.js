var W=960,H=640,A={l:28,t:28,r:W-28,b:H-28};
var WAVE_SCALE={hpPerWave:0.065,spdPerWave:0.012};
var C={paper:"#f1e6d4",edge:"#d9c9af",ink:"#171310",soft:"#2c2520",
  accent:"#a33a2d",ash:"#8d7d69",moss:"#4d6156",
  ghost:"rgba(220,210,190,0.7)",ghostE:"rgba(23,19,16,0.35)",
  fire:"#c45a2d",fireG:"rgba(196,90,45,0.3)",
  spirit:"rgba(90,140,100,0.55)",spiritG:"rgba(77,122,86,0.25)",
  boss:"#6b3a5c",bossG:"rgba(107,58,92,0.3)",
  gold:"#9c835a",goldG:"rgba(156,131,90,0.24)",
  frost:"#b8c8d4",frostE:"#7fa0b4"};

var WEAPONS=[
  {id:"jian",name:"斩妖剑",tone:"近战 / 破绽 / 处决",blurb:"三段贴身剑势，第三击挑出破绽。",
   tags:["近战","处决","暴击"],dmg:22,range:60,arc:Math.PI*0.55,cd:16,type:"melee"},
  {id:"bi",name:"符骨笔",tone:"远程 / 法术 / 魂伤",blurb:"用骨笔挥出半月墨痕，拖出魂丝。",
   tags:["远程","法术","魂"],dmg:14,range:420,arc:0,cd:20,type:"ranged",spd:7},
  {id:"ling",name:"镇魂铃",tone:"控场 / 召物 / 魂域",blurb:"铃响就是领域，怪被拉进你的节拍。",
   tags:["控场","魂","召物"],dmg:13,range:100,arc:Math.PI*2,cd:28,type:"aoe"},
  {id:"san",name:"伏魔伞",tone:"闪避 / 远程 / 反击",blurb:"撑伞吞压力，折返反击夺回节奏。",
   tags:["闪避","远程","反击"],dmg:18,range:140,arc:0,cd:26,type:"dash"}
];

var RELICS=[
  {id:"zhusha",name:"朱砂封钉",type:"凶器",tags:["处决","暴击"],effect:"暴击伤害+40%",fn:function(p){p.stats.critDmg+=0.4}},
  {id:"kuhao",name:"枯毫遗墨",type:"残器",tags:["近战","魂"],effect:"每3次攻击释放墨刃",fn:function(p){p.tripleBlade=true}},
  {id:"zhiren",name:"纸人替魄",type:"法具",tags:["闪避","生存"],effect:"受伤时替身吸收伤害",fn:function(p){p.decoyHP=30}},
  {id:"chenfu",name:"无字谶符",type:"符物",tags:["法术","魂"],effect:"攻击附带5点额外伤害",fn:function(p){p.soulDmg+=5}},
  {id:"lingshe",name:"青铜镇铃舌",type:"古铃",tags:["控场","召物"],effect:"攻击范围+25%",fn:function(p){p.stats.range+=0.25}},
  {id:"jingjuan",name:"倒写经卷",type:"残卷",tags:["远程","分裂"],effect:"攻击追加折返墨迹",fn:function(p){p.bounce=true;p.stats.returnInk+=1}},
  {id:"yedeng",name:"夜灯残烬",type:"烛具",tags:["火","击杀"],effect:"击杀留下磷火",fn:function(p){p.fireOnKill=true}},
  {id:"xianghui",name:"祟面香灰",type:"禁物",tags:["诅咒","暴击"],effect:"低血量时伤害+50%",fn:function(p){p.lowHpDmg+=0.5}},
  {id:"xuanbing",name:"玄冰简穗",type:"祠器",tags:["控场","冰"],effect:"攻击减速敌人",fn:function(p){p.slowOnHit=0.4}},
  {id:"xuezhu",name:"血烛祭片",type:"禁物",tags:["诅咒","火"],effect:"攻击范围+20%",fn:function(p){p.stats.range+=0.2}},
  {id:"dieyin",name:"鬼脊蝶印",type:"异印",tags:["魂","远程"],effect:"魂伤跳印附近敌人",fn:function(p){p.soulChain=true}},
  {id:"pojing",name:"破镜残片",type:"镜片",tags:["闪避","反击"],effect:"闪避后攻击穿透",fn:function(p){p.pierceOnDodge=true}},
  {id:"zhijia",name:"纸甲残片",type:"护具",tags:["生存","近战"],
    effect:"受到伤害减少20%",fn:function(p){p.stats.def+=0.2}},
  {id:"zouma",name:"走马灯片",type:"灯器",tags:["机动","击杀"],
    effect:"移速+15%，击杀短暂加速",fn:function(p){p.stats.spd+=0.15;p.killSpeed=true}},
  {id:"mochi",name:"墨池残砚",type:"文房",tags:["法术","近战"],
    effect:"连续命中同一目标伤害递增",fn:function(p){p.comboDmg=true}},
  {id:"zhenmu",name:"镇墓兽首",type:"镇物",tags:["反击","生存"],
    effect:"受击时反弹30%伤害",fn:function(p){p.thorns=(p.thorns||0)+0.3}},
  {id:"yindeng",name:"引魂灯笼",type:"灯器",tags:["魂","生存"],
    effect:"击杀敌人回复5点生命",fn:function(p){p.killHeal=(p.killHeal||0)+5}},
  {id:"huangquan",name:"黄泉引路",type:"路标",tags:["火","机动"],
    effect:"移动路径留下减速墨迹",fn:function(p){p.inkTrail=true}},
  {id:"nuomian",name:"傩面碎片",type:"傩物",tags:["控场","暴击"],
    effect:"暴击时恐惧周围敌人",fn:function(p){p.fearOnCrit=true}},
  {id:"molang",name:"墨龙珠",type:"珠玉",tags:["魂","远程"],
    effect:"停顿蓄势后下一击+80%伤害",fn:function(p){p.chargeDmg=0.8}},
  {id:"tongjing",name:"铜镜照妖",type:"镜器",tags:["处决","暴击"],
    effect:"暴击时暴露敌人弱点，后续伤害+25%",fn:function(p){p.weakpointDmg=(p.weakpointDmg||0)+0.25}},
  {id:"zhaohun",name:"招魂残幡",type:"幡器",tags:["生存","召物"],
    effect:"死亡一次后以30%生命复活",fn:function(p){p.revive=true}},
  {id:"gudi",name:"骨笛残声",type:"笛器",tags:["魂","击杀"],
    effect:"击杀后攻击速度大幅提升3秒",fn:function(p){p.killAtkSpd=true}},
  {id:"xuemo",name:"血墨混染",type:"禁物",tags:["诅咒","近战"],
    effect:"低血时攻击范围+40%，但受伤+25%",fn:function(p){p.lowHpRange=true;p.extraDmgTaken=(p.extraDmgTaken||0)+0.25}},
  {id:"panwen",name:"判官断文",type:"判文",tags:["处决","暴击"],
    effect:"暴击击杀短暂提升暴击率",fn:function(p){p.execCritBonus=true}},
  {id:"zhupi",name:"朱批残页",type:"判文",tags:["处决","魂"],
    effect:"击杀带弱点的敌人时附近敌人获得弱点",fn:function(p){p.weakSpread=true}},
  {id:"xueqi",name:"血契剑穗",type:"剑具",tags:["近战","处决"],
    effect:"近战击杀返还攻击冷却",fn:function(p){p.meleeCdRefund=true}},
  {id:"liuying",name:"留影伞骨",type:"伞具",tags:["闪避","反击"],
    effect:"闪避后原地留残影吸引敌人",fn:function(p){p.decoyOnDodge=true}},
  {id:"huosui",name:"火祟牙",type:"火具",tags:["火","击杀"],
    effect:"磷火击杀扩大火场半径",fn:function(p){p.fireExpand=true}},
  {id:"hunqian",name:"魂钱串",type:"魂器",tags:["魂","击杀"],
    effect:"魂伤击杀向最近敌人跳一次固定魂伤",fn:function(p){p.soulKillChain=true}},
  {id:"lingmu",name:"铃木鱼",type:"铃具",tags:["控场","魂"],
    effect:"铃命中被减速敌人时追加小魂伤",fn:function(p){p.ringSoulHit=true}},
  {id:"fanzhao",name:"返照铜片",type:"镜片",tags:["远程","分裂"],
    effect:"折返墨迹命中后留下小范围墨爆",fn:function(p){p.bounceExplosion=true}},
  {id:"guxue",name:"骨血墨",type:"禁物",tags:["诅咒","暴击"],
    effect:"暴击率+15%，非暴击伤害-20%",fn:function(p){p.stats.critRate+=0.15;p.guxuePenalty=true}},
  {id:"shouyin",name:"收阴袋",type:"袋具",tags:["生存","击杀"],
    effect:"连续击杀积攒护盾，受击清空层数",fn:function(p){p.killShield=true}},
  {id:"fengma",name:"风行纸马",type:"纸器",tags:["机动","闪避"],
    effect:"移速越高闪避冷却越短",fn:function(p){p.dodgeSpdScale=true}},
  {id:"dengxin",name:"灯油旧芯",type:"灯具",tags:["火","生存"],
    effect:"站在火场上每秒回复3HP",fn:function(p){p.fireHeal=3}},
  {id:"judou",name:"聚灵墨斗",type:"文房",tags:["法术","魂"],
    effect:"弹道体积+40%",fn:function(p){p.stats.projSize+=0.4}},
  {id:"jijiu",name:"急就章",type:"文书",tags:["法术","击杀"],
    effect:"攻速+20%",fn:function(p){p.stats.atkSpd-=0.2}},
  {id:"zhiyuan",name:"纸鸢引",type:"纸器",tags:["召物","远程"],
    effect:"每击杀5敌生成追踪纸鸢",fn:function(p){p.summonKite=true;p.kiteKills=0}},
  {id:"liebing",name:"裂冰诀",type:"祠器",tags:["冰","暴击"],
    effect:"暴击时在目标位置留下冰冻区域",fn:function(p){p.frostOnCrit=true}}
];

var EVOLUTIONS={
  melee:[
    {id:"e_pishan",name:"劈山",type:"进化",tags:["近战"],effect:"劈砍范围+30%，弧度加宽",
      fn:function(p){p.stats.range+=0.3;p.wideSlash=true}},
    {id:"e_luanwu",name:"乱舞",type:"进化",tags:["近战"],effect:"多重打击+1",
      fn:function(p){p.stats.multi+=1}},
    {id:"e_duanyue",name:"断岳",type:"进化",tags:["近战"],effect:"伤害+40%",
      fn:function(p){p.stats.dmg+=0.4}},
    {id:"e_zhemo",name:"斩魔",type:"进化",tags:["近战"],effect:"每3击释放追踪墨刃",
      fn:function(p){p.seekBlade=true}}
  ],
  ranged:[
    {id:"e_lianzhu",name:"连珠",type:"进化",tags:["远程"],effect:"弹数+1",
      fn:function(p){p.stats.multi+=1}},
    {id:"e_guanjia",name:"贯甲",type:"进化",tags:["远程"],effect:"弹道穿透敌人",
      fn:function(p){p.projPierce=true}},
    {id:"e_baolie",name:"爆裂",type:"进化",tags:["远程"],effect:"弹道命中时溅射",
      fn:function(p){p.projBurst=true}},
    {id:"e_fenmo",name:"分墨",type:"进化",tags:["远程"],effect:"大弹分裂为3颗小弹",
      fn:function(p){p.bigSplit=true}}
  ],
  aoe:[
    {id:"e_kuoyu",name:"扩域",type:"进化",tags:["控场"],effect:"范围+40%",
      fn:function(p){p.stats.range+=0.4}},
    {id:"e_gongming",name:"共鸣",type:"进化",tags:["控场"],effect:"多重+1",
      fn:function(p){p.stats.multi+=1}},
    {id:"e_zhenya",name:"镇压",type:"进化",tags:["控场"],effect:"声波命中减速3秒",
      fn:function(p){p.ringSlow=true}},
    {id:"e_shuangpin",name:"双频",type:"进化",tags:["控场"],effect:"第二圈不递减",
      fn:function(p){p.ringNoDecay=true}}
  ],
  dash:[
    {id:"e_jifeng",name:"疾风",type:"进化",tags:["突进"],effect:"移速+30%，伞击随速度增伤",
      fn:function(p){p.stats.spd+=0.3}},
    {id:"e_xuanren",name:"旋刃",type:"进化",tags:["突进"],effect:"多重+1，多段扫击",
      fn:function(p){p.stats.multi+=1}},
    {id:"e_tiebi",name:"铁壁",type:"进化",tags:["突进"],effect:"减伤+30%",
      fn:function(p){p.stats.def+=0.3}},
    {id:"e_kaihe",name:"开合",type:"进化",tags:["突进"],effect:"冲后反向补一刀",
      fn:function(p){p.dashReturn=true}}
  ]
};

var WAVES=[
  {label:"第壹波 · 纸门",mod:"calm",flavor:"纸门之后，邪祟初现。小心试探。",list:[{t:"zhikui",n:5}]},
  {label:"第贰波 · 纸灰巷",mod:"ash",flavor:"灰巷深处，纸灰迷目，游魂徘徊。",list:[{t:"zhikui",n:3},{t:"youhun",n:3},{t:"zhikuang",n:1}]},
  {label:"第叁波 · 悬井口",mod:"well",flavor:"井口之下引力难辨，焚灵与游魂交织。",list:[{t:"zhikui",n:3},{t:"youhun",n:3},{t:"fenling",n:2}]},
  {label:"第肆波 · 鬼灯廊",mod:"lantern",flavor:"鬼灯吐焰，分身鬼在暗处窥伺。",list:[{t:"youhun",n:2},{t:"gudeng",n:2},{t:"fenshen",n:2}]},
  {label:"第伍波 · 无面台",mod:"mask",flavor:"无面台上群邪毕至，食灰、僵客、墨盾齐出。",list:[{t:"zhikui",n:2},{t:"shigui",n:2},{t:"jiangshi",n:1},{t:"modun",n:1},{t:"fenshen",n:1}]},
  {label:"第陆波 · 灰潮",mod:"ash",flavor:"灰潮涌来，焚灵成群，食灰鬼挡道。",list:[{t:"shigui",n:3},{t:"fenling",n:3},{t:"gudeng",n:2},{t:"zhikuang",n:1}]},
  {label:"第柒波 · 墨池",mod:"inkpool",flavor:"墨池深处敌人暴虐。净化池水方为上策。",list:[{t:"jiangshi",n:2},{t:"youhun",n:3},{t:"gudeng",n:2},{t:"modun",n:2}]},
  {label:"第捌波 · 百鬼面",mod:"mask",flavor:"百鬼夜行，全面围攻。这是最终考验。",list:[{t:"zhikui",n:3},{t:"shigui",n:2},{t:"jiangshi",n:2},{t:"fenshen",n:2},{t:"zhikuang",n:1},{t:"modun",n:1}]},
  {label:"镇守 · 画皮堂",mod:"lantern",flavor:"画皮娘子镇守此地。她有千面，你的刀只有一面。",list:[{t:"boss",n:1},{t:"gudeng",n:1},{t:"jiangshi",n:1},{t:"zhikuang",n:1},{t:"fenshen",n:2}]}
];

var STAGE_MODS={
  calm:{name:"净坛",desc:"无特殊地势，专心试武器。"},
  ash:{name:"纸灰风",desc:"灰圈会压低步速，击杀可吹散附近纸灰。"},
  well:{name:"悬井",desc:"井口周期牵引场上单位，走位会被打乱。"},
  mask:{name:"无面戏台",desc:"非首领初死会化作残影再起一次。"},
  lantern:{name:"鬼灯阵",desc:"鬼灯会间歇吐出阴火，击杀可让灯暂歇。"},
  inkpool:{name:"墨池",desc:"墨池中敌人攻击力+30%，击杀可净化为加速区。"}
};

var ETYPE={
  zhikui:{name:"纸傀",tip:"近战小妖，数量多时注意走位",hp:45,spd:1.2,r:14,dmg:8,atkR:32,atkCd:48,col:C.ghost,edge:C.ghostE},
  youhun:{name:"游魂",tip:"远程弹射，注意闪避弹幕",hp:30,spd:1.6,r:12,dmg:6,atkR:260,atkCd:65,col:C.spirit,edge:C.moss,ranged:true,pSpd:4.5},
  fenling:{name:"焚灵",tip:"移动路径留下火场，保持距离",hp:55,spd:1.0,r:15,dmg:7,atkR:30,atkCd:50,col:C.fireG,edge:C.fire,fireTrail:true},
  shigui:{name:"食灰鬼",tip:"厚血近战，小心被围",hp:78,spd:0.85,r:17,dmg:10,atkR:34,atkCd:58,col:"rgba(141,125,105,0.45)",edge:C.ash},
  gudeng:{name:"骨灯",tip:"三方向弹射，走横向闪避",hp:42,spd:0.72,r:13,dmg:5,atkR:300,atkCd:82,col:C.goldG,edge:C.gold,ranged:true,pSpd:3.7,fanShot:3},
  jiangshi:{name:"僵客",tip:"会冲锋突进，看准蓄力时闪避",hp:88,spd:0.92,r:18,dmg:11,atkR:34,atkCd:58,col:"rgba(44,37,32,0.22)",edge:C.soft,charge:true,chargeCd:118,chargeSpeed:4.8},
  boss:{name:"画皮娘子",tip:"地宫之主，多阶段战斗",hp:320,spd:1.4,r:22,dmg:12,atkR:40,atkCd:40,col:C.bossG,edge:C.boss,isBoss:true,desperate:false},
  zhikuang:{name:"纸鸢匠",tip:"召唤小纸鸢，优先击杀",hp:52,spd:0.85,r:15,dmg:0,atkR:0,atkCd:120,col:C.goldG,edge:C.gold,
    summoner:true,summonCd:120,summonMax:4},
  fenshen:{name:"分身鬼",tip:"死后分裂为小鬼，准备追击",hp:65,spd:1.1,r:14,dmg:8,atkR:30,atkCd:50,col:"rgba(140,180,160,0.55)",edge:C.accent,
    splitter:true,splitCount:2,splitHpRatio:0.5},
  modun:{name:"墨盾鬼",tip:"自带墨盾，破盾后才有效伤害",hp:70,spd:0.8,r:16,dmg:9,atkR:32,atkCd:55,col:C.soft,edge:C.ink,
    hasShield:true,shield:30,maxShield:30,shieldRegen:300},
  mojiangjun:{name:"墨将军",tip:"古代镇墓将军，以墨为甲，以书为兵",hp:480,spd:0.8,r:28,dmg:15,atkR:45,atkCd:55,
    col:"rgba(23,19,16,0.55)",edge:C.ink,isBoss:true,desperate:false}
};

var LIMITS={particles:260,fires:72,attacks:90,eProj:90,floatTexts:18,decoys:12,kites:4,frosts:12,enemies:80};

var PREREQS={
  huosui:function(s){return !!s.ownedIds.yedeng},
  fanzhao:function(s){return s.stats.returnInk>0},
  lingmu:function(s){return s.slowOnHit>0||s.ringSlow},
  liuying:function(s){return s.weaponType==="dash"},
  pojing:function(s){return s.weaponType==="dash"},
  fengma:function(s){return s.weaponType==="dash"},
  hunqian:function(s){return !!(s.ownedIds.dieyin||(s.ownedIds.lingmu&&(s.slowOnHit>0||s.ringSlow)))},
  zhupi:function(s){return !!s.ownedIds.tongjing},
  xueqi:function(s){return s.weaponType==="melee"},
  dengxin:function(s){return !!s.ownedIds.yedeng}
};

var CAPS={critRate:0.65,bellCombo:15,shieldStack:3,atkCdFloor:4,soulChain:4,ringSoul:6};

var RANGES={weakSpread:100,fireExpand:60,fear:100,soulChain:80,burst:50,
  decoyAttract:120,chargeMax:240,chargeMin:54,rangedMin:50};

var TUNING={
  comboWindow:45,chargeThreshold:50,
  playerSpd:3.4,playerHp:100,playerR:15,
  dodgeDuration:10,dodgeCooldown:42,dodgeInvFrames:14,justDodgedWindow:28,
  hurtInvFrames:30,lowHpThreshold:0.3,bossEnrageHp:0.5,bossDesperateHp:0.25,
  bossEnrageSpdMult:1.3,reviveHpRatio:0.3,
  fastAtkCdMult:0.55,fastAtkParticleMult:0.5,
  combo3Arc:1.4,combo3Range:1.25,combo3Dmg:1.35,
  shieldStackReduction:4,inkPoolDmgMult:1.3
};

var DEATH_COLOR={zhikui:"ash",youhun:"moss",fenling:"fire",shigui:"soft",gudeng:"gold",jiangshi:"ink",boss:"accent",
  zhikuang:"ghost",fenshen:"soul",modun:"soft",mojiangjun:"ink"};

var JUDGMENTS=["斩业已断","纸命归灰","照见真形","朱批落定","一念归尘","墨尽灯枯","形消魄散","笔落惊魂"];

var PCOL={ink:C.ink,accent:C.accent,moss:C.moss,soul:"rgba(100,140,120,0.8)",fire:C.fire,ash:C.ash,soft:C.soft,gold:C.gold,ghost:C.ghost};

var BUILD_PREFS={
  melee:["近战","处决","暴击","击杀","生存","魂"],
  ranged:["远程","法术","分裂","魂","暴击","击杀","召物"],
  aoe:["控场","召物","魂","冰","暴击","击杀"],
  dash:["闪避","反击","机动","远程","火","击杀","生存"]
};

// --- Procedural wave generation helpers ---
function _ri(a,b){return Math.floor(a+Math.random()*(b-a+1))}
function _pick(a){return a[Math.floor(Math.random()*a.length)]}
// --- Procedural wave generation ---
var ENEMY_COST={zhikui:1,youhun:1.5,zhikuang:1.5,fenling:2,gudeng:2,shigui:2.5,fenshen:2.5,modun:2.5,jiangshi:3};
var WAVE_BUDGETS=[5,7,9.5,12,14.5,17.5,21,25,28,32,36,0];
var WAVE_TIERS=[
  ["zhikui"],
  ["zhikui","youhun"],
  ["zhikui","youhun","fenling","gudeng"],
  ["zhikui","youhun","fenling","shigui","gudeng","zhikuang"],
  ["zhikui","youhun","fenling","shigui","gudeng","jiangshi","fenshen","modun","zhikuang"]
];
var WAVE_PLACES=["纸门","纸灰巷","悬井口","鬼灯廊","无面台","墨池","灰潮","百鬼面","黄泉路","枯骨桥","阴风道","鬼市","鸦栖楼","幽冥渡"];
var WAVE_FLAVORS=["此处邪祟暗藏，小心试探。","前方鬼影绰绰，不可大意。","阴气渐重，步步为营。","群邪毕至，殊死一搏。","地宫深处，杀机四伏。"];
var STAGE_POOLS=[
  ["calm"],
  ["calm","ash"],
  ["ash","well","lantern"],
  ["ash","well","lantern","mask","inkpool"],
  ["mask","inkpool","lantern"]
];
var CN_NUM=["壹","贰","叁","肆","伍","陆","柒","捌","玖","拾","拾壹","拾贰"];

function generateWave(wi,diff){
  if(wi>=WAVE_BUDGETS.length||WAVE_BUDGETS[wi]===0)return null; // boss wave handled separately
  var tier=Math.min(4,Math.floor(wi/2));
  var pool=WAVE_TIERS[tier];
  var budget=WAVE_BUDGETS[wi]*(diff==="hard"?1.15:diff==="nightmare"?1.35:1);
  var list=[];
  var totalCost=0;
  var expensive={jiangshi:0,modun:0,fenshen:0};
  for(var attempt=0;attempt<40&&totalCost<budget*0.9;attempt++){
    var t=_pick(pool);
    var c=ENEMY_COST[t]||1;
    if(totalCost+c>budget*1.1)continue;
    if(expensive[t]>=2)continue;
    // find existing entry
    var found=false;
    for(var j=0;j<list.length;j++){if(list[j].t===t){list[j].n++;found=true;break}}
    if(!found)list.push({t:t,n:1});
    totalCost+=c;
    if(expensive[t]!==undefined)expensive[t]++;
  }
  // ensure minimum 3 enemies
  var total=0;list.forEach(function(e){total+=e.n});
  if(total<3){list.push({t:"zhikui",n:3-total})}
  // cap max 18
  while(total>18){var biggest=list.reduce(function(a,b){return a.n>b.n?a:b});biggest.n--;total--}
  // stage modifier
  var sp=STAGE_POOLS[tier];
  var mod=sp[wi%sp.length];
  return{label:"第"+CN_NUM[wi]+"波 · "+WAVE_PLACES[_ri(0,WAVE_PLACES.length-1)],
    mod:mod,flavor:_pick(WAVE_FLAVORS),list:list};
}

// --- Curse/Oath system (誓印) ---
var CURSES=[
  {id:"mobu",name:"墨缚",type:"誓印",tags:["近战","法术"],
    desc:"无法闪避，但伤害+35%，攻击范围+20%",
    fn:function(p){p.noDodge=true;p.stats.dmg+=0.35;p.stats.range+=0.2}},
  {id:"shihun",name:"噬魂",type:"誓印",tags:["生存","诅咒"],
    desc:"波次间不回血，但遗物效果增强50%",
    fn:function(p){p.noWaveHeal=true;p.relicPower=1.8}},
  {id:"zhibao",name:"纸薄",type:"誓印",tags:["生存","暴击"],
    desc:"最大生命降至60，但开局多选2件遗物",
    fn:function(p){p.maxHpOverride=60;p.extraStartRelics=2}},
  {id:"tanmo",name:"贪墨",type:"誓印",tags:["击杀","诅咒"],
    desc:"敌人生命+40%，但每波多选1件遗物",
    fn:function(p){p.enemyHpMult=1.4;p.extraRelicChoice=true}},
  {id:"guxing",name:"孤行",type:"誓印",tags:["法术","暴击"],
    desc:"没有武器进化，但全属性+50%",
    fn:function(p){p.noEvolution=true;p.stats.dmg+=0.35;p.stats.spd+=0.35;p.stats.range+=0.35;p.stats.atkSpd-=0.12}},
  {id:"guijianchou",name:"鬼见愁",type:"誓印",tags:["暴击","处决"],
    desc:"所有敌人皆煞化，但暴击率+25%",
    fn:function(p){p.allElite=true;p.stats.critRate=Math.min(CAPS.critRate,p.stats.critRate+0.25)}}
];

// --- Second boss: 墨将军 ---
// (ETYPE entry added below)
