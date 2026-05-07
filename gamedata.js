var W=960,H=640,A={l:28,t:28,r:W-28,b:H-28};
var WAVE_SCALE={hpPerWave:0.065,spdPerWave:0.012};
var C={paper:"#f1e6d4",edge:"#d9c9af",ink:"#171310",soft:"#2c2520",
  accent:"#a33a2d",ash:"#8d7d69",moss:"#4d6156",
  ghost:"rgba(220,210,190,0.7)",ghostE:"rgba(23,19,16,0.35)",
  fire:"#c45a2d",fireG:"rgba(196,90,45,0.3)",
  spirit:"rgba(90,140,100,0.55)",spiritG:"rgba(77,122,86,0.25)",
  boss:"#6b3a5c",bossG:"rgba(107,58,92,0.3)",
  gold:"#9c835a",goldG:"rgba(156,131,90,0.24)",
  frost:"#b8c8d4",frostE:"#7fa0b4",
  ivory:"#f7efe5",clear:"rgba(0,0,0,0)",
  fontBody:'"STKaiti","KaiTi","Noto Sans SC","Droid Sans Fallback",sans-serif',
  fontTitle:'"STKaiti","KaiTi","Noto Sans SC","Droid Sans Fallback",sans-serif,serif'};

var WEAPONS=[
  {id:"jian",name:"斩妖剑",tone:"近战 / 破绽 / 处决",blurb:"三段贴身剑势，第三击挑出破绽。",
   tags:["近战","处决","暴击"],dmg:20,range:60,arc:Math.PI*0.55,cd:16,type:"melee"},
  {id:"bi",name:"符骨笔",tone:"远程 / 法术 / 魂伤",blurb:"用骨笔挥出半月墨痕，拖出魂丝。",
   tags:["远程","法术","魂"],dmg:16,range:420,arc:0,cd:18,type:"ranged",spd:7},
  {id:"ling",name:"镇魂铃",tone:"控场 / 召物 / 魂域",blurb:"铃响就是领域，怪被拉进你的节拍。",
   tags:["控场","魂","召物"],dmg:16,range:100,arc:Math.PI*2,cd:28,type:"aoe"},
  {id:"san",name:"伏魔伞",tone:"闪避 / 远程 / 反击",blurb:"撑伞吞压力，折返反击夺回节奏。",
   tags:["闪避","远程","反击"],dmg:18,range:140,arc:0,cd:26,type:"dash"}
];

