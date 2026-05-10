// 一键提取 agent 需要的上下文，输出为可直接粘贴进 prompt 的格式
// 目标：把会漂移的项目事实交给脚本，而不是交给 agent 记忆。
var fs=require("fs");
eval(fs.readFileSync("gamedata.js","utf8"));

var out=[];
var gameSrc=fs.readFileSync("game.js","utf8");
var dataSrc=fs.readFileSync("gamedata.js","utf8");
var cssSrc=fs.existsSync("game.css")?fs.readFileSync("game.css","utf8"):"";
var testSrc=fs.readFileSync("content_test.js","utf8");

function pushSection(name,body){
  out.push("\n=== "+name+" ===");
  out.push(body);
}
function oneLine(s){return s.replace(/\r?\n/g,"\\n")}
function between(src,start,end){
  var a=src.indexOf(start);
  if(a<0)return "";
  var b=src.indexOf(end,a+start.length);
  if(b<0)return "";
  return src.slice(a,b+end.length);
}
function uniq(arr){
  var seen={},r=[];
  arr.forEach(function(x){if(!seen[x]){seen[x]=true;r.push(x)}});
  return r;
}

// === EXISTING IDS ===
out.push("=== 现有ID ===");
out.push("RELICS("+RELICS.length+"): ["+RELICS.map(function(r){return r.id}).join(", ")+"]");
out.push("ETYPE("+Object.keys(ETYPE).length+"): ["+Object.keys(ETYPE).join(", ")+"]");
out.push("ACHIEVEMENTS("+ACHIEVEMENTS.length+"): ["+ACHIEVEMENTS.map(function(a){return a.id}).join(", ")+"]");
out.push("CURSES("+CURSES.length+"): ["+CURSES.map(function(c){return c.id}).join(", ")+"]");
out.push("PREREQS("+Object.keys(PREREQS).length+"): ["+Object.keys(PREREQS).join(", ")+"]");
out.push("RANGES("+Object.keys(RANGES).length+"): "+JSON.stringify(RANGES));

// === COLD TAGS ===
var tagCount={};
RELICS.forEach(function(r){(r.tags||[]).forEach(function(t){if(!tagCount[t])tagCount[t]=0;tagCount[t]++})});
var cold=Object.keys(tagCount).map(function(t){return[t,tagCount[t]]}).sort(function(a,b){return a[1]-b[1]}).filter(function(e){return e[1]<8});
pushSection("冷标签",cold.map(function(e){return e[0]+": "+e[1]}).join("\n"));

// === COLD PAIR GAPS ===
var coldTags=["分裂","防御","溅射","持续","生命","爆炸","治疗"];
var pairMap={};
RELICS.forEach(function(r){
  for(var i=0;i<(r.tags||[]).length;i++)for(var j=i+1;j<r.tags.length;j++){
    var k=[r.tags[i],r.tags[j]].sort().join("+");
    if(!pairMap[k])pairMap[k]=0;pairMap[k]++;
  }
});
var gaps=[];
for(var a=0;a<coldTags.length;a++)for(var b=a+1;b<coldTags.length;b++){
  var pk=[coldTags[a],coldTags[b]].sort().join("+");
  if(!pairMap[pk])gaps.push(pk);
}
pushSection("空缺冷标签组合("+gaps.length+")",gaps.join("\n"));

