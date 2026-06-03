# 墨祟：走阴录 结构治理与协作规范 v13.1

> 这份文档给 Claude、Codex、agent 和人类开发者共用。目标是减少“修一个 bug 引出三个 bug”“新增内容但系统没吸收”“文档和代码口径漂移”。

## 一、总原则

### 1. 每次只解决一个主问题

一次任务必须先归类：

| 类型 | 目标 | 禁止 |
|---|---|---|
| Bug 修复 | 修复已知错误并补回归测试 | 顺手加新内容 |
| 结构治理 | 收口入口、字段、生命周期、测试口径 | 改战斗手感 |
| UI 优化 | 改显示、布局、交互反馈 | 改伤害、掉落、波次 |
| 内容扩展 | 增遗物、敌人、Boss、誓印 | 同时重构核心 |
| 性能优化 | 降低对象数、减少热路径开销 | 偷改平衡数值 |
| 文档同步 | 更新规则、数量、路线、版本历史 | 改运行代码 |

如果一个任务跨两类以上，必须拆成多个提交或多个小版本。

### 2. 先修稳定性，再做爽点

优先级固定：

1. 崩溃、卡页面、状态机错乱。
2. 选择逻辑、前置条件、source 误触发。
3. 长跑性能、对象泄漏、移动端不可玩。
4. UI 遮挡、反馈不清、图标缺失。
5. 平衡、构筑冷门、内容扩展。

### 3. 数据能解决的，不进运行时

新增内容优先顺序：

1. `gamedata.js` 数据表。
2. 既有通用字段。
3. 既有通用机制入口。
4. 小型新通用机制。
5. 最后才允许 `game.js` 特判。

如果一个新遗物需要超过 2 个运行时分支，先停下来问：它是不是应该被抽象成通用机制？

## 二、文件职责

| 文件 | 应该放 | 不应该放 |
|---|---|---|
| `gamedata.js` | 武器、遗物、进化、敌人、誓印、成就、关卡调制器、前置、构筑权重 | DOM、Canvas、状态机流程 |
| `game.js` | 主循环、状态机、战斗、命中、渲染、选择流程 | 大量文案、重复数据、批量内容 |
| `game.css` | DOM UI、卡片、弹窗、图标、移动端布局 | 战斗判定、数值逻辑 |
| `mobile-controls.js` | 移动端输入采集、摇杆、触控适配 | 复制桌面战斗逻辑 |
| `wiki.html` | 自动展示数据 | 手写重复内容表 |
| `DEVDOC.md` | 版本历史、Bug 追踪、技术记录 | 长期路线 |
| `ROADMAP.md` | 阶段目标、版本节奏、解锁条件 | 具体代码细节 |
| `DEVELOPMENT.md` | 日常开发流程、测试、agent 合并规则 | 长篇版本历史 |
| `STRUCTURE_RULES.md` | 结构治理红线和规范 | 具体版本流水账 |

## 三、运行时代码规范

### 1. 风格

- 保持单 IIFE 风格，除非进入明确的 v14 拆分任务。
- 保持 `var`、普通 `function`、双引号。
- 不使用 `let`、`const`、箭头函数、class、模块导入。
- 不引入框架、不引入构建步骤。
- 不在热路径写复杂临时对象。
- 不写大段解释性注释；只在复杂机制入口写短注释。

### 2. 对象池入口

所有运行时对象必须走统一入口：

| 对象 | 入口 | 禁止 |
|---|---|---|
| 玩家攻击 | `pushAttack()` / `addAttack()` | `g.attacks.push()` |
| 火场 / 墨池 | `addFire()` | `g.fires.push()` |
| 敌弹 | `addEProj()` | `g.eProj.push()` |
| 敌人 | `spawnEnemy()` | 直接构造后塞 `g.enemies` |
| 粒子 | 统一粒子入口或封装函数 | 高频循环里无限 push |
| 浮字 | 统一浮字入口或封装函数 | 每帧每目标无限生成 |