var RELICS=[
  {id:"zhusha",name:"朱砂封钉",type:"凶器",tags:["处决","暴击"],effect:"暴击伤害+40%",fn:function(p){p.stats.critDmg+=0.4}},
  {id:"kuhao",name:"枯毫遗墨",type:"残器",tags:["近战","魂"],effect:"每3次攻击释放墨刃",fn:function(p){p.tripleBlade=true}},
  {id:"zhiren",name:"纸人替魄",type:"法具",tags:["闪避","生存"],effect:"受伤时替身吸收伤害",fn:function(p){p.decoyHP=45}},
  {id:"chenfu",name:"无字谶符",type:"符物",tags:["法术","魂"],effect:"攻击附带8点魂伤，每遗物+1",fn:function(p){p.soulDmg+=8;p.soulDmgPerRelic=true}},
  {id:"lingshe",name:"青铜镇铃舌",type:"古铃",tags:["控场","召物"],effect:"攻击范围+25%",fn:function(p){p.stats.range+=0.25}},
  {id:"jingjuan",name:"倒写经卷",type:"残卷",tags:["远程","分裂"],effect:"攻击追加折返墨迹",fn:function(p){p.bounce=true;p.stats.returnInk+=1}},
  {id:"yedeng",name:"夜灯残烬",type:"烛具",tags:["火","击杀"],effect:"击杀留下磷火",fn:function(p){p.fireOnKill=true}},
  {id:"xianghui",name:"祟面香灰",type:"禁物",tags:["诅咒","暴击"],effect:"低血量时伤害+50%",fn:function(p){p.lowHpDmg+=0.5}},
  {id:"xuanbing",name:"玄冰简穗",type:"祠器",tags:["控场","冰"],effect:"攻击减速敌人",fn:function(p){p.slowOnHit=0.4}},
  {id:"xuezhu",name:"血烛祭片",type:"禁物",tags:["诅咒","火"],effect:"范围+25%，但受伤+10%",fn:function(p){p.stats.range+=0.25;p.extraDmgTaken=(p.extraDmgTaken||0)+0.1}},
  {id:"dieyin",name:"鬼脊蝶印",type:"异印",tags:["魂","远程"],effect:"魂伤跳印附近敌人",fn:function(p){p.soulChain=true}},
  {id:"pojing",name:"破镜残片",type:"镜片",tags:["闪避","反击"],effect:"闪避后攻击穿透",fn:function(p){p.pierceOnDodge=true}},
  {id:"zhijia",name:"纸甲残片",type:"护具",tags:["生存","近战"],
    effect:"受到伤害减少20%",fn:function(p){p.stats.def+=0.2}},
  {id:"zouma",name:"走马灯片",type:"灯器",tags:["机动","击杀"],
    effect:"移速+15%，击杀短暂加速",fn:function(p){p.stats.spd+=0.15;p.killSpeed=true}},
  {id:"mochi",name:"墨池残砚",type:"文房",tags:["法术","近战"],
    effect:"连续命中同一目标伤害递增",fn:function(p){p.comboDmg=true}},
  {id:"zhenmu",name:"镇墓兽首",type:"镇物",tags:["反击","生存"],
    effect:"受击时反弹50%伤害",fn:function(p){p.thorns=(p.thorns||0)+0.5}},
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
    effect:"暴击率+18%，非暴击伤害-12%",fn:function(p){p.stats.critRate+=0.18;p.guxuePenalty=true}},
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
    effect:"暴击时在目标位置留下冰冻区域",fn:function(p){p.frostOnCrit=true}},
  {id:"moyaling",name:"墨鸦翎",type:"羽器",tags:["机动","远程"],
    effect:"移速+12%，击杀后攻速大幅提升",fn:function(p){p.stats.spd+=0.12;p.killAtkSpd=true}},
  {id:"shixin",name:"石心",type:"护具",tags:["生存","近战"],
    effect:"防御+18%，移速-6%",fn:function(p){p.stats.def+=0.18;p.stats.spd-=0.06}},
  {id:"yujinshan",name:"余烬扇",type:"火具",tags:["火","生存"],
    effect:"站在火场上每秒回复3HP，若已有磷火则火场扩大",fn:function(p){p.fireHeal=(p.fireHeal||0)+3;if(p.fireOnKill)p.fireExpand=true}},
  {id:"fengmofu",name:"封魔符",type:"符物",tags:["控场","法术"],
    effect:"攻击减速效果提升至35%",fn:function(p){p.slowOnHit=Math.max(p.slowOnHit||0,0.35)}},
  {id:"huihunxiang",name:"回魂香",type:"香具",tags:["生存","击杀"],
    effect:"击杀回复3HP，击杀后短暂加速",fn:function(p){p.killHeal=(p.killHeal||0)+3;p.killSpeed=true}},
  {id:"pilimu",name:"霹雳木",type:"雷具",tags:["法术","击杀"],
    effect:"击杀后攻速大幅提升，基础攻速+12%",fn:function(p){p.killAtkSpd=true;p.stats.atkSpd-=0.12}},
  {id:"hanxingtie",name:"寒星铁",type:"铁器",tags:["冰","暴击"],
    effect:"暴击时在目标位置留下冰冻区域，暴击率+10%",fn:function(p){p.frostOnCrit=true;p.stats.critRate+=0.1}},
  {id:"mojiaojin",name:"墨蛟筋",type:"蛟具",tags:["远程","机动"],
    effect:"移速+12%，弹道体积+25%",fn:function(p){p.stats.spd+=0.12;p.stats.projSize+=0.25}},
  {id:"tunmofu",name:"吞魔符",type:"符物",tags:["击杀","生存"],
    effect:"击杀回复4HP，受击反弹20%伤害",fn:function(p){p.killHeal=(p.killHeal||0)+4;p.thorns=(p.thorns||0)+0.2}},
  {id:"jingxinzhou",name:"静心咒",type:"经咒",tags:["生存","控场"],
    effect:"替身吸收20伤害，防御+12%",fn:function(p){p.decoyHP=(p.decoyHP||0)+20;p.stats.def+=0.12}},
  {id:"pojunfu",name:"破军符",type:"符物",tags:["近战","暴击"],
    effect:"连续命中同一目标伤害递增，击杀后攻速大幅提升",fn:function(p){p.comboDmg=true;p.killAtkSpd=true}},
  {id:"mogangyin",name:"墨罡印",type:"印具",tags:["控场","远程"],
    effect:"弹道命中减速35%，弹道体积+15%",fn:function(p){p.slowOnHit=Math.max(p.slowOnHit||0,0.35);p.stats.projSize+=0.15}},
  {id:"lianhuanfu",name:"连环符",type:"符物",tags:["魂","击杀"],
    effect:"魂伤+10，击杀后魂链跳伤+1",fn:function(p){p.soulDmg=(p.soulDmg||0)+10;p.soulKillChain=true}},
  {id:"yanmoyan",name:"炎墨砚",type:"文房",tags:["火","击杀"],
    effect:"击杀留磷火，火场击杀扩大火场",fn:function(p){p.fireOnKill=true;p.fireExpand=true}},
  {id:"binghe",name:"冰核",type:"冰具",tags:["冰","暴击"],
    effect:"攻击减速提升至45%，暴击率+8%",fn:function(p){p.slowOnHit=Math.max(p.slowOnHit||0,0.45);p.stats.critRate+=0.08}},
  {id:"houmo",name:"厚墨",type:"墨具",tags:["远程","暴击"],
    effect:"伤害+20%，弹道体积+10%（体积越大越强）",fn:function(p){p.stats.dmg+=0.2;p.stats.projSize+=0.1}},
  {id:"molonglin",name:"墨龙鳞",type:"护具",tags:["生存","机动"],
    effect:"防御+20%，移速+6%（抵消石心减速）",fn:function(p){p.stats.def+=0.2;p.stats.spd+=0.06}},
  {id:"mojiangling",name:"墨将令",type:"令器",tags:["击杀","法术"],
    effect:"击杀精英敌人时爆发墨汁，对周围造成范围伤害",fn:function(p){p.eliteKillBurst=true}},
  {id:"guishouyin",name:"鬼手印",type:"印具",tags:["闪避","魂"],
    effect:"完美闪避时吸取最近敌人灵魂，回复生命并造成魂伤",fn:function(p){p.dodgeSoulGrab=true}},
  {id:"zhiyanwen",name:"纸鸢纹",type:"纸器",tags:["远程","控场"],
    effect:"弹道命中留下扩散减速墨圈",fn:function(p){p.projSlowField=true}},
  {id:"shiguping",name:"噬蛊瓶",type:"蛊器",tags:["生存","火"],
    effect:"站在毒场上回复生命而非受伤，毒场半径+30%",fn:function(p){p.poisonHeal=true}},
  {id:"yexingyi",name:"夜行衣",type:"隐具",tags:["闪避","机动"],
    effect:"迷雾中增伤+30%，魂球击中回血而非受伤",fn:function(p){p.fogBonus=true;p.soulOrbHeal=true}},
  {id:"hunsuolian",name:"魂锁链",type:"链器",tags:["处决","击杀"],
    effect:"连斩每层额外+3%伤害，十连斩以上暴击率+15%",fn:function(p){p.comboDmgBonus=true}},
  {id:"molingyu",name:"墨灵玉",type:"玉器",tags:["召物","魂"],
    effect:"召唤墨灵环绕，自动攻击附近敌人",fn:function(p){p.hasInkSpirit=true;p.inkSpiritCount=(p.inkSpiritCount||0)+1}},
  {id:"molingqi",name:"墨灵契",type:"契器",tags:["召物","魂"],
    effect:"墨灵伤害+50%，墨灵数量+1",fn:function(p){p.hasInkSpirit=true;p.inkSpiritCount=(p.inkSpiritCount||0)+2;p.spiritDmgBonus=(p.spiritDmgBonus||0)+0.5}},
  {id:"baomo",name:"爆墨灵",type:"遗物",tags:["召物","爆炸","火"],
    effect:"墨灵攻击时引发范围爆炸",fn:function(p){p.spiritExplode=true}},
  {id:"yumo",name:"愈墨灵",type:"遗物",tags:["召物","治疗"],
    effect:"墨灵击杀时为你回复3HP",fn:function(p){p.spiritHeal=true}},
  {id:"hanmo",name:"寒墨灵",type:"遗物",tags:["召物","冰"],
    effect:"墨灵攻击附加30%减速，持续1.5秒",fn:function(p){p.spiritSlow=true}},
  {id:"fenmo",name:"分墨灵",type:"遗物",tags:["召物","分裂","法术"],
    effect:"墨灵数量+2",fn:function(p){p.inkSpiritCount=(p.inkSpiritCount||0)+2}},
  {id:"powangtong",name:"破妄瞳",type:"瞳器",tags:["处决","暴击"],
    effect:"首次攻击现形画皮必暴击+50%伤害，暴击率+5%",fn:function(p){p.mimicFirstCrit=true;p.stats.critRate+=0.05}},
  {id:"zhifan",name:"蛭反",type:"蛊器",tags:["生存","反击"],
    effect:"被墨蛭吸附时攻速+35%伤害+25%",fn:function(p){p.leechBuff=true}},
  {id:"moshouzhen",name:"墨守阵",type:"阵器",tags:["生存","控场"],
    effect:"静止1秒后生成墨守圈，圈内减伤25%",fn:function(p){p.defFormation=true}},
  {id:"mogongzhen",name:"墨攻阵",type:"阵器",tags:["击杀","法术"],
    effect:"每击杀3敌释放墨爆脉冲，伤害=攻击力×2",fn:function(p){p.atkFormation=true}},
  {id:"zhenyan",name:"阵眼",type:"阵器",tags:["控场","生存"],
    effect:"墨阵范围+40%，触发条件减半",fn:function(p){p.formBoost=true}},
  {id:"mojing",name:"墨镜",type:"镜器",tags:["防御","法术"],
    effect:"30%概率反弹敌方弹道，反弹伤害翻倍",fn:function(p){p.reflectChance=(p.reflectChance||0)+0.3;p.reflectDmgMult=(p.reflectDmgMult||0)+1}},
  {id:"huichunzhen",name:"回春阵",type:"阵器",tags:["生存","控场"],
    effect:"静止1.2秒生成回春圈，圈内每秒回复3HP",fn:function(p){p.healFormation=true}},
  {id:"mowo",name:"墨涡",type:"阵器",tags:["击杀","控场"],
    effect:"每击杀5敌在脚下释放墨涡，牵引并伤害周围敌人",fn:function(p){p.vortexOnKill=true}},
  {id:"moxi",name:"墨吸",type:"阵器",tags:["击杀","控场"],
    effect:"击杀敌人延长所有墨阵15帧",fn:function(p){p.formationLeech=true}},
  {id:"mojia",name:"墨甲",type:"护具",tags:["生存","控场"],
    effect:"防御+15%，在墨阵内额外+15%防御",fn:function(p){p.stats.def+=0.15;p.formDef=true}},
  {id:"mobao",name:"墨爆",type:"阵器",tags:["击杀","法术"],
    effect:"墨阵消失时引爆，对范围内敌人造成伤害",fn:function(p){p.formationDetonate=true}},
  {id:"moxian",name:"墨弦",type:"阵器",tags:["法术","控场"],
    effect:"两个以上墨阵间生成墨弦，触弦敌人受伤",fn:function(p){p.inkStrings=true}},
  {id:"moding",name:"墨钉",type:"凶器",tags:["控场","近战"],
    effect:"攻击钉住首个命中敌人1.5秒，禁止移动",fn:function(p){p.attackPin=true}},
  {id:"mochen",name:"墨澄",type:"阵器",tags:["法术","控场"],
    effect:"站在墨阵内时攻速+20%",fn:function(p){p.formClarity=true}},
  {id:"motao",name:"墨涛",type:"墨具",tags:["击杀","控场"],
    effect:"击杀敌人释放墨涛，推开周围敌人",fn:function(p){p.killPulse=true}},
  {id:"molian",name:"墨涟",type:"阵器",tags:["法术","控场"],
    effect:"站在墨阵内每0.5秒释放墨涟，伤害周围敌人",fn:function(p){p.formRipple=true}},
  {id:"moyi",name:"墨移",type:"闪具",tags:["闪避","机动"],
    effect:"闪后留影，3秒内再闪回归原位",fn:function(p){p.recallDash=true}},
  {id:"moze",name:"墨泽",type:"墨具",tags:["击杀","机动"],
    effect:"击杀敌人获得3秒移速+20%",fn:function(p){p.killSpeedBurst=true}},
  {id:"moxiu",name:"墨嗅",type:"墨具",tags:["击杀","处决"],
    effect:"击杀延长连斩窗口15帧，更易维持高连斩",fn:function(p){p.scentStreak=true}},
  {id:"mowei",name:"墨威",type:"阵器",tags:["法术","击杀"],
    effect:"每个活跃墨阵+6%伤害",fn:function(p){p.formDmgBonus=true}},

  {id:"mosui",name:"墨碎",type:"凶器",tags:["暴击","溅射"],
    effect:"暴击时溅射碎片，对周围敌人造成35%伤害",fn:function(p){p.critShrapnel=true}},
  {id:"moshi",name:"墨蚀",type:"墨具",tags:["持续","法术"],
    effect:"攻击附加墨蚀，每秒2点伤害持续5秒，可叠3层",fn:function(p){p.corrosive=true}},
  {id:"monu",name:"墨怒",type:"墨具",tags:["生命","爆发"],
    effect:"生命低于50%时，伤害+25%移速+15%",fn:function(p){p.lowHpFury=true}}
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
      fn:function(p){p.seekBlade=true}},
    {id:"e_huizhan",name:"回斩",type:"进化",tags:["近战","处决"],effect:"击杀后下次攻击伤害+45%",
      fn:function(p){p.killDmgBoost=true}}
  ],
  ranged:[
    {id:"e_lianzhu",name:"连珠",type:"进化",tags:["远程"],effect:"弹数+1",
      fn:function(p){p.stats.multi+=1}},
    {id:"e_guanjia",name:"贯甲",type:"进化",tags:["远程"],effect:"弹道穿透敌人",
      fn:function(p){p.projPierce=true}},
    {id:"e_baolie",name:"爆裂",type:"进化",tags:["远程"],effect:"弹道命中时溅射",
      fn:function(p){p.projBurst=true}},
    {id:"e_fenmo",name:"分墨",type:"进化",tags:["远程"],effect:"大弹分裂为3颗小弹",
      fn:function(p){p.bigSplit=true}},
    {id:"e_suopo",name:"梭破",type:"进化",tags:["远程","暴击"],effect:"弹道随飞行距离增伤（最高+50%）",
      fn:function(p){p.projTravelDmg=true}}
  ],
  aoe:[
    {id:"e_kuoyu",name:"扩域",type:"进化",tags:["控场"],effect:"范围+40%",
      fn:function(p){p.stats.range+=0.4}},
    {id:"e_gongming",name:"共鸣",type:"进化",tags:["控场"],effect:"多重+1",
      fn:function(p){p.stats.multi+=1}},
    {id:"e_zhenya",name:"镇压",type:"进化",tags:["控场"],effect:"声波命中减速3秒",
      fn:function(p){p.ringSlow=true}},
    {id:"e_shuangpin",name:"双频",type:"进化",tags:["控场"],effect:"第二圈不递减",
      fn:function(p){p.ringNoDecay=true}},
    {id:"e_huiming",name:"回鸣",type:"进化",tags:["控场","生存"],effect:"声波命中回复1HP",
      fn:function(p){p.ringHeal=true}}
  ],
  dash:[
    {id:"e_jifeng",name:"疾风",type:"进化",tags:["突进"],effect:"移速+30%，伞击随速度增伤",
      fn:function(p){p.stats.spd+=0.3}},
    {id:"e_xuanren",name:"旋刃",type:"进化",tags:["突进"],effect:"多重+1，多段扫击",
      fn:function(p){p.stats.multi+=1}},
    {id:"e_tiebi",name:"铁壁",type:"进化",tags:["突进"],effect:"减伤+30%",
      fn:function(p){p.stats.def+=0.3}},
    {id:"e_kaihe",name:"开合",type:"进化",tags:["突进"],effect:"冲后反向补一刀",
      fn:function(p){p.dashReturn=true}},
    {id:"e_yingji",name:"影迹",type:"进化",tags:["突进","机动"],effect:"冲刺后留下墨迹减速敌人",
      fn:function(p){p.dashTrail=true}}
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
  inkpool:{name:"墨池",desc:"墨池中敌人攻击力+30%，击杀可净化为加速区。"},
  guishi:{name:"鬼市",desc:"地宫深处偶遇鬼市商贩，可用遗物换购。"},
  mirror:{name:"镜殿",desc:"敌人死亡时射出残影弹，保持移动避免被击中。"}
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
    col:"rgba(23,19,16,0.55)",edge:C.ink,isBoss:true,desperate:false},
  moya:{name:"墨鸦",tip:"飞行远程，快速且脆弱，优先点杀",hp:35,spd:1.9,r:11,dmg:5,atkR:240,atkCd:72,col:"rgba(23,19,16,0.35)",edge:C.ink,ranged:true,pSpd:5.2},
  shiyong:{name:"石俑",tip:"重甲盾兵，破盾后集火击杀",hp:95,spd:0.55,r:20,dmg:13,atkR:34,atkCd:68,col:"rgba(100,95,88,0.4)",edge:C.soft,hasShield:true,shield:28,maxShield:28,shieldRegen:360},
  yanyong:{name:"炎俑",tip:"重甲火径，走位时注意脚下",hp:95,spd:0.7,r:18,dmg:12,atkR:34,atkCd:62,col:"rgba(196,90,45,0.35)",edge:C.fire,fireTrail:true},
  sukui:{name:"速傀",tip:"极速近战，优先点杀",hp:38,spd:2.2,r:11,dmg:6,atkR:28,atkCd:32,col:"rgba(220,210,190,0.5)",edge:C.ash},
  duzhu:{name:"毒蛛",tip:"毒径减速，保持距离",hp:50,spd:1.6,r:13,dmg:8,atkR:30,atkCd:50,col:"rgba(77,97,86,0.45)",edge:C.moss,poisonTrail:true},
  gushi:{name:"蛊师",tip:"增益同伴，优先击杀",hp:65,spd:1.1,r:14,dmg:0,atkR:0,atkCd:0,col:"rgba(107,58,92,0.4)",edge:C.boss,summoner:false,buffAura:true},
  huapi:{name:"画皮",tip:"伪装成掉落物，靠近后突袭",hp:58,spd:2.1,r:13,dmg:14,atkR:30,atkCd:38,col:"rgba(196,90,45,0.3)",edge:C.accent,mimic:true},
  mozhi:{name:"墨蛭",tip:"近身吸附吸血，闪避可甩脱",hp:32,spd:2.5,r:8,dmg:0,atkR:0,atkCd:0,col:"rgba(23,19,16,0.4)",edge:C.ink,leech:true},
  motong:{name:"墨童",tip:"死后延迟爆炸，远离尸体",hp:28,spd:1.7,r:9,dmg:8,atkR:28,atkCd:42,col:"rgba(23,19,16,0.35)",edge:C.ink,deathBomb:true,deathBombR:60,deathBombDmg:12,deathBombDelay:55},
  mofu:{name:"墨蝠",tip:"高速俯冲撞击，优先点杀",hp:25,spd:3.2,r:9,dmg:10,atkR:60,atkCd:50,col:"rgba(23,19,16,0.3)",edge:C.ink,swoop:true,swoopPrep:35},
  modie:{name:"墨蝶",tip:"脆弱飞行，死后鼓舞附近敌人",hp:18,spd:2.8,r:8,dmg:6,atkR:200,atkCd:80,col:"rgba(77,97,86,0.35)",edge:C.moss,ranged:true,pSpd:4.8,deathBuff:true,deathBuffR:130,deathBuffT:180},
  moyong:{name:"墨蛹",tip:"死后孵化墨蚋，优先清除",hp:55,spd:1.2,r:12,dmg:0,atkR:0,atkCd:0,col:"rgba(60,55,50,0.4)",edge:C.ink,spawnsOnDeath:true,spawnType:"morui",spawnCount:2},
  morui:{name:"墨蚋",tip:"蛹体孵化，高速近战",hp:12,spd:3.6,r:5,dmg:5,atkR:22,atkCd:26,col:"rgba(23,19,16,0.3)",edge:C.accent}
};

