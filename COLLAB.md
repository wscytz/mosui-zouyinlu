# 墨祟：走阴录 — 协同开发规范

> Claude（我）= 架构师/审核者 | OpenCode模型 = 实现者/提交者

## 一、角色分工

### Claude（架构师 + 审核者）
- 制定版本方向和优先级（按ROADMAP.md）
- 设计机制方案，给出实现规格
- 审核OpenCode提交的代码变更
- 跑测试验证合规性
- 最终git commit + push

### OpenCode（实现者）
- 根据任务描述编写/修改代码
- 在game.js/gamedata.js/content_test.js中实现具体逻辑
- 自行跑 `node --check` 和测试确认基本正确性
- 提交变更清单（哪些文件改了什么）

## 二、任务流程

```
Claude发任务 → OpenCode实现 → OpenCode自测 → 提交变更清单 → Claude审核 → Claude合并推送
```

### 任务格式
Claude发出的任务格式：
```
## 任务：[版本号] [简述]

### 改动范围
- 文件：game.js / gamedata.js / content_test.js / ...
- 涉及函数/区域：[具体位置或搜索关键词]

### 实现规格
[具体要求，包含数据结构、逻辑描述、参考代码]

### 验证
- `node --check game.js` 必须通过
- `node smoke_test.js` 必须全绿
- `node content_test.js` 必须全绿

### 注意
- game.js使用CRLF换行
- 不改核心结构（hitE/hurtP/spawnWave）
- 保持代码风格一致（无框架、无注释、紧凑写法）
```

### OpenCode提交格式
```
## 变更清单：[任务编号]

### 文件变更
1. **game.js** — [改了什么，哪一行附近]
2. **gamedata.js** — [改了什么]

### 自测结果
- `node --check game.js`: ✅ 通过
- `node smoke_test.js`: ✅ 44/44
- `node content_test.js`: ✅ 236/236

### 代码片段
[关键改动的代码片段，方便审核]
```

## 三、审核标准

Claude审核时检查：
1. **语法**: `node --check game.js` 无错误
2. **测试**: smoke 44项 + content 236项全绿
3. **行数上限**: game.js ≤ 8000行
4. **风格一致**: 无多余注释、无框架痕迹、紧凑单行风格
5. **核心未动**: hitE/hurtP/spawnWave结构未被修改
6. **无安全风险**: 无命令注入/eval/外部请求

## 四、项目现状（2026-06-01）

| 项 | 值 |
|---|---|
| 版本 | v9.2 |
| 遗物 | 203个 |
| 敌人 | 47个(3Boss) |
| 誓印 | 28个 |
| 成就 | 47个 |
| 进化 | 38个 |
| 测试 | content 236项 + smoke 44项 |
| game.js | ~5300行 |

## 五、下一步任务（v9.x → v10.0）

按ROADMAP.md优先级：

### P2 剩余
1. **Boss行为微调** — 基于玩家反馈调整Boss难度曲线
2. **难度评估** — 是否需要"炼狱"第四难度

### v10.0 视觉升级
1. 结算截图生成（Canvas截图→下载）
2. 更多敌人画像（当前47敌人仅部分有图标）
3. 粒子效果升级（击杀/暴击/Boss击杀）
4. 武器攻击动画差异化（5武器视觉辨识度）

### v11.0+ 长期
- 第6把武器、第4/5 Boss、无尽模式、排行榜

## 六、关键代码位置速查

| 搜索关键词 | 位置/用途 |
|-----------|----------|
| `function forEachLiveEnemy` | 遍历存活敌人 |
| `function onEnemyKilled` | 击杀处理 |
| `function damageEnemy` | 受伤处理（暴击/遗物触发） |
| `function hurtP` | 玩家受伤 |
| `function update(g)` | 主循环 |
| `atk.type==="proj"` | 弹射物命中 |
| `g.weapon.type==="melee"` | 近战判断 |
| `meleeMobility:false` | 玩家默认属性区（line ~345） |
| `var RELICS=[` | 遗物数组（line ~36） |
| `var PREREQS={` | 前置条件（line ~549） |
| `var ETYPE={` | 敌人定义（line ~457） |

## 七、开发红线

- **不碰**: hitE/hurtP结构、spawnWave核心、game.js超8000行
- **必须**: 每次改完跑测试、git用wscytz身份、无AI署名
- **构建**: `npm run www && npm run cap:sync` 每次提交后执行
