---
name: add-content
description: Use when 用户请求为《墨祟：走阴录》新增、设计、审核游戏内容，例如遗物、敌人、成就、誓印、冷标签补全、内容平衡、relic、enemy、achievement、curse。
---

# 墨祟内容开发调度

## 触发条件

用户说“加个遗物”“新敌人”“加成就”“新誓印”“填冷标签”“审计平衡”“加点内容”等内容开发请求时触发。

## 路线选择

**默认走方案 A**。任何其他路线需要用户明确关键词触发。

| 场景 | 路线 | 触发条件 |
|------|------|---------|
| 单项内容（默认） | **A**：设计 agent 输出代码块 + 主 Claude 合并 | 默认 |
| 批量/高并发内容 | **B**：sequencer + JSON block + merger | 用户要 3 项及以上、批量生产、自由分配并发 |
| 隔离手修/实验 | **A + worktree 隔离** | 用户显式说 "用 worktree" 或需要隔离失败任务 |
| 实验性：spec 结构化 | **add-content-spec** skill | 用户显式说 "用 spec"/"结构化" |

走错路线的成本比走保守路线的成本高得多。模糊需求默认 A。

## 核心原则

- 主 Claude 是唯一合并者；专职 agent 只输出代码块，不搜索代码，不修改文件。
- 先取上下文，再派发；先校验输出，再合并；先测试全绿，再提交。
- agent 永远使用 `TEST_ID_PLACEHOLDER`，测试编号只由主 Claude 串行替换。
- 批量/高并发时，测试号和 task-id 只能来自 `.claude/sequencer.js`；禁止按 `npm run ctx` 手算下一个编号。
- 用户未指定数量时默认只做 1 个；额外创意只能放建议区，不输出代码块。
- 同一种错误：第一次主 Claude 修，第二次补 agent 模板，第三次补 validator 或测试。

## 真实工具名（不要脑补）

只使用下面真实存在的工具名：

```bash
node .claude/sequencer.js reserve <type> <count> [--task-id-prefix=<prefix>]
node .claude/sequencer.js list
node .claude/sequencer.js commit <task-id>
node .claude/sequencer.js release <task-id>
node .claude/merge-content-blocks.js
node .claude/merge-content-blocks.js --write --commit
node .claude/fix-test-count.js
node .claude/fix-test-count.js --write
npm run test:block-fixtures
npm run test:automation
npm run audit:content
```

不存在这些命令：`sequence-manager.js`、`content-merger.js`、`sequencer check`、`npm run seq:*`、`generate-relic-from-spec.js`。

## 工作流程

### 1. 解析需求 + 提取上下文

识别内容类型：遗物 / 敌人 / 成就 / 誓印 / 审计。然后运行：

```bash
npm run ctx
```

把输出保存为 `CTX`。这是 agent 的主要事实来源。如果 `CTX` 缺少本次任务必要信息，由主 Claude 补充最小必要片段；agent 仍然不自行搜索代码库。

### 2. 读取 agent 模板

| 类型 | Agent文件 |
|------|----------|
| 遗物 | `.claude/agents/relic-designer.md` |
| 敌人 | `.claude/agents/enemy-designer.md` |
| 成就/誓印 | `.claude/agents/content-writer.md` |
| 审计 | `.claude/agents/balance-auditor.md` |

同时参考项目规则入口：

- `AGENT_SYSTEM.md`
- `DEVELOPMENT.md`
- `.claude/validate-agent-output.js`

### 3. 构造裁剪后的 context pack

不要把完整 `CTX` 无脑塞给每个 agent。所有 agent 都给公共包，再按类型追加。

**公共包：**
- 用户需求，1-2句。
- 当前已有 ID 列表中与任务相关的部分。
- 测试编号规则：只能用 `TEST_ID_PLACEHOLDER`。
- 输出数量限制：未指定数量则 1 个。
- validator 硬禁令摘要。
- 对应 agent 模板中的输出格式、代码模板、自检清单。

**遗物 agent 追加：**
- 冷标签 / 空缺冷组合。
- `BUILD_PREFS`。
- `RELIC_RULES` 已有专属权重。
- `PREREQS`。
- `mkPlayer` 末尾、`ck` 数组末尾。
- CSS 图标已有 ID。
- 相关触发点模板：`hitE/hurtP/pAtk/onEnemyKilled/damageEnemy`。

