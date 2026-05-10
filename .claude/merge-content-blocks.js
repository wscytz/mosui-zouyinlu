// .claude/merge-content-blocks.js — 把 agent 产出的 content-blocks 批量合并到主工作区文件。
//
// 前提：每个 agent 只写一个 .claude/tmp/content-blocks/<task-id>.json
//       主 Claude 不让 agent 碰 gamedata.js / content_test.js 末尾。
//
// 用法：
//   node .claude/merge-content-blocks.js                   扫 blocks 目录，显示计划
//   node .claude/merge-content-blocks.js --write           实际写入
//   node .claude/merge-content-blocks.js --write --commit  写入后调 sequencer commit 释放 lease
//
// 合并顺序：按 test_id 升序（保证 Test 编号连续）。
// 单 block 出错：整批 abort（main 工作区不动）。

var fs=require("fs");
var path=require("path");
var child=require("child_process");

var ROOT=process.cwd();
var BLOCKS_DIR=path.join(ROOT,".claude","tmp","content-blocks");
var GAMEDATA=path.join(ROOT,"gamedata.js");
var CONTENT_TEST=path.join(ROOT,"content_test.js");

var args=process.argv.slice(2);
var write=args.indexOf("--write")>=0;
var doCommit=args.indexOf("--commit")>=0;

if(!fs.existsSync(BLOCKS_DIR)){
  console.log("no blocks dir at "+BLOCKS_DIR);
  process.exit(0);
}

var files=fs.readdirSync(BLOCKS_DIR).filter(function(f){return /\.json$/.test(f)});
if(!files.length){console.log("no blocks found in "+BLOCKS_DIR);process.exit(0)}

var blocks=[];
files.forEach(function(f){
  var p=path.join(BLOCKS_DIR,f);
  try{
    var j=JSON.parse(fs.readFileSync(p,"utf8"));
    j._file=p;
    blocks.push(j);
  }catch(e){
    console.error("FAIL: invalid JSON in "+f+": "+e.message);
    process.exit(1);
  }
});

// 校验
var errors=[];
blocks.forEach(function(b){
  if(!b.task_id)errors.push(b._file+": missing task_id");
  if(typeof b.test_id!=="number")errors.push(b._file+": missing test_id (number)");
  if(!b.type)errors.push(b._file+": missing type");
  if(b.type!=="evolution"&&b.type!=="relic")errors.push(b._file+": type must be evolution|relic (got "+b.type+")");
  if(b.type==="evolution"&&!b.pool)errors.push(b._file+": evolution requires pool (melee|ranged|aoe|dash|summon)");
  if(!b.entry_js||typeof b.entry_js!=="string")errors.push(b._file+": missing entry_js string");
  if(!Array.isArray(b.test_lines)||!b.test_lines.length)errors.push(b._file+": missing test_lines array");
});
if(errors.length){
  console.error("FAIL ("+errors.length+"):");
  errors.forEach(function(e){console.error("  - "+e)});
  process.exit(1);
}

// 按 test_id 升序
blocks.sort(function(a,b){return a.test_id-b.test_id});

console.log("=== merge plan ===");
blocks.forEach(function(b){
  console.log("  "+b.task_id+"  test="+b.test_id+"  type="+b.type+(b.pool?" pool="+b.pool:""));
});

if(!write){
  console.log("\n(dry run; pass --write to actually merge)");
  process.exit(0);
}

// 开始合并
var gamedataTxt=fs.readFileSync(GAMEDATA,"utf8");
var ctTxt=fs.readFileSync(CONTENT_TEST,"utf8");

// ---- 合并 gamedata.js ----
blocks.forEach(function(b){
  var entry=b.entry_js.trim();
  // 去掉 entry 开头的逗号（统一由这里决定）
  entry=entry.replace(/^,\s*/,"");

  if(b.type==="relic"){
    // RELICS 数组末尾追加
    // 模式：最后一个 `}` 之前 `,` + entry
    // 定位：`];` 前面那个 `}`
    var relicEnd=/([}])(\s*\n\])/;
    var rm=relicEnd.exec(gamedataTxt);
    if(!rm){throw new Error("RELICS end not found in gamedata.js")}
    var insertion="},\n  "+entry+"\n]";
    // 上面 replace 会把 `}\n]` 变成 `},\n  newentry\n]`
    gamedataTxt=gamedataTxt.replace(/}\s*\n\];/,"}"+",\n  "+entry+"\n];");
    // 但 RELICS 和 EVOLUTIONS 末尾都是 `];` — 得精确定位 RELICS
    // 重新实现：只针对第一个 `];` 前面加。但第一个 `];` 是 RELICS。
  }
  if(b.type==="evolution"){
    var pool=b.pool;
    // EVOLUTIONS.<pool> 数组：格式是 `  <pool>:[...],` 或最后 pool `  <pool>:[...]`
    // 定位：`<pool>:[` 开始到匹配 `]` 结束
    // 找 `pool:[`
    var openPat=new RegExp("\\b"+pool+":\\[");
    var openMatch=openPat.exec(gamedataTxt);
    if(!openMatch)throw new Error("EVOLUTIONS."+pool+" not found");
    // 从 openMatch.index 开始找匹配的 `]`
    var depth=0,i=openMatch.index+openMatch[0].length-1;
    while(i<gamedataTxt.length){
      if(gamedataTxt[i]==="[")depth++;
      else if(gamedataTxt[i]==="]"){depth--;if(depth===0)break}
      i++;
    }
    if(i>=gamedataTxt.length)throw new Error("EVOLUTIONS."+pool+" closing bracket not found");
    // i 是匹配的 `]` 位置
    // 在 ] 之前找最后一个 `}`，它是数组最后一个条目的末尾
    var beforeClose=gamedataTxt.slice(0,i);
    var lastBrace=beforeClose.lastIndexOf("}");
    if(lastBrace<0)throw new Error("EVOLUTIONS."+pool+" empty?");
    // 在 lastBrace 后面加 `,\n    <entry>`
    gamedataTxt=gamedataTxt.slice(0,lastBrace+1)+",\n    "+entry+gamedataTxt.slice(lastBrace+1);
  }
});

