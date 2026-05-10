---
name: add-content
description: 墨祟：走阴录内容开发调度。当用户要求新增/设计/补充遗物、敌人、成就、誓印，或审计冷标签/内容平衡时触发。自动提取上下文、裁剪上下文包、派发专职agent、校验产出、合并代码、跑测试、提交。关键词：加遗物、新遗物、设计遗物、新敌人、怪物、小怪、Boss、加成就、新誓印、填冷标签、审计平衡、加点内容、relic、enemy、achievement、curse。
---

# 墨祟内容开发调度

## 触发条件

用户说“加个遗物”“新敌人”“加成就”“新誓印”“填冷标签”“审计平衡”“加点内容”等内容开发请求时触发。

## 核心原则

- 主 Claude 是唯一合并者；专职 agent 只输出代码块，不搜索代码，不修改文件。
- 先取上下文，再派发；先校验输出，再合并；先测试全绿，再提交。
- agent 永远使用 `TEST_ID_PLACEHOLDER`，测试编号只由主 Claude 串行替换。
- 用户未指定数量时默认只做 1 个；额外创意只能放建议区，不输出代码块。
- 同一种错误：第一次主 Claude 修，第二次补 agent 模板，第三次补 validator 或测试。

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

并发规则：默认最多 2 个 agent 并发。超过 2 个必须用户明确要求；否则拆成多轮串行。最稳配方是单 agent + 相关完整 context pack + raw/merged 双 validator。测试编号和合并永远由主 Claude 串行处理。

**worktree 隔离（可选，2 并发及以上推荐）**：

用户明确要 worktree、或者并发 ≥ 2 时启用。每个 agent 任务分配独立 git worktree，互不干扰；任一任务失败不影响其他任务。

```bash
# 主 Claude 在派 agent 前，为每个任务创建 worktree
npm run wt:create -- <task-id>        # 创建 .claude/worktrees/<task-id>/ + 分支 tmp/add-content/<task-id>

# agent 仍然只输出代码块（方案 A），主 Claude 把代码块合并到 worktree 里
# cd .claude/worktrees/<task-id> && 改文件 + validate + test:all

# 完成后产出 patch（可先只产出不应用，留人工确认）
npm run wt:finish -- <task-id>               # 只产 patch 到 .claude/patches/<task-id>.patch
npm run wt:finish -- <task-id> -- --apply    # 产 patch 并 git apply 到主分支 index
npm run wt:finish -- <task-id> -- --abort    # 直接丢弃

# 批量清理（任务组全部完成后）
npm run wt:cleanup
```

使用约束：
- worktree 目录在 `.claude/worktrees/`，被 `.gitignore` 挡住
- patch 文件在 `.claude/patches/`，同样 gitignore
- task-id 必须 `[a-z0-9_-]{1,31}`
- apply 是累加到 index（不自动 commit），主 Claude 最终统一 git commit 所有 worktree 的改动
- 失败 worktree 用 `--abort` 丢弃；**不得**用 `--apply` 合入部分失败的改动
- 合并冲突通常来自 mkPlayer/ck 字段行。主 Claude 预分配字段名，每个 worktree 负责不同 id/字段；apply 顺序串行（一个接一个）避免同一行多次修改导致 patch 失效

失败恢复：
- 如果 `finish --apply` 失败（patch 冲突、文件被其他任务改过），保留 worktree，主 Claude 读 patch 手动合并，再 `wt:cleanup` 清除
- 如果循环中断，`git worktree list` 查残留；`npm run wt:cleanup` 全清

### 5. 校验和合并产出

收到代码块后：

1. 检查 `CHANGESET` 是否和用户要求一致，特别是数量是否过量。
2. 将原始产出保存为 `.claude/tmp-agent-output.md`。
3. 运行：

```bash
node .claude/validate-agent-output.js .claude/tmp-agent-output.md
```

4. 不通过则拒收或由主 Claude 修正后重跑 validator；不得跳过 raw validator。
5. 根据 `npm run ctx` 的最高 Test 编号递增替换所有 `TEST_ID_PLACEHOLDER`。
6. 保存替换后的产出为 `.claude/tmp-agent-output.merged.md`。
7. 运行：

```bash
node .claude/validate-agent-output.js --mode merged .claude/tmp-agent-output.merged.md
```

8. 用相邻代码内容定位插入，不依赖旧行号；不得跳过 merged validator。

### 6. 测试

合并后运行：

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
