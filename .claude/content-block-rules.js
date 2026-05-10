// Shared validation rules for Scheme B content blocks.
// Keep this file side-effect free so merger, fixtures, and audits can reuse it.

var CSS_VAR_ALLOW={ink:1,accent:1,paper:1,"game-bg":1};

function escRe(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}

function blockName(b){
  return b&&b._file?b._file:(b&&b.task_id?b.task_id:"<block>");
}

function textOfLines(lines){
  if(!Array.isArray(lines))return "";
  return lines.join("\n");
}

function relicIdFromEntry(entry){
  var m=String(entry||"").match(/\bid\s*:\s*"([^"]+)"/);
  return m?m[1]:null;
}

function hasBadRuntimeSyntax(txt){
  var bad=[];
  if(/\blet\b/.test(txt))bad.push("let");
  if(/\bconst\b/.test(txt))bad.push("const");
  if(/=>/.test(txt))bad.push("arrow function");
  if(/\bfor\s*\([^)]*\bof\b/.test(txt))bad.push("for...of");
  if(/\bfor\s*\([^)]*\bin\b/.test(txt))bad.push("for...in");
  return bad;
}

function validateCssRules(b,errors,warnings){
  var name=blockName(b);
  var css=b.css_rules||"";
  var id=relicIdFromEntry(b.entry_js);
  if(!id){
    errors.push(name+": relic entry_js must include id:\"...\"");
    return;
  }
  if(typeof css!=="string"||!css.trim()){
    errors.push(name+": relic requires css_rules string");
    return;
  }

  var beforeRe=new RegExp("\\.relic-pick\\[data-icon=\""+escRe(id)+"\"\\]\\s+\\.ink-icon::before");
  var afterRe=new RegExp("\\.relic-pick\\[data-icon=\""+escRe(id)+"\"\\]\\s+\\.ink-icon::after");
  if(!beforeRe.test(css))errors.push(name+": css_rules missing .relic-pick[data-icon=\""+id+"\"] .ink-icon::before");
  if(!afterRe.test(css))errors.push(name+": css_rules missing .relic-pick[data-icon=\""+id+"\"] .ink-icon::after");
  if(/\.ink-icon\s+::/.test(css))errors.push(name+": css selector has space before pseudo-element (.ink-icon ::before)");

  var forbidden=[
    ["content property",/\bcontent\s*:/],
    ["position property",/\bposition\s*:/],
    ["box-shadow property",/\bbox-shadow\s*:/],
    ["inset property",/\binset\s*:/],
    ["opacity property",/\bopacity\s*:/],
    ["top property",/\btop\s*:/],
    ["left property",/\bleft\s*:/],
    ["right property",/\bright\s*:/],
    ["bottom property",/\bbottom\s*:/],
    ["hex color",/#[0-9a-fA-F]{3,8}\b/],
    ["rgb color",/\brgba?\s*\(/],
    ["hsl color",/\bhsla?\s*\(/]
  ];
  forbidden.forEach(function(rule){
    if(rule[1].test(css))errors.push(name+": css_rules forbidden "+rule[0]);
  });

  var m;
  var varRe=/var\(--([^)]+)\)/g;
  while((m=varRe.exec(css))!==null){
    if(!CSS_VAR_ALLOW[m[1]])errors.push(name+": css_rules uses non-whitelisted var(--"+m[1]+")");
  }
  if(css.indexOf("data-icon=\""+id+"\"")<0)warnings.push(name+": css_rules does not repeat data-icon id in a simple form");
}

function validateTestLines(b,errors){
  var name=blockName(b);
  var txt=textOfLines(b.test_lines);
  if(!Array.isArray(b.test_lines)||!b.test_lines.length){
    errors.push(name+": missing test_lines array");
    return;
  }
  b.test_lines.forEach(function(line,i){
    if(typeof line!=="string"){
      errors.push(name+": test_lines["+i+"] must be string");
      return;
    }
    if(!/^'.*',$/.test(line)){
      errors.push(name+": test_lines["+i+"] must be a content_test string item ending with comma");
    }
  });
  if(txt.indexOf("// Test "+b.test_id+":")<0){
    errors.push(name+": test_lines must include // Test "+b.test_id+":");
  }
  if(txt.indexOf("errors.push")<0){
    errors.push(name+": test_lines must use errors.push");
  }
  if(/\b(?:T\.)?assert\s*\(/.test(txt))errors.push(name+": test_lines must not use assert()/T.assert()");
  if(/\bexpect\s*\(/.test(txt))errors.push(name+": test_lines must not use expect()");
  if(/\btest\s*\(/.test(txt))errors.push(name+": test_lines must not use test()");
  if(/\bcontent_test\s*\(/.test(txt))errors.push(name+": test_lines must not use content_test()");
  if(/ALL\s+\d+\s+TESTS\s+PASSED/.test(txt))errors.push(name+": test_lines must not include ALL N TESTS PASSED");
}

function validateConsoleLog(b,errors){
  var name=blockName(b);
  if(!b.console_log)return;
  if(typeof b.console_log!=="string"){
    errors.push(name+": console_log must be string");
    return;
  }
  if(!/^'\s*console\.log\([^]*\);',$/.test(b.console_log)){
    errors.push(name+": console_log must be a wrapped content_test string item like '  console.log(\"...\");',");
  }
}

function validateBlock(b,errors,warnings){
  var name=blockName(b);
  if(!b||typeof b!=="object"){
    errors.push(name+": block must be an object");
    return;
  }
  if(!b.task_id)errors.push(name+": missing task_id");
  if(typeof b.test_id!=="number")errors.push(name+": missing test_id (number)");
  if(!b.type)errors.push(name+": missing type");
  if(b.type!=="evolution"&&b.type!=="relic")errors.push(name+": type must be evolution|relic (got "+b.type+")");
  if(b.type==="evolution"&&!b.pool)errors.push(name+": evolution requires pool (melee|ranged|aoe|dash|summon)");
  if(!b.entry_js||typeof b.entry_js!=="string")errors.push(name+": missing entry_js string");

  if(typeof b.entry_js==="string"){
    hasBadRuntimeSyntax(b.entry_js).forEach(function(kind){errors.push(name+": entry_js forbidden "+kind)});
  }

  validateTestLines(b,errors);
  validateConsoleLog(b,errors);

  if(b.type==="relic"){
    if(b.player_fields&&!Array.isArray(b.player_fields))errors.push(name+": player_fields must be array");
    if(b.ck_fields&&!Array.isArray(b.ck_fields))errors.push(name+": ck_fields must be array");
    if(b.css_rules&&typeof b.css_rules!=="string")errors.push(name+": css_rules must be string");
    validateCssRules(b,errors,warnings);
    if(b.player_fields&&b.player_fields.length&&(!b.ck_fields||!b.ck_fields.length)){
      errors.push(name+": relic with player_fields must include ck_fields");
    }
  }
}

function validateBlocks(blocks){
  var errors=[];
  var warnings=[];
  var taskSeen={};
  var testSeen={};
  var relicSeen={};

  blocks.forEach(function(b){
    validateBlock(b,errors,warnings);
    if(b&&b.task_id){
      if(taskSeen[b.task_id])errors.push(blockName(b)+": duplicate task_id "+b.task_id);
      taskSeen[b.task_id]=true;
    }
    if(b&&typeof b.test_id==="number"){
      if(testSeen[b.test_id])errors.push(blockName(b)+": duplicate test_id "+b.test_id);
      testSeen[b.test_id]=true;
    }
    if(b&&b.type==="relic"){
      var id=relicIdFromEntry(b.entry_js);
      if(id){
        if(relicSeen[id])errors.push(blockName(b)+": duplicate relic id in batch "+id);
        relicSeen[id]=true;
      }
    }
  });

  return {ok:errors.length===0,errors:errors,warnings:warnings};
}

module.exports={
  validateBlocks:validateBlocks,
  validateBlock:validateBlock,
  relicIdFromEntry:relicIdFromEntry
};
