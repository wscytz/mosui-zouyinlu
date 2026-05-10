# 墨祟：走阴录 Agent 自动化系统 v4.26

本文是给主 Claude、专职 agent、Codex 和人类维护者的统一入口。目标不是让 agent 自由发挥，而是让它们在稳定规则里持续产出可合并的小块内容。

## 角色分工

| 角色 | 职责 | 禁止 |
|------|------|------|
| 主 Claude | 读上下文、派发任务、合并代码、跑测试、提交文档 | 不把未校验的 agent 输出直接写入代码 |
| relic-designer | 设计 1-3 件遗物，输出固定代码块和测试 | 不改敌人、誓印、路线文档 |
| enemy-designer | 设计 1 个敌人，输出 ETYPE/WAVE/DEATH_COLOR/测试 | 不一次过量生成多个敌人 |
| content-writer | 写成就、誓印、文案和配套测试 | 不改战斗循环核心 |
| balance-auditor | 做静态审计和下轮机会清单 | 不直接改玩法数值，除非主 Claude 要求 |

## 文件入口

| 文件 | 用途 |
|------|------|
| `~/.claude/skills/add-content/SKILL.md` | 调度 skill，决定何时召唤专职 agent |
| `.claude/ctx-extract.js` | 自动提取当前内容、标签、测试编号、代码片段 |
| `.claude/validate-agent-output.js` | 校验 agent 输出是否可合并 |
| `.claude/skills/add-content/SKILL.md` | add-content skill 的项目内源文件，纳入 git 管理 |
| `.claude/skills/idea-lab/SKILL.md` | 点子审核、创新侦察、IDEA_BANK 维护 |
| `.claude/skills/agent-retro/SKILL.md` | agent 失败复盘、经验提取、门禁升级建议 |
| `.claude/sync-skills.ps1` | 将项目内所有 skill 备份并安装到全局 Claude skills |
| `.claude/check-skills.ps1` | 比对项目内 skill 源文件和全局安装副本 hash |
| `.claude/agents/relic-designer.md` | 遗物专员模板 |
| `.claude/agents/enemy-designer.md` | 敌人专员模板 |
| `.claude/agents/content-writer.md` | 内容专员模板 |
| `.claude/agents/balance-auditor.md` | 审计专员模板 |

## 标准流程

1. 主 Claude 先运行 `npm run ctx`，把输出作为事实源。
2. 主 Claude 按任务选择一个专员，要求“只输出代码块，不直接改文件”。
3. 专员必须使用 `TEST_ID_PLACEHOLDER`，不能自己写具体测试编号。
4. 主 Claude 保存原始输出到 `.claude/tmp-agent-output.md`。
5. 主 Claude 运行 `node .claude/validate-agent-output.js .claude/tmp-agent-output.md`。
6. 主 Claude 根据当前最大测试号替换 `TEST_ID_PLACEHOLDER`，保存为 `.claude/tmp-agent-output.merged.md`。
7. 主 Claude 运行 `node .claude/validate-agent-output.js --mode merged .claude/tmp-agent-output.merged.md`。
8. 主 Claude 合并代码，跑 `npm run test:all`。
9. 涉及 APK/网页资源时先 `npm run www` 或 `npm run cap:sync`，确认同步后再提交。
10. 更新 `README.md`、`ROADMAP.md`、`DEVDOC.md` 或本文件中受影响的规则。

## 硬规则

- 项目代码保持 IIFE 风格：`var`、普通 `function`、双引号字符串。
- 禁止 agent 输出 `let`、`const`、箭头函数、`for...of`、`for...in`。
- 攻击进入 `g.attacks` 必须走 `pushAttack(g, atk)` 或 `addAttack(g, atk)`。
- 火场进入 `g.fires` 必须走 `addFire()`；敌弹进入 `g.eProj` 必须走 `addEProj()`。
- 禁止直接写 `g.xxx.push()`，除非该池没有专用入口且主 Claude 明确确认。
- 禁止直接 `e.hp -= dmg`；伤害必须走 `damageEnemy(g,e,dmg,src)`。
- CSS 遗物图标只能用形状、边框、渐变和伪元素；禁止 `content`、`position`、`box-shadow`、`inset`、`opacity`。
- 新遗物必须有 `game.css` 的 `.relic-pick[data-icon="ID"]` 图标块，不能跳过 CSS。
- CSS 图标选择器必须精确包含 `.relic-pick[data-icon="ID"] .ink-icon::before` 和 `::after`。
- CSS 变量只允许 `var(--ink)` / `var(--accent)` / `var(--paper)` / `var(--game-bg)`。
- 颜色常量只能使用项目已有 `C.*`，不要编造 `C.purple` 等新键。
- `content_test.js` 必须沿用字符串数组 + `try/errors.push` 格式，禁止 `content_test()`、`test()`、`assert()` 等测试框架函数。
- 机制代码必须使用已有实参名，禁止 `arguments[0]`。
- 遗物 `fn` 只能设置布尔或累加数值，禁止在 `fn` 内重置 `p._xxx=0` 这类运行时累加器。
- 新遗物必须检查 `PREREQS`、`BUILD_PREFS`、`RELIC_RULES`、CSS 图标、测试。
- 新敌人必须检查 `ETYPE`、`WAVE_TIERS`、`ENEMY_COST`、`DEATH_COLOR`、`tip`、测试。
- 新成就必须检查 `ACHIEVEMENTS`、`metaRecordRun()`、`content_test.js` 成就数量/编号口径。

