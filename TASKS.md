# 墨祟：走阴录 — v10.0 任务包

> 给OpenCode的实现任务。每个任务独立，按顺序执行。

## 公共信息

**项目路径**: `C:\Users\金许诺\Documents\Codex\2026-04-24\new-chat-2`
**测试命令**:
- `node --check game.js` — 语法检查（必须通过）
- `node smoke_test.js` — 44项冒烟测试（必须全绿）
- `node content_test.js` — 236项内容测试（必须全绿）
- `npm run www` — 同步到www/
- `npm run cap:sync` — 同步到android/

**代码规范**:
- game.js使用CRLF换行
- 无框架、无多余注释、紧凑单行风格
- 不改hitE/hurtP/spawnWave核心结构
- game.js ≤ 5500行（当前5238行，余262行空间）

**颜色常量** (gamedata.js `var C={...}`):
- `C.ink` #171310（墨黑）, `C.accent` #a33a2d（朱红）, `C.moss` #4d6156（苔绿）
- `C.ivory` 象牙白, `C.ghost` rgba(220,210,190,0.7), `C.gold` 金色
- `C.spirit` rgba(100,140,120,0.8), `C.fire` 火焰色, `C.soft` #2c2520

**关键函数**:
- `spawnP(g,x,y,type,n)` — 生成粒子，type可以是 "ink","accent","moss","boss","soul","fire","frost","ghost","spirit","ash"
- `spawnInk(g,x,y,n,col)` — 生成墨迹粒子
- `pushLimited(list,item,max)` — 带上限的push
- `perfMul(g)` 返回性能乘数(0.25-1.0)，渲染效果应检查 `g._pm>=0.45` 才显示高级效果

---

## 任务1: 结算截图生成

### 目标
在结算页添加"截图"按钮，点击后将结算信息导出为PNG图片并自动下载。

### 实现位置
- **game.html**: 结算页DOM区（搜索 `result` 或 `end-` 相关的div），添加按钮
- **game.css**: 按钮样式
- **game.js**: 结算页逻辑区（搜索 `calcGrade` 或 `gameOver` 或 `state==="ended"`）

### 实现方案

1. 在game.html结算页区域添加按钮元素：
```html
<button id="screenshotBtn" class="btn-secondary" style="display:none">截图保存</button>
```

2. 在game.js的结算显示逻辑中，显示这个按钮（搜索结算页show的地方）

3. 点击按钮时的逻辑：
```javascript
// 创建离屏canvas
var offscreen = document.createElement('canvas');
offscreen.width = 960;
offscreen.height = 640;
var oc = offscreen.getContext('2d');

// 绘制背景（纸张色）
oc.fillStyle = '#f1e6d4';
oc.fillRect(0, 0, 960, 640);

// 绘制结算信息
oc.fillStyle = '#171310';
oc.font = 'bold 36px serif';
oc.textAlign = 'center';
oc.fillText('墨祟：走阴录', 480, 60);

oc.font = 'bold 48px serif';
// 评级（从calcGrade获取）
oc.fillText(评级字母, 480, 140);

// 绘制统计信息
oc.font = '18px serif';
oc.textAlign = 'left';
oc.fillText('武器: ' + g.weapon.name, 200, 200);
oc.fillText('击杀: ' + g.kills, 200, 230);
oc.fillText('波次: ' + g.wave, 200, 260);
oc.fillText('遗物: ' + g.relics.length + '件', 200, 290);
// ... 更多统计

// 触发下载
var link = document.createElement('a');
link.download = 'mosui-' + Date.now() + '.png';
link.href = offscreen.toDataURL('image/png');
link.click();
```

### 验证
- 按钮在结算页可见
- 点击后浏览器下载PNG文件
- PNG包含评级、武器、击杀、遗物等关键信息
- 不影响游戏其他功能

---

## 任务2: 粒子效果升级

### 目标
增强暴击、Boss击杀、连杀里程碑的粒子表现。

### 实现位置
game.js，粒子渲染区（搜索 `particles.forEach` 在render函数中）

### 具体改动

#### 2a. 暴击粒子增强
在暴击处理处（搜索 `atk.crit){g.critFlash=18;g.critKills`）：
- 暴击时 `spawnP(g,e.x,e.y,"accent",12)` → 改为更大的爆发
- 添加：`spawnInk(g,e.x,e.y,8,"accent")` 墨迹飞溅
- 添加金色粒子：`pushLimited(g.particles,{x:e.x,y:e.y,vx:rn(-4,4),vy:rn(-4,4),life:25,maxLife:25,size:rn(3,7),type:"gold"},LIMITS.particles)`
  - 注意：需要在粒子渲染中支持 "gold" 类型（用 `C.gold` 颜色填充）