新增入口必须负责：

- 默认字段补齐。
- 生命周期字段。
- 上限保护。
- 异常值修正。
- 必要的 `hitMap` / source / owner 初始化。

### 3. 伤害与击杀

- 敌人扣血统一走 `damageEnemy(g,e,dmg,src)`。
- 玩家受伤统一走 `hurtP(g,dmg,src)`。
- 击杀结算统一走 `onEnemyKilled(g,e,src)`。
- 不直接 `e.hp -= dmg`。
- 不直接在多个地方结算成就、掉落、击杀 buff。
- 所有伤害来源必须带 `src`。

推荐 source 格式：

| 来源 | 示例 |
|---|---|
| 近战 | `{kind:"melee", weapon:"jian"}` |
| 弹体 | `{kind:"proj", weapon:"san"}` |
| 魂伤 | `{kind:"spirit", relic:"lingmuyu"}` |
| 火场 | `{kind:"fire", relic:"mohuozhu"}` |
| 反伤 | `{kind:"reflect", relic:"hujia"}` |
| 召唤物 | `{kind:"summon", relic:"zhaohunfan"}` |
| 敌人 | `{kind:"enemy", enemy:e.type}` |

判定遗物时只看 `src.kind`，不要用“当前武器类型”代替“实际击杀来源”。

## 四、选择系统规范

遗物、进化、誓印选择必须遵守统一顺序：

1. 取候选全集。
2. 过滤已拥有或不可重复项。
3. 过滤模式、难度、武器类型。
4. 过滤前置条件。
5. 过滤后续项锁定条件。
6. 应用构筑权重。
7. 随机抽取。
8. 展示卡面。
9. 点击后再次校验可获得。
10. 应用效果并记录历史。

### 禁止

- 展示时过滤一套，点击时应用另一套。
- 只靠 UI 隐藏不可选项。
- 未选前置进化时出现后续进化。
- 遗物跳过后残留 pending state。
- 同一波重复弹出选择弹窗。
- 用数组下标当稳定 id。

### 必测

- 无前置时不会给后续项。
- 有前置时后续项可出现。
- 跳过不会自动给后续项。
- 刷新 / 重开不会残留上局选择状态。

## 五、遗物与构筑规范

### 新增遗物必须同步

1. `RELICS` 数据。
2. `PREREQS` 前置条件。
3. `BUILD_PREFS` 或 `RELIC_RULES` 权重。
4. CSS 图标或资产 manifest。
5. Wiki 展示。
6. 至少一个测试。
7. `DEVDOC.md` 版本记录。

### 遗物分类

| 类型 | 实现方式 |
|---|---|
| 纯数值 | 只改 `p.stats` |
| 条件数值 | `rebuildPlayerStats()` 中重建字段 |
| 命中触发 | `hitE()` 或通用 hit hook，必须看 source |
| 击杀触发 | `onEnemyKilled()`，必须看 source |
| 受伤触发 | `hurtP()`，必须看 source |
| 周期触发 | `update()` 中统一 tick |
| 召唤触发 | 统一 summon 入口 |

### 禁止

- 在遗物 `fn` 里重置运行时计数器。
- 在遗物 `fn` 里写一次性不可重建状态。
- 只写 tags，不写构筑权重。
- 文案写“近战”，代码却吃所有击杀。
- 文案写“减速目标”，代码却只吃上一次命中的状态。

## 六、敌人与 Boss 规范

### 敌人

新增敌人必须同步：

1. `ETYPE`。
2. `WAVE_TIERS`。
3. `ENEMY_COST`。
4. `DEATH_COLOR` 或渲染识别。
5. Wiki 展示。
6. spawn 或行为测试。

敌人 AI 原则：

- 移动目标和攻击目标必须一致，除非设计明确说明。
- 被诱饵影响时，移动、射击、冲刺都应打诱饵。
- 特殊行为优先用字段驱动，不优先写 `if(type==="xxx")`。
- 远程敌人必须有射程、冷却、弹体生命周期。

