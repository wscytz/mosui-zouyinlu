// .claude/fix-html-entities.js — 还原 agent 输出里被错误编码的 HTML entity。
//
// 背景：agent 返回代码块时，< > & " 会被编码成 &lt; &gt; &amp; &quot;。
// 这不是模型问题，是输出通道固有 bug。每次合并前主 Claude 手修很烦。
//
// 用法：
//   node .claude/fix-html-entities.js agent-output.md          显示会改哪些位置
//   node .claude/fix-html-entities.js --write agent-output.md  实际写回
var fs=require("fs");

var args=process.argv.slice(2);
var write=args.indexOf("--write")>=0;
var file=args.filter(function(a){return a.indexOf("--")!==0})[0];
if(!file){console.error("usage: node fix-html-entities.js [--write] <file>");process.exit(2)}

var txt=fs.readFileSync(file,"utf8");
var map={"&lt;":"<","&gt;":">","&amp;":"&","&quot;":"\"","&#39;":"'","&apos;":"'"};

var counts={};
var out=txt.replace(/&(?:lt|gt|amp|quot|#39|apos);/g,function(m){
  counts[m]=(counts[m]||0)+1;
  return map[m];
});

var total=Object.keys(counts).reduce(function(s,k){return s+counts[k]},0);
if(!total){console.log("no HTML entities found.");process.exit(0)}

console.log("found "+total+" entity occurrence(s):");
Object.keys(counts).forEach(function(k){console.log("  "+k+" x"+counts[k])});

if(write){fs.writeFileSync(file,out);console.log("WRITE: "+file)}
else console.log("(dry run; pass --write to fix)");