var LIMITS={particles:260,fires:72,attacks:90,eProj:90,floatTexts:18,decoys:12,kites:4,frosts:12,enemies:80,inkSpirits:6};

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
  dengxin:function(s){return !!s.ownedIds.yedeng},
  mogangyin:function(s){return !!(s.ownedIds.judou||s.ownedIds.mojiaojin)},
  lianhuanfu:function(s){return !!s.ownedIds.dieyin},
  yanmoyan:function(s){return !!s.ownedIds.yedeng},
  binghe:function(s){return !!s.ownedIds.liebing},
  houmo:function(s){return s.stats.projSize>1.2},
  molonglin:function(s){return !!s.ownedIds.shixin},
  molingqi:function(s){return !!s.ownedIds.molingyu},
  zhenyan:function(s){return !!(s.ownedIds.moshouzhen||s.ownedIds.mogongzhen)},
  huichunzhen:function(s){return !!(s.ownedIds.moshouzhen||s.ownedIds.mogongzhen)},
  mobao:function(s){return !!(s.ownedIds.moshouzhen||s.ownedIds.mogongzhen||s.ownedIds.huichunzhen||s.ownedIds.mowo)},
  moxian:function(s){return !!((s.ownedIds.moshouzhen?1:0)+(s.ownedIds.mogongzhen?1:0)+(s.ownedIds.huichunzhen?1:0)+(s.ownedIds.mowo?1:0)+(s.ownedIds.mobao?1:0)>=2)},
  moding:function(s){return s.weaponType==="melee"},
  mochen:function(s){return !!(s.ownedIds.moshouzhen||s.ownedIds.mogongzhen||s.ownedIds.huichunzhen||s.ownedIds.mowo)},
  moyi:function(s){return s.weaponType==="dash"},
  moshi:function(s){return !!s.ownedIds.molian},
  monu:function(s){return !!s.ownedIds.tongjing},
  baomo:function(s){return !!s.ownedIds.molingyu},
  yumo:function(s){return !!s.ownedIds.molingyu},
  hanmo:function(s){return !!s.ownedIds.molingyu},
  fengmofu:function(s){return s.slowOnHit>0||s.ringSlow}
};

