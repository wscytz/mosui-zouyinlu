// .claude/fix-html-entities.js — 还原 agent 输出里被错误编码的 HTML entity。
//
// 背景：agent 返回代码块时，< > & " 会被编码成 &lt; &gt; &amp; &quot;。
// 这不是模型问题，是输出通道固有 bug。每次合并前/后扫一遍，兜底任何通道漏进来的。
//
// 用法：
//   node .claude/fix-html-entities.js a.md                    单文件 dry run
//   node .claude/fix-html-entities.js --write a.md b.js       多文件写回
//   node .claude/fix-html-entities.js --write --source        扫 4 个源文件（合并后兜底）
var fs=require("fs");
var path=require("path");

var args=process.argv.slice(2);
var write=args.indexOf("--write")>=0;
var useSource=args.indexOf("--source")>=0;

var files=args.filter(function(a){return a.indexOf("--")!==0});
if(useSource){files=["game.js","gamedata.js","content_test.js","game.css"]}
if(!files.length){console.error("usage: node fix-html-entities.js [--write] [--source] <file...>");process.exit(2)}

var map={"&lt;":"<","&gt;":">","&amp;":"&","&quot;":"\"","&#39;":"'","&apos;":"'"};
var re=/&(?:lt|gt|amp|quot|#39|apos);/g;

var grandTotal=0;
var anyWrite=false;
files.forEach(function(f){
  var p=path.resolve(f);
  if(!fs.existsSync(p)){console.error("SKIP (not found): "+f);return}
  var txt=fs.readFileSync(p,"utf8");
  var counts={};
  var out=txt.replace(re,function(m){counts[m]=(counts[m]||0)+1;return map[m]});
  var total=Object.keys(counts).reduce(function(s,k){return s+counts[k]},0);
  if(!total){console.log("clean: "+f);return}
  grandTotal+=total;
  console.log(f+" found "+total+":");
  Object.keys(counts).forEach(function(k){console.log("  "+k+" x"+counts[k])});
  if(write){fs.writeFileSync(p,out);anyWrite=true;console.log("  WRITE")}
});

if(!grandTotal){console.log("all clean.");process.exit(0)}
if(!write)console.log("\n(dry run; pass --write to fix)");
else if(anyWrite)console.log("\nfixed "+grandTotal+" entity occurrence(s).");
