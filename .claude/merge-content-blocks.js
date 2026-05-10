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
var rules=require("./content-block-rules.js");

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
var check=rules.validateBlocks(blocks);
if(check.warnings.length){
  console.error("WARN ("+check.warnings.length+"):");
  check.warnings.forEach(function(e){console.error("  - "+e)});
}
if(!check.ok){
  console.error("FAIL ("+check.errors.length+"):");
  check.errors.forEach(function(e){console.error("  - "+e)});
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
var GAMEJS=path.join(ROOT,"game.js");
var GAMECSS=path.join(ROOT,"game.css");
var gjTxt=fs.readFileSync(GAMEJS,"utf8");
var ccTxt=fs.readFileSync(GAMECSS,"utf8");

function findArrayEnd(txt,startRe){
  // 找到匹配的 `]`
  var o=startRe.exec(txt);
  if(!o)return -1;
  var depth=0,i=o.index+o[0].length-1;
  while(i<txt.length){
    if(txt[i]==="[")depth++;
    else if(txt[i]==="]"){depth--;if(depth===0)return i}
    i++;
  }
  return -1;
}

function insertInArray(txt,startRe,indent,entry){
  var close=findArrayEnd(txt,startRe);
  if(close<0)throw new Error("array end not found for "+startRe);
  var before=txt.slice(0,close);
  var lastBrace=before.lastIndexOf("}");
  if(lastBrace<0)throw new Error("array seems empty for "+startRe);
  return txt.slice(0,lastBrace+1)+",\n"+indent+entry+txt.slice(lastBrace+1);
}

// ---- 合并 gamedata.js ----
blocks.forEach(function(b){
  var entry=b.entry_js.trim().replace(/^,\s*/,"");

  if(b.type==="relic"){
    gamedataTxt=insertInArray(gamedataTxt,/var\s+RELICS\s*=\s*\[/,"  ",entry);
  } else if(b.type==="evolution"){
    var pool=b.pool;
    var openRe=new RegExp("\\b"+pool+":\\[");
    gamedataTxt=insertInArray(gamedataTxt,openRe,"    ",entry);
  }
});

// ---- 合并 game.js (relic 的 player_fields / ck_fields / mechanic_insertions) ----
blocks.filter(function(b){return b.type==="relic"}).forEach(function(b){
  // mkPlayer 字段：在 `idleT:0}` 之前插入
  if(b.player_fields&&b.player_fields.length){
    var mkpRe=/(    )idleT:0\}/;
    if(!mkpRe.exec(gjTxt))throw new Error("mkPlayer idleT:0 anchor not found");
    var inserted=b.player_fields.map(function(f){return "    "+f}).join("\n")+"\n";
    gjTxt=gjTxt.replace(mkpRe,inserted+"$1idleT:0}");
  }

  // ck 数组：项目里格式是 `var ck=[\n    'a','b',\n    'c']`
  // 简化：找 `var ck=[` 开始到匹配 `]`，在最后的 `']` 前插入 `,\n    '<new>'`
  if(b.ck_fields&&b.ck_fields.length){
    var ckStartRe=/var\s+ck\s*=\s*\[/;
    var ckClose=findArrayEnd(gjTxt,ckStartRe);
    if(ckClose<0)throw new Error("var ck=[...] not found in game.js");
    // 在 ckClose 位置（`]` 字符）之前，找前一个非空白字符
    // 项目内通常是 `'name']`，我们要变成 `'name',\n    'new1',\n    'new2']`
    var insertPos=ckClose; // 就在 `]` 之前插入
    var newItems=b.ck_fields.map(function(f){return "    "+f}).join(",\n");
    var prefix=",\n"+newItems+"\n    ";
    // 如果前一个字符已经是换行或逗号，简化
    gjTxt=gjTxt.slice(0,insertPos)+prefix+gjTxt.slice(insertPos);
  }

  // 机制插入：在 anchor 之后插入 code
  if(b.mechanic_insertions&&b.mechanic_insertions.length){
    b.mechanic_insertions.forEach(function(ins){
      if(!ins.anchor||!ins.code)throw new Error("mechanic_insertions require {anchor, code}");
      var idx=gjTxt.indexOf(ins.anchor);
      if(idx<0)throw new Error("mechanic anchor not found: "+ins.anchor.slice(0,60));
      // 在 anchor 所在行的下一行开头插入 code
      var lineEnd=gjTxt.indexOf("\n",idx);
      if(lineEnd<0)lineEnd=gjTxt.length;
      gjTxt=gjTxt.slice(0,lineEnd+1)+ins.code+(ins.code.endsWith("\n")?"":"\n")+gjTxt.slice(lineEnd+1);
    });
  }
});

// ---- 合并 game.css (relic css_rules 追加到文件末尾) ----
blocks.filter(function(b){return b.type==="relic"&&b.css_rules}).forEach(function(b){
  var rules=b.css_rules.trim();
  if(ccTxt.indexOf(rules.slice(0,60))>=0)return; // 已在
  if(!ccTxt.endsWith("\n"))ccTxt+="\n";
  ccTxt+=rules+"\n";
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
fs.writeFileSync(GAMEJS,gjTxt);
fs.writeFileSync(GAMECSS,ccTxt);
console.log("\nWRITE: "+blocks.length+" blocks merged");

// fix count
try{
  child.execSync("node .claude/fix-html-entities.js --write --source",{cwd:ROOT,stdio:"inherit"});
}catch(e){console.error("WARN: fix-html-entities failed: "+e.message)}
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