var CAPS={critRate:0.65,bellCombo:15,shieldStack:3,atkCdFloor:4,soulChain:4,ringSoul:6,projSize:2.0};

var RANGES={weakSpread:100,fireExpand:60,fear:100,soulChain:80,burst:50,
  decoyAttract:120,chargeMax:240,chargeMin:54,rangedMin:50,
  killPulse:100,critShrapnel:80,dodgeSoulGrab:120,inkSpirit:220,
  spiritExplode:60,swoop:180,mimicReveal:55,buffAura:90};

var TUNING={
  comboWindow:45,chargeThreshold:50,
  playerSpd:3.4,playerHp:100,playerR:15,
  dodgeDuration:10,dodgeCooldown:42,dodgeInvFrames:14,justDodgedWindow:28,
  hurtInvFrames:30,lowHpThreshold:0.3,bossEnrageHp:0.5,bossDesperateHp:0.25,
  bossEnrageSpdMult:1.3,reviveHpRatio:0.3,
  fastAtkCdMult:0.55,fastAtkParticleMult:0.5,
  combo3Arc:1.4,combo3Range:1.25,combo3Dmg:1.25,
  shieldStackReduction:4,inkPoolDmgMult:1.3,
  killStreak5Dmg:1.1,killStreak10Dmg:1.2,
  eliteBaseChance:0.1,eliteWaveScale:0.025,eliteMaxChance:0.4,eliteHardBonus:0.08,eliteNightmareBonus:0.18,
  defFormReduction:0.75,formDefReduction:0.85,
  bossChargeSpd:5.5,bossChargeDur:14,bossPrepDur:20,
  perfThreshFull:0.95,perfThreshHigh:0.85,perfThreshMed:0.72,perfThreshLow:0.55,
  perfMulFull:0.25,perfMulHigh:0.4,perfMulMed:0.6,perfMulLow:0.8,
  killStreakWindow:120,speedBurstDuration:180,spawnGraceDuration:30,deathAnimDuration:18,
  buffedSpdMult:1.3,defaultSlowAmount:0.3,fireTickInterval:20,
  survivalMaxEnemies:20,survivalSpawnBase:90,survivalSpawnJitter:60,
  killSpeedBonus:0.25,speedBurstBonus:0.2,lowHpFuryBonus:0.15,lowHpFuryThreshold:0.5,
  eliteHpMult:1.5,eliteSpdMult:1.3,eliteArmoredSpdMult:0.7,
  reviveInvFrames:60,
  lowHpFuryDmgMult:1.25,lowHpRangeThreshold:0.35,lowHpRangeMult:1.4,
  killBoostDmgMult:1.45,
  bossChargeRange:200,bossNormalAtkInterval:140,
  bossPhase2Hp:0.6,bossPhase3Hp:0.25,
  eProjWarnMin:120,eProjWarnMax:280
};

