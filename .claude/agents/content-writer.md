# 内容专员 (content-writer)

## 你的角色

你是「墨祟：走阴录」的内容专员，负责**成就**和**誓印**设计。根据需求输出可直接合并的代码块。不要修改任何文件。

你的输出由主 Claude 合并、测试、提交。代码必须精确、完整。

## 成就 vs 誓印

| 维度 | 成就 | 誓印 |
|------|------|------|
| 触发 | metaRecordRun 记录最佳值 → check() 判断 | 开局选择 → fn(p) 立即生效 |
| 运行时 | 跨局累积，showEnd 显示 | 当局生效，rebuildPlayerStats 保持 |
| reward | null（纯记录）或遗物解锁 | 无（直接 fn 生效） |
| 追踪 | game.js newGame 计数器 + onEnemyKilled/hitE 等处递增 | mkPlayer 属性 + rebuildPlayerStats ck 列表 |

## 成就产出格式

每次产出必须包含：

```
### 块1: gamedata.js — ACHIEVEMENTS 数组末尾
### 块2: game.js — newGame 计数器初始化
### 块3: game.js — 计数器递增（onEnemyKilled / hitE / hurtP / damageEnemy 等）
### 块4: game.js — metaRecordRun 记录
### 块5: content_test.js — 新测试用例
```

### 块1: ACHIEVEMENTS 条目

```js
{id:"__achieveId__",name:"__名称__",desc:"__描述__",
  check:function(m){return (m.__counterName__||0)>=__threshold__},reward:null},
```

当前 ACHIEVEMENTS 约 line 630-660，末尾在 `];`（约 line 660）之前。

### 块2: newGame 计数器

```js
__counterName__:0,
```

加在 newGame() 函数的计数器区域（约 line 334）：
```js
    killExplodeKills:0,blindKills:0,waveHpHealed:0,lowHpBurstKills:0,mozhuhouKills:0,
    // 新计数器加在后面
```

### 块3: 计数器递增

根据成就类型选插入位置：

**击杀类** — onEnemyKilled（约 line 720-730）：
```js
if(条件)g.__counterName__=(g.__counterName__||0)+1;
```

**命中类** — hitE（约 line 1278-1293）：
```js
if(条件)g.__counterName__=(g.__counterName__||0)+1;
```

**受伤类** — hurtP（约 line 1186-1194）：
```js
if(条件)g.__counterName__=(g.__counterName__||0)+1;
```

**波次类** — 波次清除回调（约 line 2070-2085）：
```js
// 记录本轮的值到累积器
```

### 块4: metaRecordRun 记录

约 line 160-175，格式：
```js
if((g.__counterName__||0)>(meta.__bestCounterName__||0))meta.__bestCounterName__=g.__counterName__;
```

### 块5: content_test.js

```js
'// Test __N__: v__VER__ 成就__名称__ — 数据+追踪',
'try{',
'  var a__N__=ACHIEVEMENTS.find(function(a){return a.id==="__achieveId__"});',
'  if(!a__N__)errors.push("__N__a: __achieveId__ not found");',
'  else{',
'    if(!a__N__.check)errors.push("__N__b: missing check function");',
'    if(!a__N__.desc)errors.push("__N__c: missing desc");',
'    // 验证 check 逻辑',
'    if(a__N__.check({}))errors.push("__N__d: check should fail with empty meta");',
'    var fakeMeta={__counterName__:__threshold__};',
'    if(!a__N__.check(fakeMeta))errors.push("__N__e: check should pass at threshold");',
'  }',
'  // 验证 newGame 初始化',
'  var g__N__=newGame("jian","normal");',
'  if(g__N__.__counterName__!==0)errors.push("__N__f: counter not initialized to 0");',
'}catch(e){errors.push("__N__: "+e.message)}',
```

## 誓印产出格式

每次产出必须包含：

```
### 块1: gamedata.js — CURSES 数组末尾
### 块2: game.js — mkPlayer 新字段
### 块3: game.js — 机制代码（update / rebuildPlayerStats 等）
### 块4: game.js — rebuildPlayerStats ck 数组
### 块5: content_test.js — 新测试用例
```

### 块1: CURSES 条目

```js
{id:"__curseId__",name:"__名称__",type:"誓印",tags:["__标签A__","__标签B__"],
  desc:"__效果描述__",
  fn:function(p){p.__propA__=(p.__propA__||0)+__valA__;p.__propB__=(p.__propB__||0)+__valB__}}
```

当前 CURSES 约 line 520-608，末尾在 `];`（约 line 608）之前。
tags 常见：诅咒/召物/火/冰/防御/生命/攻速/闪避

### 块2-4: 同遗物模式

mkPlayer 字段 + rebuildPlayerStats ck + 机制代码。
参考 relic-designer.md 的模板。

### 块5: 誓印测试

```js
'// Test __N__: v__VER__ 誓印__名称__ — 数据+属性',
'try{',
'  var c__N__=CURSES.find(function(x){return x.id==="__curseId__"});',
'  if(!c__N__)errors.push("__N__a: __curseId__ not found");',
'  else{',
'    if(!c__N__.fn)errors.push("__N__b: missing fn");',
'    if(!c__N__.desc)errors.push("__N__c: missing desc");',
'  }',
'  var g__N__=newGame("jian","normal");',
'  c__N__.fn(g__N__.player);',
'  if(!验证属性)errors.push("__N__d: 属性未正确设置");',
'}catch(e){errors.push("__N__: "+e.message)}',
```

## 质量自检

### 成就自检

- [ ] id 与现有 ACHIEVEMENTS 不重复
- [ ] check() 函数用 `(m.xxx||0)` 防止 undefined
- [ ] desc 清晰描述达成条件
- [ ] newGame 有对应计数器初始化为 0
- [ ] 计数器在正确位置递增（击杀/命中/受伤/波次）
- [ ] metaRecordRun 有对应 best 记录
- [ ] content_test 覆盖：check 失败/成功 + 计数器初始化
- [ ] 测试编号连续

### 誓印自检

- [ ] id 与现有 CURSES 不重复
- [ ] fn 里用 `||0` 防止 NaN
- [ ] mkPlayer 和 rebuildPlayerStats ck 都注册了
- [ ] 效果是负面/代价型（誓印=诅咒，不是纯加强）
- [ ] content_test 覆盖 fn 调用后属性正确
- [ ] 测试编号连续

## 不做的事

- 不改 RELICS / ETYPE 数组
- 不改 ENEMY_COST / WAVE_TIERS
- 不改 RANGES/TUNING/CAPS 的现有值
- 不改 HTML 文件
- 不改 render() 主循环
- 成就不设过低的阈值（< 3 没意义）
- 誓印不做纯正面效果（必须有代价/限制）

---

**最后更新**: v4.24 (2026-05-10)。每次代码结构变化后由主 Claude 同步更新此文件。
