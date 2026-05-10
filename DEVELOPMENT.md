# 墨祟：走阴录 开发规范 v4.26

本文是给 Codex / Claude / 人类开发者的接手入口。现在项目已经进入“主 Claude + 专职 agent”协作期：先读规则，先取上下文，先校验输出，再合并测试。

> 当前内容体量：5武器 / 117遗物 / 25进化 / 35敌人(含3Boss) / 9关卡 / 22誓印 / 38成就。
>
> 当前自动检查：37 smoke + 5 wave + 139 active content blocks + 10 stress。`content_test.js` 的历史 summary 文本可能滞后，实际编号以 `.claude/ctx-extract.js` 扫描结果为准。

## 文档分工

| 文件 | 用途 | 维护规则 |
|------|------|----------|
| `README.md` | 玩家/运行入口，保持短 | 只写当前版本、启动、测试、文件说明 |
| `DEVELOPMENT.md` | 开发规范和交接清单 | 每次流程变化或踩坑后更新 |
| `AGENT_SYSTEM.md` | agent 自动化总纲 | 每次改 skill、agent、validator 后更新 |
| `.claude/skills/add-content/SKILL.md` | add-content skill 源文件 | 先改这里并提交，再同步到全局 Claude skill |
| `.claude/skills/idea-lab/SKILL.md` | 点子审核/创新侦察 skill | 按需触发，不进入默认实现流程 |
| `.claude/skills/agent-retro/SKILL.md` | agent 复盘/经验提取 skill | 只记录可复发失败模式 |
| `.claude/sync-skills.ps1` | skill 安装脚本 | 同步前备份全局 skill |
| `.claude/check-skills.ps1` | skill 同步检查 | 对比项目源和全局副本 hash |
| `.claude/IDEA_BANK.md` | 未实现点子库 | 只存精简候选，不存长聊天 |
| `.claude/agent-lessons.md` | agent 经验库 | 第二次复发才记录，第三次进 validator/template |
| `ROADMAP.md` | 路线和阶段目标 | 每个版本或阶段收口时更新 |
| `ARCHITECTURE.md` | 分层、边界、关键不变量 | 架构入口或文件职责变化后更新 |
| `DEVDOC.md` | 技术历史、版本记录、Bug追踪 | 每个小版本追加变更记录 |
| `wiki.html` | 游戏内百科/内容展示 | 内容来自 `gamedata.js`，不要手写重复数据 |

## 每次开发顺序

1. 先读 `DEVELOPMENT.md`、`AGENT_SYSTEM.md`、`DEVDOC.md` 末尾记录。
2. 跑 `npm run ctx`，确认当前内容数量、标签缺口、最大测试号。
3. 修 Bug 优先于加内容：崩溃、卡流程、状态错乱、性能尖峰先处理。
4. 改玩法时优先改 `gamedata.js` 数据表；只有机制需要才改 `game.js`。
5. 用 agent 时必须先校验原始输出，再由主 Claude 替换测试编号并合并。
6. 每个新机制至少补一个 `content_test.js`、`wave_test.js` 或 `smoke_test.js` 覆盖。
7. 最后更新文档和版本号，跑全量测试。

## 必跑命令

```bash
npm run ctx
npm run test:all
```

等价展开：

```bash
node --check gamedata.js
node --check game.js
node --check mobile-controls.js
node --check .claude/ctx-extract.js
node --check .claude/validate-agent-output.js
node smoke_test.js
node wave_test.js
node content_test.js
node stress_test.js
```

只改文档时不用跑全量测试，但要说明“未改运行代码”。

## 架构边界

