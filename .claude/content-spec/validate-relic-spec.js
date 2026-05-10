// Validate a relic spec JSON file against schema v0.
// Usage:
//   node .claude/content-spec/validate-relic-spec.js path/to/relic-<id>.spec.json

var fs=require("fs");

var TRIGGERS={hitE:1,hurtP:1,pAtk:1,onEnemyKilled:1,damageEnemy:1,waveClear:1,tick:1};
var EFFECT_KINDS={splash_damage:1,heal:1,heal_overflow_route:1,shield_timer:1,dot_accum_boom:1,retaliate:1,set_buff_timer:1,fire_proj:1};
var ICONS={orb:1,slash:1,ring:1,split:1,shield:1,flame:1,drop:1,burst:1,scroll:1};
var COLORS={ink:1,accent:1,paper:1};
var PROP_TYPES={bool:1,int:1,float:1};
var TEST_INTENTS={relic_exists:1,tags_valid:1,has_fn:1,fn_sets_prop:1};
var RANGES_KEYS={weakSpread:1,fireExpand:1,fear:1,soulChain:1,burst:1,decoyAttract:1,chargeMax:1,chargeMin:1,rangedMin:1,killPulse:1,critShrapnel:1,dodgeSoulGrab:1,inkSpirit:1,spiritExplode:1,swoop:1,mimicReveal:1,buffAura:1,split:1,retaliate:1,splashBoom:1};

var path=process.argv[2];
if(!path){console.error("FAIL: missing spec path");process.exit(2)}

var raw;
try{raw=fs.readFileSync(path,"utf8")}
catch(e){console.error("FAIL: cannot read "+path+": "+e.message);process.exit(2)}

var spec;
try{spec=JSON.parse(raw)}
catch(e){console.error("FAIL: invalid JSON: "+e.message);process.exit(1)}

var errors=[];
function need(field){
  if(spec[field]==null||spec[field]==="")errors.push("missing required field: "+field);
}
function oneOf(val,set,label){
  if(!set[val])errors.push(label+" invalid: "+val);
}

need("id");need("name");need("type");need("tags");need("effect");
need("trigger");need("effect_template");need("icon");need("props");need("test_intent");

if(spec.id&&!/^[a-z][a-zA-Z0-9_]*$/.test(spec.id))errors.push("id must be camelCase: "+spec.id);

if(Array.isArray(spec.tags)){
  if(spec.tags.length<2||spec.tags.length>3)errors.push("tags length must be 2 or 3 (got "+spec.tags.length+")");
}else if(spec.tags!=null){errors.push("tags must be array")}

if(spec.trigger){
  if(spec.trigger.kind)oneOf(spec.trigger.kind,TRIGGERS,"trigger.kind");
  else errors.push("trigger.kind missing");
  if(spec.trigger.chance!=null&&(spec.trigger.chance<0||spec.trigger.chance>1))errors.push("trigger.chance out of [0,1]: "+spec.trigger.chance);
  if(spec.trigger.condition!=null&&typeof spec.trigger.condition!=="string")errors.push("trigger.condition must be string");
}

if(spec.effect_template){
  if(spec.effect_template.kind)oneOf(spec.effect_template.kind,EFFECT_KINDS,"effect_template.kind");
  else errors.push("effect_template.kind missing");
  var et=spec.effect_template;
  if(et.radius_ref&&!RANGES_KEYS[et.radius_ref])errors.push("effect_template.radius_ref not in RANGES: "+et.radius_ref);
  if(et.kind==="heal_overflow_route"){
    if(et.route!=="damage"&&et.route!=="shield")errors.push("heal_overflow_route.route must be damage or shield");
    if(typeof et.multiplier!=="number")errors.push("heal_overflow_route.multiplier must be number");
  }
  if(et.kind==="dot_accum_boom"){
    if(typeof et.threshold!=="number"||et.threshold<=0)errors.push("dot_accum_boom.threshold must be positive number");
    if(!Array.isArray(et.sources)||!et.sources.length)errors.push("dot_accum_boom.sources must be non-empty array");
    if(!et.enemy_flag||!/^_[A-Za-z0-9_]+$/.test(et.enemy_flag))errors.push("dot_accum_boom.enemy_flag must start with underscore");
  }
  if(et.kind==="shield_timer"){
    if(typeof et.ticks_default!=="number")errors.push("shield_timer.ticks_default must be number");
    if(!et.tick_field)errors.push("shield_timer.tick_field missing");
  }
  if(et.kind==="set_buff_timer"){
    if(!et.field)errors.push("set_buff_timer.field missing");
    if(typeof et.ticks!=="number")errors.push("set_buff_timer.ticks must be number");
  }
}

if(spec.icon){
  if(spec.icon.template)oneOf(spec.icon.template,ICONS,"icon.template");
  else errors.push("icon.template missing");
  if(spec.icon.primary)oneOf(spec.icon.primary,COLORS,"icon.primary");
  else errors.push("icon.primary missing");
  if(spec.icon.secondary)oneOf(spec.icon.secondary,COLORS,"icon.secondary");
  else errors.push("icon.secondary missing");
}

if(Array.isArray(spec.props)){
  if(!spec.props.length)errors.push("props must have at least 1 entry");
  spec.props.forEach(function(pp,i){
    if(!pp.name||!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(pp.name||""))errors.push("props["+i+"].name invalid: "+pp.name);
    if(!pp.type||!PROP_TYPES[pp.type])errors.push("props["+i+"].type must be bool/int/float (got "+pp.type+")");
    if(pp["default"]==null)errors.push("props["+i+"].default missing");
  });
}else if(spec.props!=null){errors.push("props must be array")}

if(Array.isArray(spec.test_intent)){
  spec.test_intent.forEach(function(t,i){
    var key=typeof t==="string"?t:(t&&t.kind);
    if(!TEST_INTENTS[key])errors.push("test_intent["+i+"] invalid: "+key);
  });
}else if(spec.test_intent!=null){errors.push("test_intent must be array")}

if(errors.length){
  console.log("FAIL ("+errors.length+"):");
  errors.forEach(function(e){console.log("  - "+e)});
  process.exit(1);
}
console.log("PASS: relic spec is valid (id="+spec.id+")");
