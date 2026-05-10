// .claude/sequencer.js — 内容开发序列资源的唯一发号器
//
// 用法：
//   node .claude/sequencer.js reserve <type> <count> [--task-id-prefix=<prefix>]
//     type: relic | evolution | enemy | achievement | curse | generic
//     count: 要分配的数量
//     返回 JSON 到 stdout，包含 test_ids / task_ids / lease_files
//
//   node .claude/sequencer.js release <task-id>
//     释放一个 lease（任务失败或取消时调用）
//
//   node .claude/sequencer.js list
//     列出所有活跃 lease
//
//   node .claude/sequencer.js commit <task-id>
//     标记 lease 已实际入库（主 Claude 合并完成后调用），lease 移到 committed.json
//
// 状态文件：
//   .claude/state/sequencer.json          active leases + next test id
//   .claude/state/sequencer.committed.json 已提交的历史记录（审计用）
//   .claude/tmp/leases/<task-id>.json      单 lease 详情（agent 可直接读）

var fs=require("fs");
var path=require("path");

var ROOT=process.cwd();
var STATE_DIR=path.join(ROOT,".claude","state");
var STATE_FILE=path.join(STATE_DIR,"sequencer.json");
var COMMITTED_FILE=path.join(STATE_DIR,"sequencer.committed.json");
var LEASE_DIR=path.join(ROOT,".claude","tmp","leases");

var VALID_TYPES={relic:1,evolution:1,enemy:1,achievement:1,curse:1,generic:1};

function ensureDir(p){if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true})}

function loadState(){
  ensureDir(STATE_DIR);
  if(!fs.existsSync(STATE_FILE)){
    var initial={next_test_id:null,active_leases:{}};
    return initial;
  }
  return JSON.parse(fs.readFileSync(STATE_FILE,"utf8"));
}

function saveState(s){
  ensureDir(STATE_DIR);
  fs.writeFileSync(STATE_FILE,JSON.stringify(s,null,2)+"\n");
}

function loadCommitted(){
  if(!fs.existsSync(COMMITTED_FILE))return {committed:[]};
  return JSON.parse(fs.readFileSync(COMMITTED_FILE,"utf8"));
}

function saveCommitted(c){
  ensureDir(STATE_DIR);
  fs.writeFileSync(COMMITTED_FILE,JSON.stringify(c,null,2)+"\n");
}

function scanCurrentMaxTestId(){
  var fn=path.join(ROOT,"content_test.js");
  if(!fs.existsSync(fn))return 0;
  var txt=fs.readFileSync(fn,"utf8");
  var re=/\/\/\s*Test\s+(\d+):/g,m,max=0;
  while((m=re.exec(txt))!==null){var n=parseInt(m[1],10);if(n>max)max=n}
  return max;
}

function initNextIfNeeded(state){
  if(state.next_test_id!=null)return;
  var max=scanCurrentMaxTestId();
  // 也要考虑已 reserve 但未 commit 的 ID
  var leases=state.active_leases||{};
  Object.keys(leases).forEach(function(id){
    (leases[id].test_ids||[]).forEach(function(n){if(n>max)max=n});
  });
  state.next_test_id=max+1;
}

function genTaskId(type,prefix){
  var ts=Date.now().toString(36).slice(-6);
  var rnd=Math.floor(Math.random()*10000).toString(36);
  var base=(prefix||type).replace(/[^a-z0-9_-]/gi,"").slice(0,16);
  return base+"-"+ts+rnd;
}

function cmdReserve(type,countStr,args){
  if(!VALID_TYPES[type]){
    console.error("FAIL: invalid type. use: "+Object.keys(VALID_TYPES).join("|"));
    process.exit(2);
  }
  var count=parseInt(countStr,10);
  if(!count||count<1||count>20){
    console.error("FAIL: count must be 1-20");
    process.exit(2);
  }
  var prefix=null;
  for(var i=0;i<args.length;i++){
    if(args[i].indexOf("--task-id-prefix=")===0)prefix=args[i].slice(17);
  }

  var state=loadState();
  initNextIfNeeded(state);

  var result={count:count,type:type,items:[]};
  ensureDir(LEASE_DIR);

  for(var k=0;k<count;k++){
    var testId=state.next_test_id++;
    var taskId=genTaskId(type,prefix);
    var lease={
      task_id:taskId,
      type:type,
      test_ids:[testId],
      reserved_at:new Date().toISOString(),
      status:"active"
    };
    state.active_leases[taskId]=lease;
    var leaseFile=path.join(LEASE_DIR,taskId+".json");
    fs.writeFileSync(leaseFile,JSON.stringify(lease,null,2)+"\n");
    result.items.push({
      task_id:taskId,
      test_id:testId,
      lease_file:leaseFile
    });
  }

  saveState(state);
  console.log(JSON.stringify(result,null,2));
}

function cmdRelease(taskId){
  if(!taskId){console.error("FAIL: missing task-id");process.exit(2)}
  var state=loadState();
  if(!state.active_leases[taskId]){
    console.error("WARN: lease "+taskId+" not in active_leases");
    process.exit(0);
  }
  delete state.active_leases[taskId];
  saveState(state);
  var leaseFile=path.join(LEASE_DIR,taskId+".json");
  try{if(fs.existsSync(leaseFile))fs.unlinkSync(leaseFile)}catch(_e){}
  console.log("RELEASE "+taskId);
}

function cmdCommit(taskId){
  if(!taskId){console.error("FAIL: missing task-id");process.exit(2)}
  var state=loadState();
  var lease=state.active_leases[taskId];
  if(!lease){
    console.error("FAIL: lease "+taskId+" not active");
    process.exit(1);
  }
  lease.committed_at=new Date().toISOString();
  lease.status="committed";
  var committed=loadCommitted();
  committed.committed.push(lease);
  saveCommitted(committed);
  delete state.active_leases[taskId];
  saveState(state);
  var leaseFile=path.join(LEASE_DIR,taskId+".json");
  try{if(fs.existsSync(leaseFile))fs.unlinkSync(leaseFile)}catch(_e){}
  console.log("COMMIT "+taskId+" test_ids="+(lease.test_ids||[]).join(","));
}

function cmdList(){
  var state=loadState();
  var leases=state.active_leases||{};
  var ids=Object.keys(leases);
  if(!ids.length){console.log("no active leases");return}
  console.log("ACTIVE ("+ids.length+"):");
  ids.forEach(function(id){
    var l=leases[id];
    console.log("  "+id+"  type="+l.type+"  test_ids=["+(l.test_ids||[]).join(",")+"]  reserved_at="+l.reserved_at);
  });
  console.log("next_test_id="+state.next_test_id);
}

var args=process.argv.slice(2);
var sub=args[0];
try{
  if(sub==="reserve")cmdReserve(args[1],args[2],args.slice(3));
  else if(sub==="release")cmdRelease(args[1]);
  else if(sub==="commit")cmdCommit(args[1]);
  else if(sub==="list")cmdList();
  else{
    console.error("usage:");
    console.error("  reserve <type> <count> [--task-id-prefix=<prefix>]");
    console.error("  release <task-id>");
    console.error("  commit <task-id>");
    console.error("  list");
    process.exit(2);
  }
}catch(e){
  console.error("FAIL: "+e.message);
  process.exit(1);
}
