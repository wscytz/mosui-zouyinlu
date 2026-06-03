# 墨祟：走阴录 架构文档 v13.1

> 行号会随内容扩展漂移，定位请优先用 `rg "functionName"` 或 `.claude/ctx-extract.js` 输出的片段。结构红线详见 `STRUCTURE_RULES.md`。

## 分层总览

```
Platform     Capacitor / 浏览器 / APK
UI           game.html + game.css
Render       game.js render() + mobile-controls.js overlay
Core         game.js update()/combat/state machine
Input        desktop keys/mouse + mobile _mobileInput
Data         gamedata.js + game.js CAPS/LIMITS/RANGES/TUNING
Automation   .claude/ ctx extraction, agent templates, output validator
Assets       assets/ + art direction docs
```

## Data 层

`gamedata.js` 存放游戏内容数据表，被 `game.html`、`wiki.html` 和测试共同引用。

| 数据 | 用途 | 当前数量 |
|------|------|----------|
| `WEAPONS` | 武器定义 | 5 |
| `RELICS` | 遗物定义 | 213 |
| `EVOLUTIONS` | 进化定义 | 43 |
| `ETYPE` | 敌人模板 | 50 (含4Boss) |
| `STAGE_MODS` | 关卡调制器 | 10 |
| `CURSES` | 誓印 | 31 |
| `ACHIEVEMENTS` | 成就 | 53 |
| `PREREQS` | 前置条件 | 以 `npm run ctx` 输出为准 |
| `RANGES` | 距离阈值 | 以 `gamedata.js` 为准 |

规则：不写依赖 DOM/canvas 的逻辑，不写游戏流程控制。新增内容优先落在数据表，机制入口才进入 `game.js`。

## Input 层

桌面和移动端各自采集输入，统一由 `buildInputFrame(g)` 汇总，再供 `update()` 消费。

```
desktop keys/mouse ─┐
                    ├─ buildInputFrame(g) ─ update()
mobile _mobileInput ┘
```

移动端保留兼容入口：
- `window._mobileInput`
- `window._tickMobileAutoAim`
- `window._renderMobileControls`

长期扩展入口统一挂到 `window.MOSUI.input`、`MOSUI.platform`、`MOSUI.profiles`。

## Core 层

核心循环仍集中在 `game.js` 的 IIFE 内。

| 函数 | 职责 |
|------|------|
| `mkPlayer()` | 创建玩家对象和默认字段 |
| `newGame(wid,diff)` | 创建游戏状态 |
| `pAtk(g)` | 玩家攻击生成 |
| `hitE(g,atk,e)` | 攻击命中敌人 |
| `hurtP(g,dmg,src)` | 玩家受伤 |
| `damageEnemy(g,e,dmg,src)` | 敌人扣血统一入口 |
| `onEnemyKilled(g,e,src)` | 击杀结算 |
| `startWave(g)` | 波次启动 |
| `cleanupWave(g)` | 波次清理 |
| `spawnEnemy(g,type,opts)` | 生成敌人 |
| `rebuildPlayerStats(g)` | 从遗物重建 stats/标记 |

状态机：

```
playing -> waveClear -> relic/curse/evolution choice -> playing
playing -> paused -> playing
playing -> dying -> over
playing -> victory
```

## Render / UI 层

Canvas 渲染负责战斗画面、敌人、玩家、攻击、粒子、HUD 辅助信息。DOM UI 负责标题页、武器选择、遗物弹窗、誓印弹窗、暂停页、结算页。

分工原则：
- 战斗态和碰撞只在 Canvas/Core 层处理。
- 卡片、按钮、弹窗、移动端布局只在 DOM/CSS 层处理。
- CSS 遗物图标只做形状识别，不用文字 `content` 充当图标。

## Automation 层

`.claude/` 不参与游戏运行时，只服务开发自动化。

| 文件 | 职责 |
|------|------|
| `.claude/ctx-extract.js` | 提取当前内容数量、标签、测试编号、关键代码片段 |
| `.claude/validate-agent-output.js` | 校验 agent 输出，拦截坏风格和高危合并 |
| `.claude/agents/relic-designer.md` | 遗物专员模板 |
| `.claude/agents/enemy-designer.md` | 敌人专员模板 |
| `.claude/agents/content-writer.md` | 成就/誓印/文案专员模板 |
| `.claude/agents/balance-auditor.md` | 平衡和覆盖审计模板 |
| `.claude/agents/content-executor.md` | 批量 JSON block writer 模板 |

主 Claude / Codex 是合并者，按当前用户指定分工执行。专职 agent 只产出代码块或 JSON block，测试编号统一由主模型根据 ctx / sequencer 结果分配。

## 文件依赖关系

```
sound.js ──────┐
gamedata.js ───┤
game.js ───────┼── game.html
mobile-controls.js ┘

gamedata.js ───── wiki.html
.claude/*.js ──── development only
```

脚本加载顺序：

1. `sound.js`
2. `gamedata.js`
3. `game.js`
4. `mobile-controls.js`

## 预留插槽

`window.MOSUI` 是跨层共享的稳定入口。

| 命名空间 | 用途 |
|----------|------|
| `MOSUI.hooks` | 生命周期插槽 |
| `MOSUI.input` | 输入适配、当前输入快照、移动端输入状态 |
| `MOSUI.platform` | 平台能力、native/mobile/safe-area 等 |
| `MOSUI.profiles` | 控制、渲染、UI 参数档 |
| `MOSUI.ui` | HUD / overlay / modal 未来 API |
| `MOSUI.debug` | 启动链日志、输入诊断、性能观测 |

未来扩展默认接法：
- 新输入方式先接 `MOSUI.input`。
- 新视觉档位先接 `MOSUI.profiles.render`。
- 新平台能力先接 `MOSUI.platform`。
- 新 UI 状态先接 `MOSUI.ui`。
- 新调试面板先接 `MOSUI.debug`。

## 测试体系

| 文件 | 类型 | 当前口径 |
|------|------|----------|
| `smoke_test.js` | 冒烟 + 长跑 | 44 |
| `wave_test.js` | 波次流程 | 以脚本输出为准 |
| `content_test.js` | 内容静态 + 机制 | active blocks 以 ctx 扫描为准 |
| `stress_test.js` | 压力极限 | 以脚本输出为准 |
| `.claude/validate-agent-output.js` | agent 输出校验 | raw / merged 两种模式 |

标准命令：

```bash
npm run ctx
npm run test:all
```

## 关键不变量

1. 攻击入池必须走 `pushAttack()` / `addAttack()`。
2. 火场入池走 `addFire()`；敌弹入池走 `addEProj()`。
3. 不直接写 `g.attacks.push()`、`g.fires.push()`、`g.eProj.push()`。
4. 敌人扣血统一走 `damageEnemy(g,e,dmg,src)`。
5. 新增遗物有前置机制时必须同步更新 `PREREQS`。
6. 新增遗物如果引入或强化构筑方向，必须检查 `BUILD_PREFS` / `RELIC_RULES`。
7. 高频碰撞用 `dstSq()`，热路径禁用不必要的 `Math.sqrt()`。
8. 波次清理只清瞬时对象，长期构筑必须显式保留判断。
9. 移动端输入和桌面输入在 `buildInputFrame()` 中统一，互不污染。
10. 运行时代码保持 IIFE/`var`/普通 `function`/双引号风格。
