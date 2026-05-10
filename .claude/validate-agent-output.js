// Validate specialist agent output before the main Claude merges it.
// Usage:
//   node .claude/validate-agent-output.js agent-output.md
//   node .claude/validate-agent-output.js --mode merged merged-snippet.md
//   type agent-output.md | node .claude/validate-agent-output.js
var fs=require("fs");

var args=process.argv.slice(2);
var mode="raw";
var file=null;
for(var ai=0;ai<args.length;ai++){
  if(args[ai]==="--mode"){mode=args[++ai]||mode}
  else if(args[ai].indexOf("--mode=")===0){mode=args[ai].slice(7)}
  else file=args[ai];
}
if(mode!=="raw"&&mode!=="merged"){
  console.error("FAIL: --mode must be raw or merged");
  process.exit(2);
}

var input=file?fs.readFileSync(file,"utf8"):fs.readFileSync(0,"utf8");
var findings=[];
var warnings=[];

function add(kind,msg){findings.push({kind:kind,msg:msg})}
function warn(kind,msg){warnings.push({kind:kind,msg:msg})}
function lineOf(text,index){return text.slice(0,index).split(/\r?\n/).length}
function testRegex(kind,re,text,msg){
  var m=re.exec(text);
  if(m)add(kind,msg+" (line "+lineOf(text,m.index)+")");
}
function extractBlocks(text){
  var blocks=[],re=/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g,m,lastLabel="";
  while((m=re.exec(text))!==null){
    var before=text.slice(0,m.index).split(/\r?\n/);
    lastLabel=before.length?before[before.length-1]:"";
    blocks.push({lang:m[1]||"",body:m[2],label:lastLabel,start:m.index});
  }
  if(!blocks.length)blocks.push({lang:"",body:text,label:"<whole input>",start:0});
  return blocks;
}
function isContentTestBlock(block){
  return /content_test\.js/i.test(block.label)||/\/\/ Test TEST_ID_PLACEHOLDER|\/\/ Test \d+:|errors\.push\(/.test(block.body);
}
function isCkArrayBlock(block){
  return /ck数组|rebuildPlayerStats/i.test(block.label)||/^\s*'[^']+'\s*,/m.test(block.body);
}
function isCssBlock(block){
  return /\.css/i.test(block.label)||/\.relic-pick\[data-icon=/.test(block.body)||/\.ink-icon::(?:before|after)/.test(block.body);
}
function eachMatch(re,text,fn){
  var m;
  while((m=re.exec(text))!==null)fn(m);
}
function escapeRegExp(s){
  return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
}

var C_KEYS={paper:1,edge:1,ink:1,soft:1,accent:1,ash:1,moss:1,ghost:1,ghostE:1,fire:1,fireG:1,spirit:1,spiritG:1,boss:1,bossG:1,gold:1,goldG:1,frost:1,frostE:1,ivory:1,clear:1,fontBody:1,fontTitle:1};
var CSS_VARS={"--ink":1,"--accent":1,"--paper":1,"--game-bg":1};

// Whole-output checks.
testRegex("html-entity",/&(?:gt|lt|amp|quot|#\d+);/g,input,"HTML entity found; use literal characters");
testRegex("content-test-style",/\b(?:content_test|test|it|describe|assert|ok|eq|expect)\s*\(/g,input,"Test framework helper found; content_test.js must use string-array try/errors.push style");
if(/__N__/.test(input))add("test-placeholder","Found __N__; use TEST_ID_PLACEHOLDER for test numbers");
if(mode==="raw"){
  if(/\/\/ Test \d+:/.test(input))add("test-placeholder","Raw agent output contains a concrete Test number; use TEST_ID_PLACEHOLDER");
  if(/content_test\.js|\/\/ Test TEST_ID_PLACEHOLDER|errors\.push\("TEST_ID_PLACEHOLDER/.test(input)){
    if(!/TEST_ID_PLACEHOLDER/.test(input))add("test-placeholder","content_test output is missing TEST_ID_PLACEHOLDER");
  }
}
if(mode==="merged"){
  if(/TEST_ID_PLACEHOLDER/.test(input))add("test-placeholder","Merged output still contains TEST_ID_PLACEHOLDER");
}

// Relic outputs must include a CSS icon for each new relic id.
var relicIds=[];
eachMatch(/\{id:"([A-Za-z0-9_]+)"[\s\S]{0,260}?tags:\[/g,input,function(m){
  if(relicIds.indexOf(m[1])<0)relicIds.push(m[1]);
});
relicIds.forEach(function(id){
  var eid=escapeRegExp(id);
  var beforeRe=new RegExp("\\.relic-pick\\s*\\[\\s*data-icon\\s*=\\s*[\"']"+eid+"[\"']\\s*\\]\\s+\\.ink-icon::before");
  var afterRe=new RegExp("\\.relic-pick\\s*\\[\\s*data-icon\\s*=\\s*[\"']"+eid+"[\"']\\s*\\]\\s+\\.ink-icon::after");
  if(!beforeRe.test(input))add("css-missing","Relic "+id+" is missing exact .relic-pick[data-icon=\""+id+"\"] .ink-icon::before selector");
  if(!afterRe.test(input))add("css-missing","Relic "+id+" is missing exact .relic-pick[data-icon=\""+id+"\"] .ink-icon::after selector");
});

var blocks=extractBlocks(input);
blocks.forEach(function(block){
  var body=block.body;
  var label=block.label||"<block>";
  var offset=block.start;
  function blockLine(idx){return lineOf(input,offset+idx)}

  var checks=[
    {kind:"es6",re:/\b(let|const)\b/g,msg:"ES6 let/const found"},
    {kind:"es6",re:/=>/g,msg:"Arrow function found"},
    {kind:"loop",re:/for\s*\([^)]*\b(?:of|in)\b/g,msg:"for...of / for...in found"},
    {kind:"raw-loop",re:/for\s*\(\s*var\s+i\s*=\s*0\s*;\s*i\s*<\s*g\.enemies\.length/g,msg:"Raw g.enemies loop found; use forEachLiveEnemy(g, function(oe){...})"},
    {kind:"manual-dist",re:/\bdx\s*\*\s*dx\s*\+\s*dy\s*\*\s*dy\b/g,msg:"Manual distance calculation found; use dstSq(a, b)"},
    {kind:"pool-push",re:/\bg\.(?:attacks|fires|eProj|particles|floatTexts|decoys|kites|frosts|enemies|inkSpirits|formations|soulOrbs|pendingDeathbursts)\.push\s*\(/g,msg:"Direct g pool .push found; use project helper"},
    {kind:"attack-push",re:/pushLimited\s*\(\s*g\.attacks\s*,/g,msg:"Use pushAttack(g, atk) for g.attacks"},
    {kind:"hp-mutation",re:/\be\.hp\s*[-+*/]?=/g,msg:"Direct e.hp mutation found; use damageEnemy/onEnemyKilled pattern"},
    {kind:"arguments",re:/\barguments\s*\[/g,msg:"Do not use arguments[]; use named parameters already in the function signature"},
    {kind:"bad-function",re:/\b(?:giveRelic|mkGame|spawnFloatText|content_test|test|it|describe|assert|ok|eq|expect)\s*\(/g,msg:"Unknown/wrong function name found; use project helpers"},
    {kind:"test-style",re:/errors\.push\s*\(\s*'/g,msg:"Use double-quote strings inside errors.push()"},
    {kind:"raw-loop",re:/\bg\.enemies\.forEach\s*\(/g,msg:"Raw g.enemies.forEach found; use forEachLiveEnemy(g, function(oe){...})"},
    {kind:"manual-dist",re:/\bdxdx\s*\+\s*dydy\b/g,msg:"Manual distance variable sum found; use dstSq(a, b)"}
  ];
  checks.forEach(function(c){
    var m=c.re.exec(body);
    if(m)add(c.kind,c.msg+" in "+label+" (line "+blockLine(m.index)+")");
  });

  if(!isContentTestBlock(block)&&!isCkArrayBlock(block)){
    var sm=/(^|[^A-Za-z0-9_])'[^'\r\n]*'/.exec(body);
    if(sm)warn("quote-style","Single-quoted string outside content_test/ck block in "+label+" (line "+blockLine(sm.index)+")");
  }

  if(/\.relic-pick\[data-icon=/.test(body)&&/content\s*:\s*["'][^"']+["']/.test(body)){
    add("css-icon","CSS icon uses content; use pure shapes without content in "+label);
  }

  // CSS block: check for hex/rgb colors instead of var()
  if(isCssBlock(block)){
    var hexColor=/:\s*#[0-9a-fA-F]{3,8}\b/g;
    var hm=hexColor.exec(body);
    if(hm)add("css-hex","CSS uses hex color; use var(--ink)/var(--accent)/var(--paper) in "+label+" (line "+blockLine(hm.index)+")");
    var rgbColor=/\b(?:rgb|rgba|hsl|hsla)\s*\(/g;
    var rm=rgbColor.exec(body);
    if(rm)add("css-rgb","CSS uses rgb/rgba/hsl color; use var(--ink)/var(--accent)/var(--paper)/var(--game-bg) in "+label+" (line "+blockLine(rm.index)+")");
    eachMatch(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g,body,function(vm){
      if(!CSS_VARS[vm[1]])add("css-var","CSS uses unsupported var("+vm[1]+"); allowed: --ink, --accent, --paper, --game-bg in "+label+" (line "+blockLine(vm.index)+")");
    });
    var cssForbidden=[
      {kind:"css-position",re:/\bposition\s*:/g,msg:"CSS icon uses position; keep icon shapes simple"},
      {kind:"css-shadow",re:/\bbox-shadow\s*:/g,msg:"CSS icon uses box-shadow; keep icon shapes simple"},
      {kind:"css-inset",re:/\binset\s*:/g,msg:"CSS icon uses inset; keep icon shapes simple"},
      {kind:"css-opacity",re:/\bopacity\s*:/g,msg:"CSS icon uses opacity; keep icon shapes simple"},
      {kind:"css-content",re:/\bcontent\s*:/g,msg:"CSS icon uses content; content is forbidden even when empty"},
      {kind:"css-offset",re:/\b(?:top|left|right|bottom)\s*:/g,msg:"CSS icon uses positional offset; use transform/shape-only icon rules"}
    ];
    cssForbidden.forEach(function(c){
      var m=c.re.exec(body);
      if(m)add(c.kind,c.msg+" in "+label+" (line "+blockLine(m.index)+")");
    });
  }

  eachMatch(/\bC\.([A-Za-z0-9_]+)/g,body,function(cm){
    if(!C_KEYS[cm[1]])add("bad-color","Unknown C."+cm[1]+" color constant in "+label+" (line "+blockLine(cm.index)+")");
  });

  if(isContentTestBlock(block)){
    var varContentTest=/\bvar\s+content_test\s*=\s*\[/g;
    var vcm=varContentTest.exec(body);
    if(vcm)add("content-test-style","content_test uses var content_test=[...] array style; use existing string-array try/errors.push pattern in "+label+" (line "+blockLine(vcm.index)+")");
    var testFramework=/\b(?:content_test|test|it|describe|assert|ok|eq|expect)\s*\(/g;
    var tm=testFramework.exec(body);
    if(tm)add("content-test-style","content_test.js must use existing string-array try/errors.push style, not test/assert helpers in "+label+" (line "+blockLine(tm.index)+")");
  }

  var reset=/fn\s*:\s*function\s*\(\s*p\s*\)\s*\{[^}]*p\._[A-Za-z0-9_]+\s*=\s*0/g.exec(body);
  if(reset){
    add("relic-fn-reset","Relic fn resets an underscored accumulator; use (p._x||0)+N or only initialize in mkPlayer (line "+blockLine(reset.index)+")");
  }
});

if(warnings.length){
  console.log("WARN ("+warnings.length+"):");
  warnings.forEach(function(w){console.log("  - "+w.kind+": "+w.msg)});
}
if(findings.length){
  console.log("FAIL ("+findings.length+"):");
  findings.forEach(function(f){console.log("  - "+f.kind+": "+f.msg)});
  process.exit(1);
}
console.log("PASS: agent output validation passed ("+mode+")");