**敌人 agent 追加：**
- `ETYPE` 已有 ID。
- 敌人行为字段列表。
- `WAVE_TIERS`。
- `ENEMY_COST`。
- `DEATH_COLOR`。
- spawn 测试模板。

**成就/誓印 agent 追加：**
- `ACHIEVEMENTS` / `CURSES` 已有 ID。
- `newGame` 计数器。
- `metaRecordRun` 尾部。
- `rebuildPlayerStats` 相关片段。
- 成就数量断言和 content_test 模板。
- `关键函数签名`，避免主 Claude 或 agent 猜错 `hurtP(g,dmg,src)` 等实参。

**审计 agent：**
- 可以给完整 `CTX`。
- 只输出审计结果和下一轮建议，不直接输出改代码块，除非用户明确要求修。

### 4. 派发 agent

Agent prompt 模板：

```md
你是墨祟：走阴录的[角色]。不要搜索代码，不要调用工具，不要修改文件，只输出 CHANGESET 和代码块。

需求：[用户要求]

=== Context Pack（主 Claude 已裁剪，直接用）===
[按 agent 类型裁剪后的 CTX]

=== 代码模板 ===
[对应 agent 文件中的模板]

=== 输出格式 ===
先输出 CHANGESET，再输出 N 个代码块。每个代码块标注：文件名 + 精确插入位置（用相邻代码定位）。

CHANGESET:
- type: relic/enemy/achievement/curse/audit
- count: N
- ids: ...
- touches: ...
- needs: RANGES/PREREQS/RELIC_RULES/none

=== 硬禁令 ===
- 不要使用 let/const/箭头函数/for...of/for...in。
- 不要使用 HTML entity，例如 >= 不写 &gt;=。
- 不要直接 g.xxx.push，不要 pushLimited(g.attacks,...)。
- 不要直接 e.hp -=，用 damageEnemy(g,e,dmg,src)。
- 不要使用 content_test()/test()/assert()/expect() 等测试框架函数。
- content_test 必须沿用字符串数组 + try/errors.push 格式，禁止自建 `var content_test=[...]` 测试数组。
- CSS 图标禁止 content/position/box-shadow/inset/opacity/top/left/right/bottom/hex/rgb()/rgba()/hsl() 色值。
- CSS 变量只允许 var(--ink) / var(--accent) / var(--paper) / var(--game-bg)，不要编造 var(--moss)/var(--fire)/var(--gold)。
- 新遗物必须输出 game.css 的 `.relic-pick[data-icon="ID"]` 图标块，不能说“无需新增”。
- CSS 选择器必须是 `.relic-pick[data-icon="ID"] .ink-icon::before` 和 `.relic-pick[data-icon="ID"] .ink-icon::after`，不要漏 `.ink-icon`，不要写 `.ink-icon ::before`。
- 颜色常量只能使用项目已有 `C.*`；不要编造 `C.purple` 等新键。
- 机制代码禁止 arguments[0]，使用已有实参名。
- 遗物 fn 禁止 p._xxx=0 重置运行时累加器，只做 true 或 (p.xxx||0)+N。
- 不要用 giveRelic()/mkGame()/spawnFloatText() 等不存在或错误函数。
- 不要用 g.enemies 手写循环，使用 forEachLiveEnemy(g,function(oe){...})。
- 不要手算 dx*dx+dy*dy，使用 dstSq(a,b)。
- 测试编号必须用 TEST_ID_PLACEHOLDER，不要写具体编号，不要用 __N__。

=== 质量自检 ===
[对应 agent 文件中的自检清单]
```

并发规则：1-2 项默认走方案 A。3 项及以上默认走方案 B（sequencer + block merger），不要让多个 agent 同时改 `content_test.js` / `gamedata.js` 末尾。

### 方案 B：高并发 block merger（3 项及以上默认）

这是当前高并发主线。agent 不改源文件，只输出 JSON block；主 Claude 保存 block，再统一 merge。

1. 先 reserve 序列资源：

```bash
node .claude/sequencer.js reserve relic 4 --task-id-prefix=batch6
```