#### 2b. Boss击杀粒子
在Boss击杀处（搜索 `e.isBoss&&e.hp<=0` 或 `snd("bossDeath")`）：
- 大范围墨水爆炸：`spawnInk(g,e.x,e.y,20,"ink")`
- 冲击波环：生成8个方向的大型粒子
```javascript
if(e.isBoss){for(var bi=0;bi<16;bi++){var ba2=bi*Math.PI*2/16;
  pushLimited(g.particles,{x:e.x,y:e.y,vx:Math.cos(ba2)*5,vy:Math.sin(ba2)*5,
    life:35,maxLife:35,size:rn(5,10),type:"accent"},LIMITS.particles)}
  spawnInk(g,e.x,e.y,15,"accent")}
```

#### 2c. 连杀里程碑粒子
在连杀里程碑触发处（搜索 `KILL_MILESTONES`）：
- 已有 `spawnP(g,p.x,p.y,"accent",milestone.particles||4)`
- 添加冲击波环：milestone触发时生成环形粒子
```javascript
for(var mi=0;mi<8;mi++){var ma=mi*Math.PI/4;
  pushLimited(g.particles,{x:p.x,y:p.y,vx:Math.cos(ma)*3,vy:Math.sin(ma)*3,
    life:20,maxLife:20,size:rn(3,6),type:"accent"},LIMITS.particles)}
```

### 粒子渲染支持 "gold" 类型
在粒子渲染的 `type` 判断中添加 gold：
搜索粒子渲染区域（`particles.forEach`），在颜色映射处添加：
```javascript
var pCol=pt==="gold"?C.gold:pt==="accent"?C.accent:...（现有逻辑）
```

### 验证
- 暴击时明显更华丽的粒子效果
- Boss死亡时有大范围墨水爆炸
- 连杀里程碑有环形冲击波
- 性能模式下（_pm<0.45）粒子数量自动减少

---

## 任务3: 武器攻击视觉差异化

### 目标
让5把武器的攻击在视觉上有明确辨识度。

### 当前攻击渲染位置
game.js render函数中（搜索 `atk.type==="proj"` 的渲染部分，约line 2710-2754）

### 当前视觉
- **slash**: 弧线+白色内弧+墨点（已有辨识度 ✓）
- **proj**: 月牙形弹道+3帧拖尾（已有辨识度 ✓）
- **ring**: 同心涟漪环+外环（已有辨识度 ✓）
- **spirit**: 幽灵圆+白色核心（已有辨识度 ✓）
- **dashSlash**: 伞骨放射线（已有辨识度 ✓）

### 增强方案（在每个攻击类型的渲染分支末尾添加）

#### 斩妖剑（melee slash）— 添加墨痕拖尾
在 slash 渲染（约line 2695-2709）的 `c.restore()` 前添加：
```javascript
// ink drip trail
if(g._pm>=0.5){c.globalAlpha=0.25*(1-prog);c.strokeStyle=C.ink;c.lineWidth=2;
  var dripCount=3;
  for(var di2=0;di2<dripCount;di2++){
    var da2=-atk.arc/2+atk.arc*(di2+0.5)/dripCount;
    var dd2=sR+rn(-8,4);
    c.beginPath();c.moveTo(Math.cos(da2)*sR,Math.sin(da2)*sR);
    c.lineTo(Math.cos(da2)*dd2,Math.sin(da2)*dd2);c.stroke()}}
```

#### 符骨笔（ranged proj）— 添加墨点轨迹
在 proj 渲染（约line 2710-2729）的 `c.globalAlpha=1` 前添加：
```javascript
// ink trail dots behind projectile
if(g._pm>=0.5){c.globalAlpha=0.3;c.fillStyle=C.ink;
  c.beginPath();c.arc(atk.x-atk.vx*3+rn(-2,2),atk.y-atk.vy*3+rn(-2,2),rn(1,2),0,Math.PI*2);c.fill()}
```

#### 镇魂铃（aoe ring）— 声波脉动纹
在 ring 渲染（约line 2730-2744）的 `c.globalAlpha=1` 前添加：
```javascript
// pulse wave marks
if(g._pm>=0.5&&r>20){c.globalAlpha=0.15*(1-prog);c.strokeStyle=C.ivory;c.lineWidth=1;
  var pulseCount=Math.floor(r/30);
  for(var pi=0;pi<pulseCount;pi++){var pr2=r*(0.5+pi*0.15);
    c.beginPath();c.arc(atk.x,atk.y,pr2,0,Math.PI*2);c.stroke()}}
```

#### 伏魔伞（dash slash）— 墨迹路径
在 dashSlash 渲染（约line 2680-2694）的 `c.restore()` 前添加：
```javascript
// ink splash at arc edges
if(g._pm>=0.5){c.globalAlpha=0.3*(1-prog);c.fillStyle=C.ink;
  c.beginPath();c.arc(Math.cos(-atk.arc/2)*dR,Math.sin(-atk.arc/2)*dR,rn(3,5),0,Math.PI*2);c.fill();
  c.beginPath();c.arc(Math.cos(atk.arc/2)*dR,Math.sin(atk.arc/2)*dR,rn(3,5),0,Math.PI*2);c.fill()}
```