// === BUILD / PICK RULES ===
pushSection("BUILD_PREFS",JSON.stringify(BUILD_PREFS,null,2));
var relicRulesSrc=between(gameSrc,"var RELIC_RULES={","\n};\n\nfunction scoreRelicChoice");
if(!relicRulesSrc&&gameSrc.indexOf("var RELIC_RULES={")>=0&&gameSrc.indexOf("function scoreRelicChoice")>0){
  relicRulesSrc=gameSrc.slice(gameSrc.indexOf("var RELIC_RULES={"),gameSrc.indexOf("function scoreRelicChoice"));
}
var relicRuleIds=[];
var rr;
var rrRe=/^\s*([a-zA-Z0-9_]+):\[/gm;
while((rr=rrRe.exec(relicRulesSrc))!==null)relicRuleIds.push(rr[1]);
pushSection("RELIC_RULES已有专属权重("+relicRuleIds.length+")","["+relicRuleIds.join(", ")+"]");

// === ENEMY TABLES ===
pushSection("ENEMY_COST片段",oneLine(between(dataSrc,"var ENEMY_COST=",";")));
pushSection("DEATH_COLOR片段",oneLine(between(dataSrc,"var DEATH_COLOR=","};")));
pushSection("WAVE_TIERS片段",oneLine(between(dataSrc,"var WAVE_TIERS=","\n];")));
var baseEnemy={name:1,tip:1,hp:1,spd:1,r:1,dmg:1,atkR:1,atkCd:1,col:1,edge:1};
var behaviorFlags=[];
Object.keys(ETYPE).forEach(function(id){
  Object.keys(ETYPE[id]).forEach(function(k){if(!baseEnemy[k])behaviorFlags.push(k)});
});
pushSection("敌人行为字段",uniq(behaviorFlags).sort().join(", "));

// === INSERTION POINTS (从 game.js 提取) ===
var mkMatch=gameSrc.match(/hurtRetaliate:false,hurtRetaliateDmg:0,[\s\S]{0,700}?idleT:0\}/);
if(mkMatch)pushSection("mkPlayer末尾",oneLine(mkMatch[0]));
var ckMatch=gameSrc.match(/'hurtRetaliate','hurtRetaliateDmg',[\s\S]{0,360}?\]\s*;/);
if(ckMatch)pushSection("ck数组末尾",oneLine(ckMatch[0]));
var ngMatch=gameSrc.match(/killExplodeKills:0[\s\S]{0,220}?perf:/);
if(ngMatch)pushSection("newGame计数器",oneLine(ngMatch[0]));
var mrMatch=gameSrc.match(/if\(\(g\.executeKills[\s\S]{0,420}?won&&/);
if(mrMatch)pushSection("metaRecordRun末尾",oneLine(mrMatch[0]));
pushSection("关键函数签名",[
  "hurtP(g, dmg, src) — src 可能是敌人对象或 {name:\"\"}",
  "damageEnemy(g, e, dmg, src)",
  "pushAttack(g, atk)",
  "forEachLiveEnemy(g, function(oe){...})",
  "dstSq(a, b)"
].join("\n"));

// === CSS ICONS ===
var iconRe=/\.relic-pick\[data-icon="([^"]+)"\]/g;
var im,icons=[];
while((im=iconRe.exec(cssSrc))!==null)icons.push(im[1]);
pushSection("已有CSS图标("+uniq(icons).length+")","["+uniq(icons).join(", ")+"]");

// === COUNTS ===
pushSection("计数",[
  "RELICS: "+RELICS.length,
  "ETYPE: "+Object.keys(ETYPE).length,
  "ACHIEVEMENTS: "+ACHIEVEMENTS.length,
  "CURSES: "+CURSES.length,
  "RANGES: "+Object.keys(RANGES).length,
  "PREREQS: "+Object.keys(PREREQS).length,
  "RELIC_RULES: "+relicRuleIds.length
].join("\n"));

// === TEST NUMBERS ===
var testNums=[];
var re=/\/\/ Test (\d+):/g;
var m;
while((m=re.exec(testSrc))!==null)testNums.push(parseInt(m[1],10));
var maxTest=testNums.length>0?Math.max.apply(null,testNums):0;
var minTest=testNums.length>0?Math.min.apply(null,testNums):0;
var missing=[];
for(var tn=minTest;tn<=maxTest;tn++)if(testNums.indexOf(tn)<0)missing.push(tn);
var totalMatch=testSrc.match(/ALL (\d+) TESTS PASSED/);
pushSection("测试",[
  "content_test测试用例数(扫描): "+testNums.length,
  "最高Test编号: "+maxTest,
  "下一个可用Test编号: "+(maxTest+1),
  "缺号: "+(missing.length?missing.join(", "):"无"),
  "结尾ALL计数: "+(totalMatch?totalMatch[1]:"未找到"),
  "测试占位符规则: agent 必须使用 TEST_ID_PLACEHOLDER，主 Claude 合并时替换"
].join("\n"));

console.log(out.join("\n"));