## 测试编号规则

- agent 永远输出 `// TEST_ID_PLACEHOLDER: ...`。
- 主 Claude 合并时以 `.claude/ctx-extract.js` 的最大测试号为准递增。
- 并发 agent 输出不能各自猜编号；全部由主 Claude 串行替换。
- `content_test.js` 里历史 summary 文本可能滞后，实际编号以扫描出的 `// Test N:` 块为准。

## 自我进化规则

同一种错误出现时按下面升级：

1. 第一次：主 Claude 手动修正，并在合并说明里记一句。
2. 第二次：补进对应 agent 的“自检清单”。
3. 第三次：补进 `.claude/validate-agent-output.js` 或测试脚本，让错误无法合并。

适合进 validator 的问题：
- ES6 语法漂移。
- 错测试编号。
- 直接 push 到运行时池。
- 缺 `tip`、缺 `DEATH_COLOR`、缺 CSS 图标。
- 遗物有新标签但没有 `BUILD_PREFS`/`RELIC_RULES` 覆盖。

适合进 agent 模板的问题：
- 输出数量过多。
- 文案风格不稳。
- 遗物触发时机选错。
- 成就埋点位置容易混淆。

## Skill 版本保护

`~/.claude/skills/add-content/SKILL.md` 是 Claude 实际加载的副本，但不要把它当唯一真源。skill 的可回滚源文件放在项目内：

```text
.claude/skills/add-content/SKILL.md
```

维护规则：

- 先改项目内源文件，让 git 记录 diff。
- 再运行 `npm run skill:sync` 安装到全局副本。
- 同步后运行 `npm run skill:check`，确认项目源文件和全局副本 hash 一致。
- 同步脚本会备份旧的全局 `SKILL.md`，避免误改后无法恢复。
- 如果全局副本和项目源文件不一致，以项目源文件为准。
- skill 只存流程和调度规则；失败历史放 agent lessons，未实现点子放 idea bank，版本事实放 DEVDOC/ROADMAP。

## 创新与复盘分层

不要把点子发散和失败复盘塞进 add-content 默认流程。

| skill | 触发 | 作用 | 默认成本 |
|-------|------|------|----------|
| add-content | 加遗物/敌人/成就/誓印 | 实现内容、校验、测试、提交 | 中高 |
| idea-lab | 找点子/审核点子/收进点子库 | 只做概念评审和 IDEA_BANK 维护 | 低 |
| agent-retro | 复盘 agent/提取经验/记错误 | 只做 lessons、模板、validator 经验沉淀 | 低 |

规则：

- 普通内容实现不自动跑 idea-lab 或 agent-retro。
- add-content 默认最多 2 个 agent 并发；超过 2 个必须用户明确要求。
- idea-lab 不写代码，不跑实现 agent。
- agent-retro 默认只处理最近一次失败，不总结整段长对话。
- 未实现点子放 `.claude/IDEA_BANK.md`。
- 可复发失败模式放 `.claude/agent-lessons.md`。
- 已实现事实放 `DEVDOC.md` / `ROADMAP.md`。

## 文档更新钩子

保持低 token：只更新必要文件，不把长对话写进长期文档。

| 事件 | 必更 | 条件更新 |
|------|------|----------|
| 内容进游戏 | `DEVDOC.md` | `README.md` 数量变化；`ROADMAP.md` 阶段变化；`wiki.html` 展示变化 |
| 新机制/边界变化 | `DEVDOC.md` | `ARCHITECTURE.md` / `DEVELOPMENT.md` |
| skill 改动 | 项目内 `.claude/skills/*/SKILL.md` | `AGENT_SYSTEM.md` / `DEVELOPMENT.md`；然后 `npm run skill:sync && npm run skill:check` |
| agent 模板改动 | `.claude/agents/*.md` | `AGENT_SYSTEM.md` 规则变化 |
| validator 改动 | `.claude/validate-agent-output.js` | `.claude/agent-lessons.md` 记录复发来源 |
| 点子未实现 | 无 | 用户明确收录才写 `.claude/IDEA_BANK.md` |
| agent 复盘 | 无 | 第二次复发才写 `.claude/agent-lessons.md` |

## 下一轮优先审计

- 把 `content_test.js` 的 summary 文本和实际测试块重新对齐。
- 将 `.claude/validate-agent-output.js` 扩展到“缺字段提示”，不仅做语法风格拦截。
- 给每次 agent 合并产出一份小型 changelog：新增 ID、标签、测试号、风险点。