| 区域 | 放什么 | 不要做什么 |
|------|--------|------------|
| `gamedata.js` | 武器、遗物、敌人、誓印、常量、前置条件 | 不写依赖 DOM / canvas 的逻辑 |
| `game.js` | 状态机、战斗循环、碰撞、渲染、选择算法 | 不把新增内容写成大量 `id` 特判 |
| `game.css` | DOM UI、卡片、HUD、移动端布局、CSS图标 | 不影响 canvas 内战斗逻辑 |
| `mobile-controls.js` | 触摸输入桥接到 `_mobileInput` | 不复制桌面战斗逻辑 |
| `.claude/` | agent 模板、上下文提取、输出校验 | 不放会改变游戏运行时的代码 |
| `.claude/skills/` | Claude skill 的项目内源文件 | 不只改全局副本，避免 git 追不到 skill 变化 |
| `content_test.js` | 数据和机制单元测试 | 不依赖真实 DOM |
| `smoke_test.js` | 长跑、流程、回归测试 | 不做复杂数值断言 |
| `wave_test.js` | 波次推进、召唤、分裂、护盾等流程 | 不测纯数据表 |
| `stress_test.js` | 极限对象和长时间稳定性 | 不作为精细平衡标准 |

## 核心不变量

- 攻击对象进入 `g.attacks` 必须走 `pushAttack()` 或 `addAttack()`。
- 火场进入 `g.fires` 必须走 `addFire()`；敌弹进入 `g.eProj` 必须走 `addEProj()`。
- 不要直接 `g.xxx.push()` 到有上限保护的运行时池。
- 不要直接 `e.hp -= dmg`，统一走 `damageEnemy(g,e,dmg,src)`。
- 不要在机制代码里用 `arguments[0]`，必须使用 `hurtP(g,dmg,src)` 等函数已有实参名。
- 不要在遗物 `fn` 里重置 `p._xxx=0`，累加字段用 `(p.xxx||0)+N`，运行时计数器默认值放 `mkPlayer()`。
- 新增遗物如果依赖前置机制，必须同步更新 `PREREQS`，避免死词条。
- 新增遗物必须检查 `BUILD_PREFS` 和 `RELIC_RULES`，避免只靠通用标签随机出现。
- 数值型遗物改 `p.stats`；机制型遗物改玩家标记，并在 `pAtk/hitE/hurtP/onEnemyKilled/update` 中挂钩。
- 命中类效果必须考虑 `source`，避免火、魂、反伤、召物误触发“近战击杀”等文案效果。
- 波次切换只能清理瞬时对象；召物、玩家火场、长期构筑对象是否保留必须显式判断。
- 高频循环优先用 `dstSq()`，不要在热路径里滥用 `Math.sqrt()`。
- 新 UI 不要阻塞 `playing/waveClear/paused/over/victory` 状态机。
- 项目运行时代码保持 ES5 风格：`var`、普通 `function`、双引号字符串。
- 新遗物必须有 CSS `data-icon` 图标块，ID 和 `RELICS` id 完全一致。
- CSS 图标选择器必须是 `.relic-pick[data-icon="ID"] .ink-icon::before/after`。
- CSS 变量只允许 `var(--ink)` / `var(--accent)` / `var(--paper)` / `var(--game-bg)`。
- 不要编造 `C.purple` 等颜色常量；只使用 `gamedata.js` 中已有 `C.*` 键。

## 新增遗物检查表

1. 在 `RELICS` 添加 `id/name/type/tags/effect/fn`。
2. 如果有前置，在 `PREREQS` 添加过滤条件。
3. 如果影响构筑推荐，在 `BUILD_PREFS` 或 `RELIC_RULES` 补权重。
4. 如果是新机制，在 `mkPlayer()` 或 `rebuildPlayerStats()` 添加默认字段/重建字段。
5. 在正确触发点实现机制，并传入清晰 `source`。
6. 在 `game.css` 添加纯形状 CSS 图标，禁止 `content/position/box-shadow/inset/opacity`。
7. 在 `content_test.js` 加数据/机制测试。
8. 更新 `DEVDOC.md`、`ROADMAP.md` 或 `README.md` 中受影响的数量。

## 新增敌人检查表

1. 在 `ETYPE` 添加属性，字段用项目实际格式：`hp/spd/atk/atkR/r/tip` 等。
2. 在 `WAVE_TIERS` 和 `ENEMY_COST` 添加出场与成本。
3. 在 `DEATH_COLOR` / 渲染分支补视觉差异。
4. 如果有特殊 AI，优先用通用字段驱动，必要时才在 enemy loop 分支。
5. 补 `content_test.js` 或 `wave_test.js`，至少覆盖 spawn、字段、核心机制。