2. 把返回的 `task_id` / `test_id` / `lease_file` 分配给每个 agent。
3. 派 `.claude/agents/content-executor.md`，要求只输出一个 JSON block，不输出 JS/CSS 代码块，不 Edit 文件。
   - 高并发生产 prompt 不允许压缩成自然语言摘要。
   - 必须粘贴 `content-executor.md` 里的完整 JSON block 模板和完整字段示例。
   - 不要把模板改成“参考格式/字段类似/略”；缩短模板会导致 RELICS、CSS、content_test、ck、API 字段漂移。
4. 主 Claude 把每个 JSON 保存为：

```text
.claude/tmp/content-blocks/<task-id>.json
```

5. 先 dry run 看合并计划：

```bash
node .claude/merge-content-blocks.js
```

dry run 会先过共享门禁 `.claude/content-block-rules.js`，会拦截：
- 批次内重复 `task_id` / `test_id` / relic id。
- `entry_js` 使用 let/const/箭头函数/for...of/for...in。
- 遗物 CSS 缺 `.relic-pick[data-icon="ID"] .ink-icon::before` 或 `::after`。
- CSS 使用禁用属性、hex/rgb/hsl 色值、非白名单 `var(--*)`。
- `test_lines` 缺 `// Test N:`、缺 `errors.push`，或使用 assert/test/expect 测试框架。

6. 计划正确再写入并提交 lease：

```bash
node .claude/merge-content-blocks.js --write --commit
node .claude/fix-test-count.js
npm run fix:entities
npm run test:all
```

失败处理：
- agent 没产出可用 JSON：`node .claude/sequencer.js release <task-id>`。
- merger dry run 失败：不写入主文件，修 block 或 release 对应 lease。
- `fix-test-count.js` 报 summary 不一致：先 `node .claude/fix-test-count.js --write`，再跑 `npm run test:all`。
- 如果改了 merger/rules/fixture：追加 `npm run test:block-fixtures` 和 `npm run test:automation`。
- 批量内容结束后可跑 `npm run audit:content` 看一致性缺口；它默认只报告，不阻塞生产。

### worktree 隔离（只在用户明确要求或隔离手修时用）

每个 agent 任务分配独立 git worktree，互不干扰；任一失败不影响其他。

闭环：
1. `npm run wt:create -- <task-id>`（创建 `.claude/worktrees/<task-id>/` + 分支 `tmp/add-content/<task-id>`）
2. 主 Claude 把 agent 产出合并到 worktree，`cd` 进去跑 `validate:agent` + `test:all`
3. `npm run wt:finish -- <task-id>`（只产 patch 到 `.claude/patches/<task-id>.patch`，**先审再合**）
4. 审 patch 内容 OK → `npm run wt:finish -- <task-id> -- --apply`；出问题 → `--abort` 丢弃
5. 主区 `npm run test:all` 兜底
6. 所有任务完成后 `npm run wt:cleanup`

硬约束：
- patch 冲突或 apply 失败 → 保留 worktree，主 Claude 手动合并；**不得**自动 apply 失败内容
- apply 顺序**串行**（一个接一个），不能并发 apply 同一文件
- task-id: `[a-z0-9_-]{1,31}`；worktrees/ 和 patches/ 都被 .gitignore 挡住

### 实验路线（不是默认，用户显式触发）

- **block writer**：见 `.claude/agents/content-executor.md`。agent 只产 JSON block，主 Claude 用 `merge-content-blocks.js` 统一合并。
- **add-content-spec**：agent 输出 JSON spec，主 Claude/生成器按 schema 产代码。见 `add-content-spec` skill。

spec 仍是实验路线；用户没明确说 spec 时不要走。

### 5. 校验和合并产出

收到代码块后：

1. 检查 `CHANGESET` 是否和用户要求一致，特别是数量是否过量。
2. 将原始产出保存为 `.claude/tmp-agent-output.md`。
3. **自动修正 HTML entity**（agent 输出通道固有 bug）：

```bash
node .claude/fix-html-entities.js --write .claude/tmp-agent-output.md
```

4. 运行：

```bash
node .claude/validate-agent-output.js .claude/tmp-agent-output.md
```

4. 不通过则拒收或由主 Claude 修正后重跑 validator；不得跳过 raw validator。
5. 单项内容可根据当前最高 Test 编号替换 `TEST_ID_PLACEHOLDER`；批量/并发内容必须使用 `sequencer.js reserve` 分配的 `test_id`。
6. 保存替换后的产出为 `.claude/tmp-agent-output.merged.md`。
7. 运行：

