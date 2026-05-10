// worktree-manager.js — add-content 并发任务的 git worktree 辅助工具
//
// 用法：
//   node .claude/worktree-manager.js create <task-id>
//     在 .claude/worktrees/<task-id>/ 创建 worktree，分支 tmp/add-content/<task-id>
//
//   node .claude/worktree-manager.js finish <task-id> [--apply|--abort]
//     --apply: 从 worktree diff 主分支，输出 patch 到 .claude/patches/<task-id>.patch
//     --abort: 直接丢弃 worktree（不管是否有改动）
//     默认: 如果有未提交改动，产出 patch 并保留 worktree 等主 Claude 决定
//
//   node .claude/worktree-manager.js cleanup
//     删除所有 .claude/worktrees/ 下的 worktree 并 prune
//
//   node .claude/worktree-manager.js list
//     列出当前所有 add-content worktree

var fs=require("fs");
var path=require("path");
var child=require("child_process");

var ROOT=process.cwd();
var WORKTREE_DIR=path.join(ROOT,".claude","worktrees");
var PATCH_DIR=path.join(ROOT,".claude","patches");
var BRANCH_PREFIX="tmp/add-content/";

function run(cmd,opts){
  try{return child.execSync(cmd,Object.assign({cwd:ROOT,stdio:"pipe"},opts||{})).toString().trim()}
  catch(e){
    var msg=e.stderr?e.stderr.toString():e.message;
    throw new Error("CMD FAILED: "+cmd+"\n"+msg);
  }
}

function ensureDir(p){if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true})}

function validTaskId(id){return /^[a-z0-9][a-z0-9_-]{0,30}$/.test(id)}

function worktreePath(id){return path.join(WORKTREE_DIR,id)}
function branchName(id){return BRANCH_PREFIX+id}

function cmdCreate(id){
  if(!validTaskId(id))throw new Error("invalid task-id (need [a-z0-9_-], 1-31 chars): "+id);
  ensureDir(WORKTREE_DIR);
  var wt=worktreePath(id);
  if(fs.existsSync(wt))throw new Error("worktree already exists: "+wt);
  var base=run("git rev-parse --abbrev-ref HEAD");
  run('git worktree add "'+wt+'" -b '+branchName(id));
  console.log("CREATE "+id+" -> "+wt+" (from "+base+")");
  console.log("  cd \""+wt+"\" to work; run finish when done.");
}

function gitInWorktree(id,cmd){
  return run(cmd,{cwd:worktreePath(id)});
}

function cmdFinish(id,mode){
  if(!validTaskId(id))throw new Error("invalid task-id: "+id);
  var wt=worktreePath(id);
  if(!fs.existsSync(wt))throw new Error("worktree not found: "+wt);
  ensureDir(PATCH_DIR);

  if(mode==="abort"){
    removeWorktree(id);
    console.log("ABORT "+id);
    return;
  }

  var status=gitInWorktree(id,"git status --porcelain");
  if(!status){
    console.log("CLEAN "+id+": no changes in worktree");
    if(mode==="apply")removeWorktree(id);
    return;
  }

  var patch=gitInWorktree(id,"git add -A && git diff --cached");
  if(patch&&!patch.endsWith("\n"))patch+="\n";
  var patchFile=path.join(PATCH_DIR,id+".patch");
  fs.writeFileSync(patchFile,patch);
  console.log("PATCH "+id+" -> "+patchFile+" ("+patch.split(/\r?\n/).length+" lines)");

  if(mode==="apply"){
    run('git apply --index "'+patchFile+'"');
    console.log("APPLY "+id+" -> main index");
    removeWorktree(id);
  } else {
    console.log("  patch ready at "+patchFile+"; run again with --apply to merge, --abort to discard");
  }
}

function removeWorktree(id){
  var wt=worktreePath(id);
  try{run('git worktree remove --force "'+wt+'"')}catch(_e){}
  try{if(fs.existsSync(wt))fs.rmSync(wt,{recursive:true,force:true})}catch(_e){}
  try{run("git branch -D "+branchName(id))}catch(_e){}
  try{run("git worktree prune")}catch(_e){}
}

function cmdCleanup(){
  if(!fs.existsSync(WORKTREE_DIR)){console.log("CLEANUP: no worktrees");return}
  var entries=fs.readdirSync(WORKTREE_DIR);
  entries.forEach(function(id){
    if(fs.statSync(path.join(WORKTREE_DIR,id)).isDirectory()){
      console.log("CLEANUP "+id);
      removeWorktree(id);
    }
  });
  try{fs.rmdirSync(WORKTREE_DIR)}catch(_e){}
  run("git worktree prune");
}

function cmdList(){
  var out=run("git worktree list --porcelain");
  var blocks=out.split(/\n\n/);
  blocks.forEach(function(b){
    if(b.indexOf(BRANCH_PREFIX)>=0||b.indexOf(WORKTREE_DIR.replace(/\\/g,"/"))>=0){
      console.log(b);
      console.log("---");
    }
  });
}

var args=process.argv.slice(2);
var sub=args[0];
try{
  if(sub==="create")cmdCreate(args[1]);
  else if(sub==="finish"){
    var mode=null;
    if(args.indexOf("--apply")>=0)mode="apply";
    else if(args.indexOf("--abort")>=0)mode="abort";
    cmdFinish(args[1],mode);
  }
  else if(sub==="cleanup")cmdCleanup();
  else if(sub==="list")cmdList();
  else{
    console.error("usage:");
    console.error("  create <task-id>");
    console.error("  finish <task-id> [--apply|--abort]");
    console.error("  cleanup");
    console.error("  list");
    process.exit(2);
  }
}catch(e){
  console.error("FAIL: "+e.message);
  process.exit(1);
}
