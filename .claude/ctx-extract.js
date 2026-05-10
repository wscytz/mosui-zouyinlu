// 一键提取 agent 需要的所有上下文，输出为可直接粘贴进 prompt 的格式
var fs=require('fs');
eval(fs.readFileSync('gamedata.js','utf8'));

var out=[];

// === EXISTING IDS ===
out.push('=== 现有ID ===');
out.push('RELICS('+RELICS.length+'): ['+RELICS.map(function(r){return r.id}).join(', ')+']');
out.push('ETYPE: ['+Object.keys(ETYPE).join(', ')+']');
out.push('ACHIEVEMENTS('+ACHIEVEMENTS.length+'): ['+ACHIEVEMENTS.map(function(a){return a.id}).join(', ')+']');
out.push('CURSES: ['+CURSES.map(function(c){return c.id}).join(', ')+']');
out.push('RANGES keys: ['+Object.keys(RANGES).join(', ')+']');

// === COLD TAGS ===
var tagCount={};
RELICS.forEach(function(r){r.tags.forEach(function(t){if(!tagCount[t])tagCount[t]=0;tagCount[t]++})});
var cold=Object.entries(tagCount).sort(function(a,b){return a[1]-b[1]}).filter(function(e){return e[1]<8});
out.push('\n=== 冷标签 ===');
cold.forEach(function(e){out.push(e[0]+': '+e[1])});

// === COLD PAIR GAPS ===
var coldTags=['分裂','防御','溅射','持续','生命','爆炸','治疗'];
var pairMap={};
RELICS.forEach(function(r){
  for(var i=0;i<r.tags.length;i++)for(var j=i+1;j<r.tags.length;j++){
    var k=[r.tags[i],r.tags[j]].sort().join('+');
    if(!pairMap[k])pairMap[k]=0;pairMap[k]++;
  }
});
var gaps=[];
for(var a=0;a<coldTags.length;a++)for(var b=a+1;b<coldTags.length;b++){
  var k=[coldTags[a],coldTags[b]].sort().join('+');
  if(!pairMap[k])gaps.push(k);
}
out.push('\n=== 空缺冷标签组合('+gaps.length+') ===');
gaps.forEach(function(g){out.push(g)});

// === INSERTION POINTS (从 game.js 提取) ===
var gameSrc=fs.readFileSync('game.js','utf8');

// mkPlayer last fields
var mkMatch=gameSrc.match(/hurtRetaliate:false,hurtRetaliateDmg:0,[\s\S]{0,200}?maxHpOverride/);
if(mkMatch) out.push('\n=== mkPlayer末尾 ===\n'+mkMatch[0].replace(/\n/g,'\\n'));

// rebuildPlayerStats ck末尾
var ckMatch=gameSrc.match(/'hurtRetaliate','hurtRetaliateDmg',[\s\S]{0,300}?\]\s*;/);
if(ckMatch) out.push('\n=== ck数组末尾 ===\n'+ckMatch[0].replace(/\n/g,'\\n'));

// newGame counters
var ngMatch=gameSrc.match(/killExplodeKills:0[\s\S]{0,200}?perf:/);
if(ngMatch) out.push('\n=== newGame计数器 ===\n'+ngMatch[0].replace(/\n/g,'\\n'));

// metaRecordRun
var mrMatch=gameSrc.match(/if\(\(g\.executeKills[\s\S]{0,400}?won&&/);
if(mrMatch) out.push('\n=== metaRecordRun末尾 ===\n'+mrMatch[0].replace(/\n/g,'\\n'));

// === COUNTS ===
out.push('\n=== 计数 ===');
out.push('RELICS: '+RELICS.length);
out.push('ETYPE: '+Object.keys(ETYPE).length);
out.push('ACHIEVEMENTS: '+ACHIEVEMENTS.length);
out.push('CURSES: '+CURSES.length);
out.push('RANGES: '+Object.keys(RANGES).length);

// test numbers - scan ALL Test N: to find max (ALL N TESTS PASSED is unreliable)
var testSrc=fs.readFileSync('content_test.js','utf8');
var testNums=[];
var re=/\/\/ Test (\d+):/g;
var m;
while((m=re.exec(testSrc))!==null) testNums.push(parseInt(m[1]));
var maxTest=testNums.length>0?Math.max.apply(null,testNums):0;
out.push('\n=== 测试 ===');
out.push('content_test测试用例数(扫描): '+testNums.length);
out.push('最高Test编号: '+maxTest);
out.push('下一个可用Test编号: '+(maxTest+1));

console.log(out.join('\n'));