```bash
node .claude/validate-agent-output.js --mode merged .claude/tmp-agent-output.merged.md
```

8. 用相邻代码内容定位插入，不依赖旧行号；不得跳过 merged validator。

### 6. 测试

合并后先兜底 HTML entity（任何通道漏进来都修）：

```bash
npm run fix:entities
```

然后跑全量：

```bash
npm run test:all
```

不绿就修，修到绿为止。测试失败不能提交。

### 7. 同步 + 提交 + 推送

需要同步网页/APK资源时，优先使用项目脚本：

```bash
npm run www
```

需要 Capacitor 同步时运行：

```bash
npm run cap:sync
```

测试全绿后再提交：

```bash
git add [改动文件]
git commit -m "vX.Y: [摘要]"
git push
```

推送失败处理：

- `git commit` 成功即视为本地交付完成。
- `git push` 失败通常是网络问题，不回滚、不反复重试、不阻塞本地流程。
- 告知用户：本地 commit 已保留，待网络恢复后下次一起推送。

### 8. 维护 agent 文档和门禁

如果发现 agent 模板过时或出现新失败模式：

- 字段名/插入点错：更新 `.claude/agents/` 对应模板。
- 可正则拦截的问题：更新 `.claude/validate-agent-output.js`。
- 流程问题：先更新项目内 `.claude/skills/add-content/SKILL.md`，再同步到全局 skill，并更新 `AGENT_SYSTEM.md`。
- 版本号和路线变化：更新 `DEVDOC.md` / `ROADMAP.md`。

## 更新钩子

只更新必要文件，避免文档和 token 膨胀。

| 触发 | 必更 | 条件更新 |
|------|------|----------|
| 新遗物/敌人/誓印/成就进入游戏 | `DEVDOC.md` | `README.md` 数量变化；`ROADMAP.md` 阶段变化；`wiki.html` 展示变化 |
| 新机制/新运行时字段 | `DEVDOC.md` | `ARCHITECTURE.md` 边界变化；`DEVELOPMENT.md` 新不变量 |
| agent 模板改变 | 对应 `.claude/agents/*.md` | `AGENT_SYSTEM.md` 规则变化 |
| validator 新门禁 | `.claude/validate-agent-output.js` | `AGENT_SYSTEM.md` 门禁类别变化；`agent-lessons.md` 记录复发来源 |
| skill 改变 | `.claude/skills/*/SKILL.md` | `AGENT_SYSTEM.md`/`DEVELOPMENT.md` 流程变化；必须 `npm run skill:sync && npm run skill:check` |
| 未实现点子 | 无 | 用户明确“收进点子库”才写 `.claude/IDEA_BANK.md` |
| agent 失败复盘 | 无 | 第二次复发才写 `.claude/agent-lessons.md` |

低 token 规则：
- 不把完整 changelog 写进 skill。
- 不把长对话写进 `IDEA_BANK` 或 `agent-lessons`。
- `DEVDOC.md` 每版本只写目标、改动、测试、未解决。
- `README.md` 只在玩家可见数量、启动方式、测试命令变化时更新。
- `ROADMAP.md` 只在阶段状态或下一步方向变化时更新。
- `ARCHITECTURE.md` 只在层级、入口、不变量变化时更新。

## Skill 本体维护

- 项目内 `.claude/skills/add-content/SKILL.md` 是可提交、可回滚的源文件。
- 全局 `~/.claude/skills/add-content/SKILL.md` 是 Claude 实际加载的安装副本。
- 修改 skill 时先改项目内源文件，确认无误后运行 `npm run skill:sync` 同步到全局。
- 同步脚本会先备份全局副本，再覆盖，避免改坏后无法回滚。
- 不要只改全局副本；否则项目 git 无法记录 skill 变化。
- 如果自动流程改了任何 `.claude/skills/**/SKILL.md`，结束前必须运行 `npm run skill:sync` 和 `npm run skill:check`，并在回复里报告结果。

## 冷标签优先

默认选择数量较少的冷标签组合。空缺冷+冷组合优先，但不能为了补标签破坏机制清晰度。