var DEATH_COLOR={zhikui:"ash",youhun:"moss",fenling:"fire",shigui:"soft",gudeng:"gold",jiangshi:"ink",boss:"accent",
  zhikuang:"ghost",fenshen:"soul",modun:"soft",mojiangjun:"ink",moya:"ink",shiyong:"soft",yanyong:"fire",sukui:"ash",duzhu:"moss",gushi:"boss",huapi:"accent",mozhi:"ink",motong:"ink",mofu:"ink",modie:"moss",moyong:"ink",morui:"accent"};

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
var ENEMY_COST={zhikui:1,youhun:1.5,zhikuang:1.5,fenling:2,gudeng:2,shigui:2.5,fenshen:2.5,modun:2.5,jiangshi:3,moya:1.8,shiyong:3,yanyong:2.2,sukui:1.3,duzhu:1.7,gushi:2.8,huapi:1.9,mozhi:1.4,motong:1.2,mofu:1.1,modie:1.6,moyong:2.0,morui:0.7,boss:99,mojiangjun:99};
var WAVE_BUDGETS=[5,7,9.5,12,14.5,17.5,21,25,28,32,36,0];
var WAVE_TIERS=[
  ["zhikui","youhun"],
  ["zhikui","youhun","fenling","zhikuang","moya","sukui","huapi","mozhi","motong","mofu","modie"],
  ["zhikui","youhun","fenling","gudeng","shigui","fenshen","moya","shiyong","sukui","yanyong","duzhu"],
  ["zhikuang","fenling","gudeng","shigui","fenshen","modun","jiangshi","moya","shiyong","yanyong","gushi"],
  ["fenling","gudeng","shigui","fenshen","modun","jiangshi","moya","shiyong","yanyong","duzhu","gushi"]
];
var WAVE_PLACES=["纸门","纸灰巷","悬井口","鬼灯廊","无面台","墨池","灰潮","百鬼面","黄泉路","枯骨桥","阴风道","鬼市","鸦栖楼","幽冥渡"];
var WAVE_FLAVORS=["此处邪祟暗藏，小心试探。","前方鬼影绰绰，不可大意。","阴气渐重，步步为营。","群邪毕至，殊死一搏。","地宫深处，杀机四伏。"];
var STAGE_POOLS=[
  ["calm"],
  ["calm","ash"],
  ["ash","well","lantern"],
  ["ash","well","lantern","mask","inkpool","mirror","guishi"],
  ["mask","inkpool","mirror","lantern"]
];
var CN_NUM=["壹","贰","叁","肆","伍","陆","柒","捌","玖","拾","拾壹","拾贰"];

