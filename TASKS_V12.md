# 墨祟：走阴录 — v12.0 任务包

> 历史归档：此文件记录 v12.0 时期任务，不作为当前 v13.1 开发来源。当前路线看 `ROADMAP.md`，当前规范看 `STRUCTURE_RULES.md`。

> 给实现者的任务清单。按顺序执行。每个任务独立可验证。

## 公共信息

**项目路径**: `C:\Users\金许诺\Documents\Codex\2026-04-24\new-chat-2`
**当前版本**: v11.1
**game.js**: 5433行 / 8000上限（**余67行**）
**测试命令**:
- `node --check game.js` — 语法检查（必须通过）
- `node smoke_test.js` — 44项冒烟（必须全绿）
- `node content_test.js` — 236项内容（必须全绿）
- `npm run www` — 同步www/
- git push 需设代理: `http.proxy 127.0.0.1:7897`

**代码规范**:
- game.js用CRLF换行
- 无框架、无多余注释、紧凑单行风格
- 不改hitE/hurtP/spawnWave核心结构
- game.js ≤ 8000行
- git提交用wscytz身份，不附AI署名
- 不加emoji（除非明确要求）
- 不加注释（除非WHY非常不显然）

**已有helper**:
- `localDay()` — 返回本地日期YYYY-MM-DD（不要用toISOString）
- `rn(a,b)` / `ri(a,b)` / `pick(arr)` / `shuf(arr)`
- `spawnP(g,x,y,type,n)` / `spawnInk(g,x,y,n,col)`
- `pushLimited(list,item,max)` / `LIMITS.particles` 等
- `perfMul(g)` / `g._pm` — 性能乘数，特效检查 `g._pm>=0.5`
- `calcScore(g)` — 返回数值分数（calcGrade内部调用它）
- `snd(name)` — 播放音效

**颜色常量** (gamedata.js `var C={...}`):
- `C.ink` #171310, `C.accent` #a33a2d, `C.moss` #4d6156
- `C.ivory` 象牙白, `C.ghost` rgba(220,210,190,0.7), `C.gold` 金色
- `C.spirit` rgba(100,140,120,0.8), `C.fire` 火焰色, `C.soft` #2c2520

---

## 任务1: 首局教学引导

### 目标
首次进入游戏（localStorage无mosui_meta）时，显示操作提示overlay，几秒后自动消失。

### 行数预算: ~30行 game.js + ~15行 game.html

### 实现方案

1. **game.html**: 在游戏区添加教学overlay
```html
<div id="tutorialOverlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;background:rgba(23,19,16,0.85);color:#f1e6d4;font-size:1.1rem;display:flex;align-items:center;justify-content:center">
  <div style="text-align:center;max-width:500px;padding:40px">
    <h3 style="color:var(--accent);margin-bottom:20px">操作指引</h3>
    <p>WASD 移动 · 鼠标瞄准攻击</p>
    <p>空格/Shift 闪避 · P 暂停</p>
    <p style="margin-top:16px;font-size:0.88rem;color:var(--ash)">点击任意处开始</p>
  </div>
</div>
```

2. **game.js init()**: 在DOM ready后检查是否首次
```javascript
// 在init()的DOMContentLoaded回调里
var _meta=null;try{_meta=JSON.parse(localStorage.getItem("mosui_meta"))}catch(e){}
if(!_meta){
  var _tut=document.getElementById("tutorialOverlay");
  if(_tut){_tut.style.display="flex";
    _tut.addEventListener("click",function(){_tut.style.display="none"});
    _tut.addEventListener("touchstart",function(){_tut.style.display="none"})}
}
```

### 验证
- 清除localStorage后刷新，看到教学overlay
- 点击后overlay消失，游戏正常开始
- 第二局开始不再显示（meta已写入）
- smoke 44 + content 236 全绿

---

## 任务2: 代码去重（纯重构，不改功能）

### 目标
消除code review发现的重复代码，提高可维护性。不新增功能。

### 行数预算: 0或负（减少行数）

### 具体改动

#### 2a. 提取DIFF_LABELS常量
在game.js顶部（DIFF定义附近）添加：
```javascript
var DIFF_LABELS={normal:"平常",hard:"险途",nightmare:"噩梦",purgatory:"炼狱"};
var DIFF_SHORT={normal:"平",hard:"险",nightmare:"噩",purgatory:"炼"};
```
替换showEnd和showLeaderboard里的内联diffMap（4处）。

