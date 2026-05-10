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

## 下一轮优先审计

- 把 `content_test.js` 的 summary 文本和实际测试块重新对齐。
- 将 `.claude/validate-agent-output.js` 扩展到“缺字段提示”，不仅做语法风格拦截。
- 给每次 agent 合并产出一份小型 changelog：新增 ID、标签、测试号、风险点。
