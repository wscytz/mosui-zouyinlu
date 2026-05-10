// .claude/fix-test-count.js — 扫 content_test.js 里的 Test 块数，自动校准 ALL N TESTS PASSED。
//
// 用法：
//   node .claude/fix-test-count.js           # 只打印状态，不改
//   node .claude/fix-test-count.js --write   # 实际修改 content_test.js

var fs=require("fs");
var path=require("path");

var ROOT=process.cwd();
var TEST_FILE=path.join(ROOT,"content_test.js");

var args=process.argv.slice(2);
var write=args.indexOf("--write")>=0;

var txt=fs.readFileSync(TEST_FILE,"utf8");

// 统计：扫所有形如 "// Test N:" 的锚点（可以在单引号字符串内或普通注释行）
// 历史上两种格式都存在：'// Test 79: xxx' （数组元素）和 // Test 47: xxx （普通注释）
var re=/\/\/\s*Test\s+(\d+):/g,m;
var testIds={};
while((m=re.exec(txt))!==null){testIds[m[1]]=1}
var actualCount=Object.keys(testIds).length;

// 当前 ALL N TESTS PASSED 里的 N
var sumRe=/'else\{console\.log\("ALL\s+(\d+)\s+TESTS\s+PASSED"\);/;
var sm=sumRe.exec(txt);
var summaryCount=sm?parseInt(sm[1],10):null;

console.log("scan result:");
console.log("  unique Test IDs:    "+actualCount);
console.log("  summary says:       "+(summaryCount==null?"(not found)":summaryCount));
var ids=Object.keys(testIds).map(function(x){return parseInt(x,10)});
console.log("  max Test ID:        "+(ids.length?Math.max.apply(null,ids):"(none)"));

if(summaryCount===actualCount){
  console.log("OK: summary matches actual count");
  process.exit(0);
}

if(!write){
  console.log("DIFF: summary "+summaryCount+" != actual "+actualCount);
  console.log("run with --write to fix");
  process.exit(1);
}

if(summaryCount==null){
  console.error("FAIL: could not locate 'ALL N TESTS PASSED' line to update");
  process.exit(2);
}

var newTxt=txt.replace(sumRe,'\'else{console.log("ALL '+actualCount+' TESTS PASSED");');
fs.writeFileSync(TEST_FILE,newTxt);
console.log("WRITE: summary "+summaryCount+" -> "+actualCount);
