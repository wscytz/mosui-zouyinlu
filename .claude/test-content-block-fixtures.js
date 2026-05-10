// Fixture tests for Scheme B content block validation.

var fs=require("fs");
var path=require("path");
var rules=require("./content-block-rules.js");

var ROOT=process.cwd();
var FIXTURE_DIR=path.join(ROOT,".claude","fixtures","content-blocks");

function readJson(p){
  return JSON.parse(fs.readFileSync(p,"utf8"));
}

function listJsonFiles(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir).filter(function(f){return /\.json$/.test(f)}).sort().map(function(f){return path.join(dir,f)});
}

function normalizeFixture(j){
  if(Array.isArray(j))return {blocks:j,expect_error:null};
  if(j.blocks)return {blocks:j.blocks,expect_error:j.expect_error||null};
  if(j.block)return {blocks:[j.block],expect_error:j.expect_error||null};
  return {blocks:[j],expect_error:j.expect_error||null};
}

function label(p){
  return path.relative(ROOT,p).replace(/\\/g,"/");
}

function runGood(files,errors){
  files.forEach(function(p){
    var fx=normalizeFixture(readJson(p));
    fx.blocks.forEach(function(b){b._file=label(p)});
    var r=rules.validateBlocks(fx.blocks);
    if(!r.ok){
      errors.push(label(p)+" should pass, got: "+r.errors.join(" | "));
    }else{
      console.log("PASS good: "+label(p));
    }
  });
}

function runBad(files,errors){
  files.forEach(function(p){
    var fx=normalizeFixture(readJson(p));
    fx.blocks.forEach(function(b){b._file=label(p)});
    var r=rules.validateBlocks(fx.blocks);
    var joined=r.errors.join(" | ");
    if(r.ok){
      errors.push(label(p)+" should fail, but passed");
      return;
    }
    if(fx.expect_error&&joined.indexOf(fx.expect_error)<0){
      errors.push(label(p)+" failed for wrong reason. expected contains ["+fx.expect_error+"], got: "+joined);
      return;
    }
    console.log("PASS bad: "+label(p));
  });
}

var good=listJsonFiles(path.join(FIXTURE_DIR,"good"));
var bad=listJsonFiles(path.join(FIXTURE_DIR,"bad"));

// Backward compatibility with the first hand-written fixture.
var legacy=listJsonFiles(FIXTURE_DIR).filter(function(p){return /good/i.test(path.basename(p))});
good=good.concat(legacy);

var errors=[];
if(!good.length)errors.push("no good fixtures under "+path.join(FIXTURE_DIR,"good"));
if(!bad.length)errors.push("no bad fixtures under "+path.join(FIXTURE_DIR,"bad"));

runGood(good,errors);
runBad(bad,errors);

if(errors.length){
  console.error("FAIL content block fixtures ("+errors.length+"):");
  errors.forEach(function(e){console.error("  - "+e)});
  process.exit(1);
}

console.log("OK content block fixtures: good="+good.length+" bad="+bad.length);
