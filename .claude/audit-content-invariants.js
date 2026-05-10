// Report cross-file content invariants. Default mode reports only.
// Use --strict to make ERROR findings exit non-zero.

var fs=require("fs");
var path=require("path");

var ROOT=process.cwd();
var strict=process.argv.indexOf("--strict")>=0;

var dataSrc=fs.readFileSync(path.join(ROOT,"gamedata.js"),"utf8");
var gameSrc=fs.readFileSync(path.join(ROOT,"game.js"),"utf8");
var cssSrc=fs.readFileSync(path.join(ROOT,"game.css"),"utf8");
var testSrc=fs.readFileSync(path.join(ROOT,"content_test.js"),"utf8");

eval(dataSrc);

var findings=[];

function add(level,msg){findings.push({level:level,msg:msg})}
function uniq(arr){
  var seen={},out=[];
  arr.forEach(function(x){if(!seen[x]){seen[x]=true;out.push(x)}});
  return out;
}
function dupes(arr){
  var seen={},dupe={};
  arr.forEach(function(x){if(seen[x])dupe[x]=true;seen[x]=true});
  return Object.keys(dupe);
}
function keys(obj){return Object.keys(obj||{})}

var relicIds=RELICS.map(function(r){return r.id});
var enemyIds=keys(ETYPE);
var achievementIds=ACHIEVEMENTS.map(function(a){return a.id});
var curseIds=CURSES.map(function(c){return c.id});

dupes(relicIds).forEach(function(id){add("ERROR","duplicate relic id: "+id)});
dupes(enemyIds).forEach(function(id){add("ERROR","duplicate enemy id: "+id)});
dupes(achievementIds).forEach(function(id){add("ERROR","duplicate achievement id: "+id)});
dupes(curseIds).forEach(function(id){add("ERROR","duplicate curse id: "+id)});

var iconRe=/\.relic-pick\[data-icon="([^"]+)"\]/g;
var icons=[],m;
while((m=iconRe.exec(cssSrc))!==null)icons.push(m[1]);
icons=uniq(icons);
var iconSet={};
icons.forEach(function(id){iconSet[id]=true});
relicIds.forEach(function(id){if(!iconSet[id])add("ERROR","relic missing CSS icon: "+id)});
icons.forEach(function(id){if(relicIds.indexOf(id)<0)add("WARN","CSS icon has no relic: "+id)});

var testNums=[];
var testRe=/\/\/\s*Test\s+(\d+):/g;
while((m=testRe.exec(testSrc))!==null)testNums.push(parseInt(m[1],10));
var testDupes=dupes(testNums.map(String));
testDupes.forEach(function(id){add("ERROR","duplicate content_test id: "+id)});
var summary=testSrc.match(/ALL\s+(\d+)\s+TESTS\s+PASSED/);
if(!summary)add("ERROR","content_test summary not found");
else if(parseInt(summary[1],10)!==testNums.length){
  add("ERROR","content_test summary mismatch: summary="+summary[1]+" scanned="+testNums.length);
}

enemyIds.forEach(function(id){
  if(!ENEMY_COST||ENEMY_COST[id]===undefined)add("ERROR","enemy missing ENEMY_COST: "+id);
  if(!DEATH_COLOR||DEATH_COLOR[id]===undefined)add("ERROR","enemy missing DEATH_COLOR: "+id);
  if(!ETYPE[id].tip)add("ERROR","enemy missing tip: "+id);
});

var waveEnemySet={};
(WAVE_TIERS||[]).forEach(function(tier){(tier||[]).forEach(function(id){waveEnemySet[id]=true})});
enemyIds.forEach(function(id){
  if(!ETYPE[id].isBoss&&id!=="boss"&&!waveEnemySet[id])add("WARN","non-boss enemy not present in WAVE_TIERS: "+id);
});
keys(waveEnemySet).forEach(function(id){if(!ETYPE[id])add("ERROR","WAVE_TIERS references missing enemy: "+id)});

var rrSrc="";
var rrStart=gameSrc.indexOf("var RELIC_RULES={");
var rrEnd=gameSrc.indexOf("function scoreRelicChoice",rrStart);
if(rrStart>=0&&rrEnd>rrStart)rrSrc=gameSrc.slice(rrStart,rrEnd);
var rrIds=[],rr;
var rrRe=/^\s*([a-zA-Z0-9_]+):\[/gm;
while((rr=rrRe.exec(rrSrc))!==null)rrIds.push(rr[1]);
var rrSet={};
rrIds.forEach(function(id){rrSet[id]=true});
rrIds.forEach(function(id){if(relicIds.indexOf(id)<0)add("WARN","RELIC_RULES references missing relic: "+id)});
if(rrIds.length<Math.floor(relicIds.length*0.35)){
  add("WARN","RELIC_RULES coverage low: "+rrIds.length+"/"+relicIds.length);
}

var tagCount={};
RELICS.forEach(function(r){(r.tags||[]).forEach(function(t){tagCount[t]=(tagCount[t]||0)+1})});
keys(tagCount).filter(function(t){return tagCount[t]<3}).sort(function(a,b){return tagCount[a]-tagCount[b]}).forEach(function(t){
  add("WARN","cold tag under 3 relics: "+t+"="+tagCount[t]);
});

var errorCount=findings.filter(function(f){return f.level==="ERROR"}).length;
var warnCount=findings.filter(function(f){return f.level==="WARN"}).length;

console.log("=== content invariant audit ===");
console.log("RELICS="+relicIds.length+" CSS_ICONS="+icons.length+" ETYPE="+enemyIds.length+" ACHIEVEMENTS="+achievementIds.length+" CURSES="+curseIds.length+" CONTENT_TESTS="+testNums.length);
if(!findings.length)console.log("OK: no findings");
findings.forEach(function(f){console.log(f.level+": "+f.msg)});
console.log("SUMMARY: errors="+errorCount+" warnings="+warnCount+" mode="+(strict?"strict":"report-only"));

if(strict&&errorCount)process.exit(1);