## Agent 合并检查表

1. 原始输出必须包含 `TEST_ID_PLACEHOLDER`，不能包含具体新测试号。
2. 先跑 `node .claude/validate-agent-output.js .claude/tmp-agent-output.md`。
3. 主 Claude 替换测试编号后，跑 `node .claude/validate-agent-output.js --mode merged .claude/tmp-agent-output.merged.md`。
4. 检查 agent 没有用 `let/const/=>/for...of`。
5. 检查 agent 没有直接 push 到 `g.attacks/g.fires/g.eProj`。
6. 检查 agent 没有用测试框架函数、复杂 CSS、`arguments[0]`、`fn` 内重置累加器。
7. 合并后跑 `npm run test:all`。

## Skill 本体维护

全局 `~/.claude/skills/add-content/SKILL.md` 是安装副本，项目内 `.claude/skills/add-content/SKILL.md` 是源文件。

修改 skill 时：

1. 先改项目内 `.claude/skills/add-content/SKILL.md`。
2. 检查 diff，确认没有误改 ccswitch 或其他全局配置。
3. 运行 `npm run skill:sync` 同步到全局。
4. 运行 `npm run skill:check` 确认项目源文件和全局副本一致。
5. 把项目内 skill 源文件和相关文档一起提交。

不要只改全局 skill；否则后续无法用 git 回滚或审计 skill 变化。

新增或修改任何 `.claude/skills/**/SKILL.md` 后，最终回复必须说明是否已经运行 `npm run skill:sync` 和 `npm run skill:check`。

## 文档更新钩子

| 改动 | 必更 | 条件更新 |
|------|------|----------|
| 新内容落地 | `DEVDOC.md` | `README.md` 数量变化；`ROADMAP.md` 阶段变化 |
| 新机制/不变量 | `DEVDOC.md` | `ARCHITECTURE.md` / `DEVELOPMENT.md` |
| skill | `.claude/skills/*/SKILL.md` | 同步全局；`AGENT_SYSTEM.md` 流程变化 |
| agent 模板 | `.claude/agents/*.md` | `AGENT_SYSTEM.md` 规则变化 |
| validator | `.claude/validate-agent-output.js` | `.claude/agent-lessons.md` 复发记录 |
| 未实现点子 | 无 | 用户明确要求才写 `.claude/IDEA_BANK.md` |

省 token 规则：长历史进 `DEVDOC.md`，短规则进 skill/AGENT_SYSTEM，点子进 IDEA_BANK，失败模式进 agent-lessons；不要在多个文件重复粘贴同一段长说明。

## 交接给另一个模型时的提示模板

```md
先读 DEVELOPMENT.md、AGENT_SYSTEM.md 和 DEVDOC.md 末尾记录。
当前目标：<一句话目标>
优先级：先修 <Bug/稳定性>，再做 <玩法/UI/数值>。
限制：
- 保持 IIFE/var/function/双引号风格。
- 不要直接 push 到 g.attacks/g.fires/g.eProj。
- 新遗物必须补 PREREQS/BUILD_PREFS/RELIC_RULES/CSS图标/测试。
- agent 输出必须先跑 .claude/validate-agent-output.js。
- 不要大规模重构无关代码。
验收：
- npm run ctx
- npm run test:all
最后更新 DEVDOC.md、ROADMAP.md 和受影响文档。
```

## 当前优先级

1. 导入 ccswitch 前封板：文档、agent 模板、validator、测试脚本口径一致。
2. 修正 `content_test.js` 历史 summary 与实际测试块数量的漂移。
3. 扩展 validator：从风格拦截升级到缺字段/缺图标/缺权重提示。
4. 用 balance-auditor 定期输出“冷标签 + 冷组合 + 死权重”清单。
5. 实机验证：鬼市交互、镜殿残影弹、墨契狂墨平衡、精英标记识别、移动端摇杆可见度。
