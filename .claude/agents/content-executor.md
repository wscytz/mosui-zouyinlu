# content-executor — 方案 B1 内容 executor 模板

**状态**: 实验性。默认仍走方案 A（add-content）。只在用户明确说 "用 executor" / "让 agent 自跑" / "方案 B" 时启用。

目的：让 agent 自己在 worktree 里合并 + 自跑测试，把主 Claude 从合并成本中解放出来。稳定性未超过方案 A；一旦出 blocker，回 A。

**Agent 类型**: `general-purpose`（需要 Bash / Edit / Read）

## 主 Claude 派发前的准备

1. 创建 worktree: `npm run wt:create -- <task-id>`
2. 跑 `npm run ctx`，拿到下一个测试号 / 冷标签 / 现有 RELICS id
3. 预分配 id、field name、icon.template、icon.primary/secondary（所有漂移风险高的值都不让 executor 自选）
4. 派 executor，prompt 用下方模板

## Executor prompt 模板

```md
你是墨祟：走阴录内容 executor。只在下面指定的工作目录工作，不改主工作区，不 git add / git commit。

工作目录（cd 进去）：{WORKTREE_PATH}
任务：实现遗物 {ID}，name={NAME}，tags={TAGS}
机制：{EFFECT_DESC}
字段预分配：{FIELD_NAME}（bool，默认 false）
触发点：{TRIGGER_FN}，条件 {TRIGGER_COND}
触发动作代码片段（照抄）：
{ACTION_SNIPPET}
测试号（只用这个）：{TEST_ID}
icon 模板：{ICON_TEMPLATE}，primary={PRIMARY}，secondary={SECONDARY}

=== 流程（严格顺序）===

1. Read .claude/content-spec/icon-templates.md 找 {ICON_TEMPLATE} 段落
2. Edit gamedata.js：在 RELICS 最末遗物后加新条目（前一条末尾补逗号）
3. Edit game.js：
   - mkPlayer 末尾加 `{FIELD_NAME}:false,`（在 `idleT:0}` 之前）
   - ck 数组加 `'{FIELD_NAME}'`（在 `];` 之前）
   - 触发点函数里插入动作片段
4. Edit game.css：找最后一个 `.relic-pick[data-icon=...]` 规则，后面加 ::before + ::after（选择器必须带 `.ink-icon`）
5. Edit content_test.js：加 Test {TEST_ID} 块（字符串数组 + try/errors.push 格式），更新 `ALL N TESTS PASSED` 的 N，加 console.log 行
6. Bash: `node smoke_test.js 2>&1 | tail -3` 期望全绿
7. Bash: `node content_test.js 2>&1 | tail -3` 期望全绿
8. 失败最多重试 2 次，再不过就 blocked 报告停下

=== 硬禁令（违反任一就算失败）===

- 不要 let / const / 箭头 / for...of / for...in / HTML entity
- content_test 必须字符串数组 + try/errors.push，禁止对象式 {id, name, run}
- 不要 assert / test / it / describe / expect / ok / eq
- CSS 必须 `.relic-pick[data-icon="ID"] .ink-icon::before` 和 `::after`（`.ink-icon` 不可省）
- CSS 颜色只能 var(--ink) / var(--accent) / var(--paper)，禁 hex / rgb / rgba / hsl / position / box-shadow / inset / opacity / top / left / right / bottom
- spawnP 第 4 参数只能是 ink / accent / moss / fire / frost / gold / ash / soul
- damageEnemy(g,e,dmg,src) 修改 HP，不要 e.hp -=
- g 池用 pushLimited / pushAttack，不要 g.xxx.push 直接写
- forEachLiveEnemy(g, function(oe){...})，不要 g.enemies 手写循环或 g.enemies.forEach
- dstSq(a, b)，不要手算 dx*dx + dy*dy
- 遗物 fn 只做 true 或 (p.xxx||0)+N，禁止 p._xxx=0 重置
- C.* 只能用已有键：ink / accent / moss / spirit / fire / ash / soft / boss / gold / frost / ghost / paper / edge / ivory / clear

=== 报告格式 ===

status: success | blocked
files: git status --short 结果
tests: smoke / content 绿不绿
notes: 1-2 句
blockers: 若 blocked 写具体 error

报告完就停。
```

## 主 Claude 在 executor 完成后

1. 读报告，若 blocked → 接手手动修
2. success → `npm run wt:finish -- <task-id>`（先只产 patch）
3. 过一遍 patch 内容
4. OK → `npm run wt:finish -- <task-id> -- --apply`
5. 主工作区跑 `npm run test:all` 兜底
6. `git add` + commit

## 何时不要用 executor

- 机制创新（需读 healToShield 等已有代码找复用点）：主 Claude 直接做更快
- 跨文件重构：executor 容易漂移
- 用户明确说"稳一点"/"别派 agent 写代码"

## 已知限制

- general-purpose 的 Bash 可能有权限提示，用户可能需手动 allow
- executor 读 SKILL.md 浪费 context；派发前只给硬禁令摘要（上面已嵌入 prompt），不让它再往回读
- 失败 2 次仍不绿就停，不再试