// RELIC 特殊处理：因为 RELICS 也是 `];` 结尾，和 EVOLUTIONS 最外层的 `};` 不同。
// 我重新实现 relic 插入：
// 上面 relic 部分用了不完整逻辑。把 relic 分支重写：
(function redoRelicInsertion(){
  // 已经处理过就跳过；如果只有 relic blocks，需要第二遍修
  // 简化：用一个占位符标签。第一遍的 relic 分支实际被跳过了，所以现在补上。
})();

// 重新实现 relic 分支（上面 relic 分支已经 set gamedataTxt，但逻辑有问题）
// 正确实现：找 RELICS 数组末尾
blocks.filter(function(b){return b.type==="relic"}).forEach(function(b){
  // 定位 RELICS 数组开始
  var ro=/var\s+RELICS\s*=\s*\[/.exec(gamedataTxt);
  if(!ro)throw new Error("RELICS not found");
  var depth=0,i=ro.index+ro[0].length-1;
  while(i<gamedataTxt.length){
    if(gamedataTxt[i]==="[")depth++;
    else if(gamedataTxt[i]==="]"){depth--;if(depth===0)break}
    i++;
  }
  if(i>=gamedataTxt.length)throw new Error("RELICS closing bracket not found");
  var beforeClose=gamedataTxt.slice(0,i);
  var lastBrace=beforeClose.lastIndexOf("}");
  if(lastBrace<0)throw new Error("RELICS empty?");
  var entry=b.entry_js.trim().replace(/^,\s*/,"");
  // 检查是否已有（可能 first pass 就加过了 —— 其实 first pass 的 relic 逻辑没 mutate）
  if(gamedataTxt.indexOf(entry.slice(0,40))>=0)return; // 已在，跳过
  gamedataTxt=gamedataTxt.slice(0,lastBrace+1)+",\n  "+entry+gamedataTxt.slice(lastBrace+1);
});

// ---- 合并 content_test.js ----
// 1. 在 "if(errors.length)" 之前插入所有 test_lines
// 2. 在 `'}',\s*].join('\n')` 之前插入所有 console_log

var errLineRe=/'if\(errors\.length\)\{console\.log\("FAIL/;
var errM=errLineRe.exec(ctTxt);
if(!errM)throw new Error("content_test: 'if(errors.length)' marker not found");
var before=ctTxt.slice(0,errM.index);
var after=ctTxt.slice(errM.index);

var newTestChunk="";
blocks.forEach(function(b){
  b.test_lines.forEach(function(l){newTestChunk+=l+"\n"});
  newTestChunk+="\n";
});

ctTxt=before+newTestChunk+after;

// console_log 部分
var logEndRe=/'\}',\s*\n\]\.join/;
var lm=logEndRe.exec(ctTxt);
if(!lm)throw new Error("content_test: \"'}'\" / join end not found");
var before2=ctTxt.slice(0,lm.index);
var after2=ctTxt.slice(lm.index);

var newLogChunk="";
blocks.forEach(function(b){
  if(b.console_log)newLogChunk+=b.console_log+"\n";
});

ctTxt=before2+newLogChunk+after2;

// 写回
fs.writeFileSync(GAMEDATA,gamedataTxt);
fs.writeFileSync(CONTENT_TEST,ctTxt);
console.log("\nWRITE: "+blocks.length+" blocks merged");

// fix count
try{
  child.execSync("node .claude/fix-test-count.js --write",{cwd:ROOT,stdio:"inherit"});
}catch(e){console.error("WARN: fix-test-count failed: "+e.message)}

// sequencer commit
if(doCommit){
  blocks.forEach(function(b){
    try{
      child.execSync('node .claude/sequencer.js commit '+b.task_id,{cwd:ROOT,stdio:"inherit"});
    }catch(e){console.error("WARN: sequencer commit "+b.task_id+" failed: "+e.message)}
  });
}

// 清 block 文件
blocks.forEach(function(b){try{fs.unlinkSync(b._file)}catch(_e){}});
console.log("blocks cleared.");