#### 2b. 用gradePriority替换_gRank
showEnd里排行榜排序用的 `_gRank` 替换为已有的 `gradePriority` function（搜索 `function gradePriority`）。
```javascript
// 替换
var _gRank={"S":5,"甲":4,"乙":3,"丙":2,"丁":1};
_lb.sort(function(a,b){var r=(_gRank[b.grade]||0)-(_gRank[a.grade]||0);...});
// 为
_lb.sort(function(a,b){var r=gradePriority(b)-gradePriority(a);...});
```
注意：gradePriority接受的是grade对象，可能需要适配。先grep确认gradePriority的签名。

#### 2c. 提取localStorage capped-list helper
```javascript
function pushLSCapped(key,rec,max,sortFn){
  var arr=[];try{arr=JSON.parse(localStorage.getItem(key)||"[]")}catch(e){}
  arr.push(rec);if(sortFn)arr.sort(sortFn);
  if(arr.length>max)arr=arr.slice(-max);
  try{localStorage.setItem(key,JSON.stringify(arr))}catch(e){}
}
```
替换showEnd里3处重复的localStorage读写（history cap 5, leaderboard cap 20, endless cap 20）。

#### 2d. 提取formatMmSs helper
```javascript
function fmtMmSs(sec){var m=Math.floor(sec/60),s=sec%60;return(m<10?"0":"")+m+":"+(s<10?"0":"")+s}
```
替换showEnd和showLeaderboard里3处重复的mm:ss格式化。

### 验证
- 功能完全不变（纯重构）
- smoke 44 + content 236 全绿
- game.js行数减少（目标：减30-50行）

---

## 任务3: 关卡调制器扩展（仅gamedata.js）

### 目标
将已有的 `guishi`(鬼市) 和 `mirror`(镜殿) 加入无尽波和Boss波的随机池。

### 行数预算: 0行game.js，~5行gamedata.js

### 实现方案
无需改gamedata.js的STAGE_MODS定义（已经存在）。只需确认无尽波和Boss波的mod随机池包含这两个：

在game.js中搜索无尽波的mod池：
```javascript
mod:pick(["ash","well","lantern","mask","inkpool","inktide"])
```
改为：
```javascript
mod:pick(["ash","well","lantern","mask","inkpool","inktide","guishi","mirror"])
```

Boss波的mod池也同理搜索并加入。

### 验证
- 无尽波和Boss波可能出现鬼市/镜殿
- smoke 44 + content 236 全绿

---

## 任务4: 移动端适配验证

### 目标
确认移动端横屏体验正常。

### 行数预算: 验证任务，预计0-10行修复

### 检查清单
1. 打开game.html，用Chrome DevTools切到移动端模式（iPhone/Android横屏）
2. 验证虚拟摇杆显示和响应
3. 验证每日种子checkbox和无尽checkbox在移动端可见
4. 验证排行榜面板在窄屏下不溢出
5. 验证结算截图按钮在移动端可点击
6. 如有问题，记录并修复

### 验证
- 移动端全流程可玩
- 无布局溢出或遮挡

---

## 任务5: www/同步 + APK准备

### 目标
确保构建产物完整同步，准备APK打包。

### 步骤
1. `npm run www` — 同步代码文件
2. 手动同步assets/目录到www/assets/（音乐、图标、肖像）
3. `npm run cap:sync` — 同步到android/
4. 用Android Studio打开android/项目
5. Build → Generate Signed Bundle/APK
6. 在真机或模拟器测试

### 验证
- APK安装运行无崩溃
- 音效、音乐正常
- 虚拟摇杆正常

---

## 优先级顺序

| 顺序 | 任务 | 类型 | 难度 |
|------|------|------|------|
| 1 | T2 代码去重 | 重构 | 低 |
| 2 | T1 首局教学 | 新功能 | 低 |
| 3 | T3 调制器池扩展 | 微调 | 低 |
| 4 | T4 移动端验证 | 验证 | 中 |
| 5 | T5 APK打包 | 构建 | 中 |

先做T2（去重释放行数），再做T1（教学），最后T3-T5。

---

## 不做的事（留到v13.0+）

- 第6武器 / 第4Boss（需要game.js模块拆分释放空间）
- 新关卡调制器（需要新effect逻辑，game.js空间不足）
- 多人模式 / Mod支持（远期目标）