### Boss

Boss 机制必须有阶段边界：

| 内容 | 要求 |
|---|---|
| 阶段触发 | 只触发一次，有 `_phaseXDone` 标记 |
| 召唤物 | 标记是否 Boss、是否结算、是否触发成就 |
| 护盾 | 走统一 shield 字段 |
| 弹幕 | 走敌弹入口，必须有清理 |
| 结算 | 只由真 Boss 死亡触发 |

Boss 不允许在普通敌人循环里塞过多不可复用分支。超过 3 个 Boss 专属分支时，应考虑 Boss 行为 helper。

## 七、UI 与图标规范

### DOM UI

- 弹窗状态必须有单一打开/关闭入口。
- UI 不直接改战斗对象，必须调用明确函数。
- 关闭弹窗后必须清理 pending state。
- `paused / relic / curse / evolution / over / victory` 不得互相覆盖。
- 成就 toast、教学、Boss 提示、结算副标题不能互相遮挡。

### Canvas UI

- 战斗 HUD 只显示战斗态必要信息。
- 墨雾、粒子、残影要有性能档。
- 伤害浮字要有数量上限。
- Boss 技能前摇必须可读。
- 危险区、弹幕、敌影不能被背景墨色吞掉。

### 图标

- 图标要表达“物件或机制”，不要用文字代替。
- CSS 图标必须使用 `.relic-pick[data-icon="ID"] .ink-icon::before/after`。
- 颜色只用项目规定色系。
- 新图标必须在 wiki 和选择卡中都能显示。
- 批量补图每批 20-30 个，先补高频核心，不一次性补全。

## 八、性能规范

### 热路径

以下区域属于热路径：

- `update()`。
- 敌人循环。
- 攻击命中循环。
- 粒子循环。
- 火场 / 敌弹循环。
- `render()` 主绘制。

热路径禁止：

- 不必要的 `Math.sqrt()`。
- 每帧创建大量对象。
- 每帧 `filter/map/reduce` 处理大数组。
- 高频字符串拼接。
- 高频 DOM 读写。
- 无限粒子、浮字、弹体。

### 对象上限

新增对象类型必须考虑：

- 最大数量。
- 最大存活时间。
- 离屏清理。
- 速度异常清理。
- 低性能档降级。
- 长局无尽模式增长。

### 压测组合

性能测试至少覆盖：

- 镇魂铃后期多圈。
- 伏魔伞弹道折返。
- 穿透弹 + 暴击溅射。
- 墨夜遮罩。
- 无尽 10 波以上。
- Boss 弹幕 + 召唤物。

## 九、移动端规范

- 桌面输入和移动输入只在 `buildInputFrame(g)` 合流。
- `mobile-controls.js` 不复制攻击、闪避、移动逻辑。
- 右摇杆必须有死区。
- 横屏优先，竖屏只保证不崩。
- 弹窗按钮必须适配手指点击。
- 安全区不能遮住核心按钮。
- APK 打包前必须真机验证。

移动端验收：

1. 武器选择能点。
2. 誓印/遗物/进化能选和跳过。
3. 左摇杆移动稳定。
4. 右摇杆瞄准不误触。
5. 暂停/继续可用。
6. 结算页可返回。
7. 低性能设备不明显卡死。

## 十、测试规范

### 改动对应测试

| 改动 | 测试 |
|---|---|
| 数据新增 | `content_test.js` |
| 波次、生成、Boss 阶段 | `wave_test.js` |
| 长跑、崩溃、对象泄漏 | `smoke_test.js` / `stress_test.js` |
| 随机种子 | seeded 测试 |
| UI 流程 | visual smoke / 浏览器实跑 |
| agent 规则 | automation / block fixtures |

### 必跑命令

常规代码改动：

```bash
node --check gamedata.js
node --check game.js
node --check mobile-controls.js
node smoke_test.js
node content_test.js
```

结构、agent、测试脚本改动：