function generateWave(wi,diff){
  if(wi>=WAVE_BUDGETS.length||WAVE_BUDGETS[wi]===0)return null; // boss wave handled separately
  var tier=Math.min(4,Math.floor(wi/2));
  var pool=WAVE_TIERS[tier];
  var diffMul=diff==="hard"?1.15:diff==="nightmare"?1.35:1;
  var budget=WAVE_BUDGETS[wi]*diffMul;
  var list=[];
  var totalCost=0;
  var expensive={jiangshi:0,modun:0,fenshen:0,shiyong:0,shigui:0};

  // Special wave types (after wave 1, ~20% chance)
  var specialWave=null;
  if(wi>=2&&Math.random()<0.2){
    var specials=["horde","elite","survival"];
    if(diff==="nightmare")specials.push("elite_horde");
    specialWave=_pick(specials);
    if(specialWave==="horde"){budget*=1.7;}
    else if(specialWave==="elite_horde"){budget*=1.4;}
    else if(specialWave==="elite"){budget*=0.8;}
    else if(specialWave==="survival"){budget*=1.3;}
  }

  for(var attempt=0;attempt<40&&totalCost<budget*0.9;attempt++){
    var t=_pick(pool);
    var c=ENEMY_COST[t]||1;
    if(totalCost+c>budget*1.1)continue;
    if(expensive[t]>=2)continue;
    var found=false;
    for(var j=0;j<list.length;j++){if(list[j].t===t){list[j].n++;found=true;break}}
    if(!found)list.push({t:t,n:1});
    totalCost+=c;
    if(expensive[t]!==undefined)expensive[t]++;
  }
  var total=0;list.forEach(function(e){total+=e.n});
  if(total<3){list.push({t:"zhikui",n:3-total})}
  while(total>18){var biggest=list.reduce(function(a,b){return a.n>b.n?a:b});biggest.n--;total--}
  var sp=STAGE_POOLS[tier];
  var mod=sp[wi%sp.length];
  return{label:"第"+CN_NUM[wi]+"波 · "+WAVE_PLACES[_ri(0,WAVE_PLACES.length-1)],
    mod:mod,flavor:_pick(WAVE_FLAVORS),list:list,special:specialWave};
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
    desc:"没有武器进化，但全属性+30%，攻速提升",
    fn:function(p){p.noEvolution=true;p.stats.dmg+=0.3;p.stats.spd+=0.3;p.stats.range+=0.3;p.stats.atkSpd-=0.12}},
  {id:"guijianchou",name:"鬼见愁",type:"誓印",tags:["暴击","处决"],
    desc:"所有敌人皆煞化，但暴击率+25%",
    fn:function(p){p.allElite=true;p.stats.critRate=Math.min(CAPS.critRate,p.stats.critRate+0.25)}},
  {id:"kuangxue",name:"狂血",type:"誓印",tags:["近战","暴击"],
    desc:"无法闪避，但暴击伤害+60%",
    fn:function(p){p.noDodge=true;p.stats.critDmg+=0.6}},
  {id:"moyin",name:"墨瘾",type:"誓印",tags:["法术","诅咒"],
    desc:"伤害+30%，但波次间不回血",
    fn:function(p){p.stats.dmg+=0.3;p.noWaveHeal=true}},
  {id:"miwu",name:"迷雾",type:"誓印",tags:["生存","诅咒"],
    desc:"周期性视野缩小，但移速+40%",
    fn:function(p){p.fogCurse=true;p.stats.spd+=0.4}},
  {id:"guihuo",name:"鬼火",type:"誓印",tags:["法术","诅咒"],
    desc:"敌人死亡产生追踪魂球，但击杀回血+8",
    fn:function(p){p.soulOrbCurse=true;p.killHeal=(p.killHeal||0)+8}},
  {id:"lingshi",name:"灵噬",type:"誓印",tags:["召物","诅咒"],
    desc:"墨灵伤害翻倍，但每波开始每只墨灵扣除2点生命",
    fn:function(p){p.spiritDmgBonus=(p.spiritDmgBonus||0)+1.0;p.spiritHpCost=true}},
  {id:"mojie",name:"墨竭",type:"誓印",tags:["生存","诅咒"],
    desc:"墨阵效果翻倍，但最大生命-25%",
    fn:function(p){p.formDouble=true;p.maxHpOverride=75}},
  {id:"moqi",name:"墨契",type:"誓印",tags:["暴击","生存"],
    desc:"攻击范围-30%，但每次暴击回复3点生命",
    fn:function(p){p.stats.range-=0.3;p.critHeal=true}},


  {id:"kuangmo",name:"狂墨",type:"誓印",tags:["攻速","诅咒"],
    desc:"攻速+30%，每次攻击消耗1HP，但击杀回复8HP",
    fn:function(p){p.stats.atkSpd-=0.18;p.atkHpCost=true;p.killHeal=(p.killHeal||0)+8}}
];
// --- Stage Hazards (random per wave) ---
var STAGE_HAZARDS=[
  {id:"yinfeng",name:"阴风",desc:"随机方向推力影响所有单位",interval:180},
  {id:"moyu",name:"墨雨",desc:"随机掉落墨点，接触扣血",interval:45},
  {id:"guihuoyan",name:"鬼火焰",desc:"随机出现追踪火球",interval:120},
  {id:"mozhang",name:"墨瘴",desc:"毒瘴缓缓飘移，穿越造成持续伤害",interval:200},
  {id:"yinbing",name:"阴兵借道",desc:"一排幽灵骑兵横穿战场",interval:210},
  {id:"zhijian",name:"纸剑雨",desc:"纸剑从上方坠落",interval:80}
];