#### 召魂幡（summon spirit）— 光晕增强
在 spirit 渲染（约line 2745-2753）的 `c.globalAlpha=1` 前添加：
```javascript
// spirit glow ring
if(g._pm>=0.5){c.globalAlpha=0.15;c.strokeStyle=C.spirit;c.lineWidth=1;
  c.beginPath();c.arc(atk.x,atk.y,spR*2,0,Math.PI*2);c.stroke()}
```

### 验证
- 每把武器的攻击效果有明显视觉差异
- 高性能下（_pm>=0.5）才显示额外效果
- 低性能下自动降级不影响可玩性

---

## 任务4: 战斗回放数据

### 目标
localStorage存储最近5局简要数据，结算页可查看历史。

### 实现位置
- **game.js**: 结算逻辑区（搜索 `state="ended"` 或 `calcGrade`）
- **game.html**: 结算页DOM，添加历史记录区域

### 数据结构
```javascript
// localStorage key: "mosui_history"
// 值是JSON数组，最多5条
[
  {
    ts: Date.now(),           // 时间戳
    weapon: "melee",          // 武器类型
    weaponName: "斩妖剑",     // 武器名
    grade: "S",               // 评级
    kills: 42,                // 击杀数
    wave: 9,                  // 到达波次
    relics: 6,                // 遗物数
    time: 320,                // 游戏时长(秒)
    boss: true                // 是否击杀Boss
  }
]
```

### 实现逻辑

1. 结算时（搜索 `state="ended"` 的设置处），构造记录对象
2. 读取localStorage中的 `mosui_history`，解析JSON数组（不存在则为[]）
3. push新记录
4. 如果超过5条，shift最旧的
5. 写回localStorage
6. 结算页显示最近5局简要列表

### 结算页显示
在结算页DOM中添加 `<div id="historyPanel">` ，在结算显示时填充：
```javascript
var hist = JSON.parse(localStorage.getItem('mosui_history') || '[]');
// 渲染为简洁列表
```

### 验证
- 打完一局后localStorage有数据
- 结算页显示历史记录
- 超过5局时旧的被清除
- 不影响游戏性能

---

## 任务5: 本地排行榜

### 目标
按评级排序的本地排行榜，显示在结算页或独立面板。

### 实现位置
- **game.js**: 结算逻辑区
- **game.html**: 添加排行榜面板DOM
- **game.css**: 面板样式

### 数据结构
```javascript
// localStorage key: "mosui_leaderboard"
[
  {weapon:"斩妖剑",grade:"S",kills:45,wave:9,date:"2026-06-01",score:4200},
  // ...最多20条
]
```

### 排序规则
S > A > B > C > D，同评级按score降序

### 实现逻辑
1. 结算时计算score（已有calcGrade分数）
2. 读取 `mosui_leaderboard`
3. 插入新记录并排序
4. 保留前20条
5. 写回localStorage
6. 排行榜面板可从结算页或标题页访问

### 排行榜面板
- game.html添加 `<div id="leaderboard" style="display:none">`
- 标题页和结算页添加"排行榜"按钮
- 显示排名、武器、评级、击杀、日期

### 验证
- 结算后排行榜更新
- 按评级排序正确
- 最多20条记录
- 面板可以打开/关闭

---

## 任务6: 敌人画像补充

### 目标
为缺少图标的敌人生成/补充图标，让百科页展示完整。

### 当前状态
- `assets/sprites/enemies/` 有38个jpg
- gamedata.js有47个ETYPE
- 缺少约9个敌人的图标

### 实现方案
1. 读取gamedata.js的ETYPE，列出所有敌人ID
2. 对比 `assets/sprites/enemies/` 中已有的文件
3. 对缺失的敌人，用多模态能力生成水墨风格的敌人图标
4. 图标要求：
   - 水墨风，暗色调
   - 128x128 px
   - jpg格式
   - 文件名 = ETYPE的key + ".jpg"（如 `molian.jpg`）
5. 放到 `assets/sprites/enemies/` 目录
6. 确认wiki.html能正确显示所有47个敌人图标

### 验证
- `assets/sprites/enemies/` 包含47个jpg文件（与ETYPE数量匹配）
- wiki.html百科页显示所有敌人图标

---

## 优先级顺序

| 顺序 | 任务 | 难度 | 预计行数 |
|------|------|------|---------|
| 1 | T1 结算截图 | 中 | ~60行 |
| 2 | T6 敌人画像 | 低(多模态) | 0代码 |
| 3 | T2 粒子升级 | 低 | ~40行 |
| 4 | T3 武器视觉 | 低 | ~40行 |
| 5 | T4 战斗回放 | 低 | ~50行 |
| 6 | T5 排行榜 | 低 | ~60行 |

总预计新增：~250行（game.js 5238+250=5488，在5500上限内）
