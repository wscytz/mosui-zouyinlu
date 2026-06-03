# 墨祟：走阴录 v13.0

水墨俯视角动作肉鸽。玩家扮演替亡者走阴的夜行客，手持法器深入地宫，在 9 波战斗、关卡调制器、遗物/进化构筑和 Boss 战之间完成一局。

纯 Canvas 2D，零框架，浏览器即玩；桌面键鼠与移动端双虚拟摇杆共用同一套游戏逻辑，可通过 Capacitor 打包 APK。

## 快速开始

浏览器直接打开 `game.html` 即可游玩，建议 Chrome / Edge。

```bash
npm run ctx
npm run test:all
npm run test:visual
npm run audit:content
```

只改文档时不用跑全量测试，但交付说明必须写明“未改运行代码”。

## 当前内容

- **5 把武器**：斩妖剑 / 符骨笔 / 镇魂铃 / 伏魔伞 / 召魂幡
- **213 件遗物**：标签、前置、构筑权重和图标驱动
- **43 种进化**：按武器与前置链条解锁
- **50 种敌人**：含普通、精英、特殊机制敌人
- **4 个 Boss**：画皮娘子 / 墨将军 / 墨鬼王 / 墨仙
- **9 个关卡波次**：每波带关卡调制器
- **31 条誓印**
- **53 个成就**
- **10 个关卡调制器**
- **4 种难度**：平常 / 险途 / 噩梦 / 炼狱
- **3 种模式**：普通 / 无尽 / 每日种子

## 操作

| 操作 | 桌面 | 移动端 |
|---|---|---|
| 移动 | WASD | 左摇杆 |
| 瞄准 / 攻击 | 鼠标移动 + 按住左键 | 自动瞄准，右摇杆手动覆盖 |
| 闪避 | 空格 / Shift | 闪避按钮 |
| 暂停 | Escape / P | 右上角暂停按钮 |
| 全屏 | F | - |
| 性能调试 | F3 | - |
| 快速重开 | R | - |

## 测试

标准回归以 `package.json` 为准：

```bash
npm run test:syntax
npm run test:all
npm run test:visual
npm run test:automation
npm run audit:content
```

常规代码改动至少跑：

```bash
node --check gamedata.js
node --check game.js
node --check mobile-controls.js
node smoke_test.js
node content_test.js
```

## 文档入口

建议接手顺序：

1. `PROJECT_INTRO.md`：当前事实源、文件结构、内容数量。
2. `DOC_INDEX.md`：全部 Markdown 的当前/历史分类。
3. `ROADMAP.md`：v13.1 起的阶段路线，当前主方向是结构治理。
4. `ITERATION_SYSTEM.md`：可持续迭代机制、版本节奏、冻结/准入。
5. `STRUCTURE_RULES.md`：结构、代码、UI、性能、测试和协作红线。
6. `DEVELOPMENT.md`：日常开发流程、测试命令、agent 合并规则。
7. `ARCHITECTURE.md`：分层、关键函数、运行时不变量。
8. `DEVDOC.md`：完整版本历史和 Bug 追踪。
9. `MULTI_AGENT_PROTOCOL.md`：多 agent 协作、文件锁、合并规则。
10. `AGENT_BOARD.md`：当前 agent 任务白板。
11. `AGENT_SYSTEM.md`：Claude agent 自动化、validator、批量内容流程。

旧任务包 `TASKS.md`、`TASKS_V9.md`、`TASKS_V12.md`、`V5_PREP.md` 只作历史归档，不作为当前任务来源。

## 文件结构

```text
game.html             游戏入口
game.css              游戏样式
styles.css            首页 / Wiki / 全站样式
gamedata.js           武器 / 遗物 / 进化 / 敌人 / 成就 / 誓印 / 调制器数据
game.js               主逻辑 IIFE，Canvas 渲染和战斗循环
sound.js              Web Audio 合成音效
mobile-controls.js    移动端虚拟摇杆和触摸输入
wiki.html             百科页面，读取 gamedata.js 自动渲染
index.html            概念首页

assets/               美术资产
.claude/              agent、上下文提取、输出校验和自动化脚本

README.md             玩家/运行入口
DOC_INDEX.md          文档索引
PROJECT_INTRO.md      当前项目事实源
ROADMAP.md            路线书
ITERATION_SYSTEM.md   可持续迭代机制
STRUCTURE_RULES.md    结构治理与协作规范
DEVELOPMENT.md        开发规范
ARCHITECTURE.md       架构文档
DEVDOC.md             技术历史和 Bug 追踪
COLLAB.md             协同任务模板
MULTI_AGENT_PROTOCOL.md 多 agent 协作协议
AGENT_BOARD.md        当前 agent 任务白板
```

## 移动端打包

```bash
npm run www
npm run cap:sync
npm run cap:open:android
```

APK 前必须先完成移动端横屏、右摇杆、弹窗、结算页和低性能档验证。具体前置见 `ROADMAP.md` 与 `STRUCTURE_RULES.md`。

## 开发红线

- 修 Bug 优先于加内容。
- 新机制必须补测试。
- 不直接 push 到 `g.attacks / g.fires / g.eProj`。
- 敌人扣血统一走 `damageEnemy(g,e,dmg,src)`。
- 伤害、击杀、触发效果必须带清晰 `source`。
- 遗物 / 进化 / 誓印选择必须经过前置和后续项过滤。
- 不大改 `hitE / hurtP / spawnWave` 主结构，除非路线图明确进入结构任务。
- 文档数量、Wiki 展示、测试口径必须和实际代码同步。