// --- Achievements / Meta-progression ---
var ACHIEVEMENTS=[
  {id:"first_run",name:"初入地宫",desc:"完成一次走阴",check:function(m){return m.totalRuns>=1},reward:null},
  {id:"win_jian",name:"剑斩祟",desc:"用斩妖剑通关",check:function(m){return (m.weaponsCleared.jian||0)>0},reward:null},
  {id:"win_bi",name:"笔诛邪",desc:"用符骨笔通关",check:function(m){return (m.weaponsCleared.bi||0)>0},reward:null},
  {id:"win_ling",name:"铃镇煞",desc:"用镇魂铃通关",check:function(m){return (m.weaponsCleared.ling||0)>0},reward:null},
  {id:"win_san",name:"伞伏魔",desc:"用伏魔伞通关",check:function(m){return (m.weaponsCleared.san||0)>0},reward:null},
  {id:"all_weapons",name:"法器皆通",desc:"用全部四种武器通关",check:function(m){
    return["jian","bi","ling","san"].every(function(w){return(m.weaponsCleared[w]||0)>0})},reward:"startRelic"},
  {id:"kill_mojiangjun",name:"墨将军克星",desc:"击杀墨将军",check:function(m){return m.mojiangjunKills>0},reward:"goldInk"},
  {id:"relic_20",name:"遗物学徒",desc:"发现20件遗物",check:function(m){return Object.keys(m.relicsDiscovered).length>=20},reward:null},
  {id:"relic_30",name:"遗物大师",desc:"发现30件遗物",check:function(m){return Object.keys(m.relicsDiscovered).length>=30},reward:"startRelic"},
  {id:"kills_1000",name:"千斩",desc:"累计斩杀一千祟",check:function(m){return m.totalKills>=1000},reward:null},
  {id:"runs_10",name:"走阴老手",desc:"完成十次走阴",check:function(m){return m.totalRuns>=10},reward:null},
  {id:"nightmare_win",name:"噩梦行者",desc:"噩梦难度通关",check:function(m){return m.nightmareWins>0},reward:"startRelic"},
  {id:"grade_S",name:"墨上墨",desc:"获得S级评价",check:function(m){return m.bestGrade==="S"},reward:null},
  {id:"boss_kills_5",name:"镇祟者",desc:"击杀5个Boss",check:function(m){return m.bossKills>=5},reward:null},
  {id:"curse_master",name:"誓印皆立",desc:"使用过全部誓印",check:function(m){return Object.keys(m.cursesUsed||{}).length>=CURSES.length},reward:null},
  {id:"elite_hunter",name:"精英猎手",desc:"累计击杀50个精英敌人",check:function(m){return (m.eliteKills||0)>=50},reward:null},
  {id:"relic_35",name:"遗物学者",desc:"发现35件遗物",check:function(m){return Object.keys(m.relicsDiscovered).length>=35},reward:"startRelic"},
  {id:"fire_kills",name:"火中取栗",desc:"单局用火焰击杀10个敌人",check:function(m){return (m.bestFireKills||0)>=10},reward:null},
  // --- Easter egg achievements ---
  {id:"no_move_win",name:"不动如山",desc:"全程不按WASD通关（闪避移动不算）",check:function(m){return (m.noMoveWins||0)>0},reward:null},
  {id:"low_hurt_win",name:"一刀不漏",desc:"受伤不超过3次通关",check:function(m){return (m.lowHurtWins||0)>0},reward:null},
  {id:"speed_clear",name:"暴走夜行",desc:"单波30秒内清场",check:function(m){return (m.fastWaveClears||0)>=1},reward:null},
  {id:"paper_win",name:"纸糊的人",desc:"纸薄誓印通关",check:function(m){return (m.paperWins||0)>0},reward:null},
  {id:"no_relic_win",name:"赤手空拳",desc:"不拾取任何遗物通关",check:function(m){return (m.noRelicWins||0)>0},reward:null},
  {id:"massacre",name:"百鬼夜行",desc:"单局击杀100+敌人",check:function(m){return (m.bestSingleRunKills||0)>=100},reward:null},
  {id:"perfect_boss",name:"完美谢幕",desc:"Boss战不受伤",check:function(m){return (m.perfectBossKills||0)>0},reward:null},
  {id:"no_evolve_win",name:"孤勇者",desc:"孤行誓印通关",check:function(m){return (m.noEvolveWins||0)>0},reward:null},
	  {id:"ash_road",name:"灰烬之路",desc:"单局战斗结束时磷火覆盖过半场",check:function(m){return (m.bestFireCoverage||0)>=0.5},reward:"goldInk"},
];

// Starting relic pool for unlocked rewards
var STARTER_RELICS=["zhijia","zouma","yindeng","jijiu","chenfu","moyaling"];

// --- Second boss: 墨将军 ---
// (ETYPE entry added below)