```bash
npm run ctx
npm run test:all
npm run test:automation
npm run audit:content
```

文档-only 改动：

```text
不用跑全量测试，但最终说明必须写“未改运行代码”。
```

### 回归测试命名

测试说明必须写清：

- bug 现象。
- 触发条件。
- 断言结果。
- 防止什么复发。

不要只写“test new relic works”。

## 十一、文档规范

### 每次版本必须更新

| 改动 | 必更 |
|---|---|
| 数量变化 | `PROJECT_INTRO.md`、`README.md` 或相关入口 |
| 路线变化 | `ROADMAP.md` |
| 规则变化 | `STRUCTURE_RULES.md` / `DEVELOPMENT.md` |
| 架构变化 | `ARCHITECTURE.md` |
| 版本完成 | `DEVDOC.md` |
| 内容展示变化 | `wiki.html` 或 wiki 数据入口 |

### 不重复原则

- 长历史进 `DEVDOC.md`。
- 阶段计划进 `ROADMAP.md`。
- 每日流程进 `DEVELOPMENT.md`。
- 结构红线进 `STRUCTURE_RULES.md`。
- 玩家说明进 `README.md`。

同一段规则不要复制到三个文件；可以互相引用。

## 十二、Claude / agent 协作规范

### Claude 任务必须包含

1. 当前目标。
2. 允许改的文件。
3. 禁止改的文件或函数。
4. 实现规格。
5. 验收命令。
6. 文档同步要求。
7. 不允许顺手扩内容。

### agent 输出必须包含

1. 变更清单。
2. 自测结果。
3. 未解决问题。
4. 关键代码位置。
5. 是否改了运行代码。

### 审核者必须检查

- 是否违反对象池入口。
- 是否违反 source 判定。
- 是否新增隐式字段。
- 是否破坏选择过滤。
- 是否新增无测试机制。
- 是否文档数量漂移。
- 是否引入 ES6 风格漂移。

## 十三、提交规范

- 小版本可以多个 commit，但每个 commit 主题要清楚。
- 不要“一次提交修 bug + 加内容 + 改 UI + 改文档”。
- 提交信息不附 AI 署名。
- 推送前确认工作区没有无关改动。
- 如果工作区已有别人改动，不要回滚，先确认归属。

推荐提交主题：

```text
fix: relic choice prereq filtering
test: add return ink hitMap regression
ui: unify relic modal close state
docs: update v13.1 structure roadmap
perf: cap late-game floating texts
```

## 十四、v13 后最容易复发的问题

1. 遗物/进化后续项越过前置。
2. 近战文案遗物吃到魂伤、火伤、反伤击杀。
3. 新攻击绕过 `addAttack()` 缺默认字段。
4. 波次清理误删长期对象，或没删瞬时对象。
5. Boss 分身/召唤物误触发 Boss 结算。
6. UI 弹窗 pending state 残留。
7. 粒子、浮字、弹体在后期无限增长。
8. 图标只补 CSS，不补 wiki / manifest。
9. 文档数量和实际内容不一致。
10. Claude/agent 按旧文档继续加内容。

## 十五、开工前检查清单

每次让 Claude 或 agent 开工前，先贴这段：

```md
先读 PROJECT_INTRO.md、ROADMAP.md、STRUCTURE_RULES.md、DEVELOPMENT.md、DEVDOC.md 末尾。

本次任务类型：<Bug / 结构 / UI / 内容 / 性能 / 文档>
本次目标：<一句话>

允许修改：
- <文件>

禁止修改：
- hitE / hurtP / spawnWave 主结构，除非任务明确要求
- 无关内容数量
- 无关 UI 风格

必须遵守：
- 不直接 push 到 g.attacks / g.fires / g.eProj。
- 伤害和击杀必须带 source。
- 选择逻辑必须做前置和后续项过滤。
- 新机制必须补测试。
- 文档数量必须同步。

验收：
- node --check game.js
- node smoke_test.js
- node content_test.js
- 如改结构，跑 npm run test:all。
```
