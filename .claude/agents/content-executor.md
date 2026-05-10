# content-executor — 方案 B1 内容 executor 模板

**状态**: 实验性。默认走方案 A（add-content），只在用户明确说 "用 executor" / "让 agent 自跑" / "方案 B" 时启用。

**Agent 类型**: `general-purpose`（需要 Bash/Edit/Read）。不是专职 designer。

## 主 Claude 派发前的准备

1. 创建 worktree: `npm run wt:create -- <task-id>`
2. 预分配 id 和字段名（避免并发冲突）
3. 跑 `npm run ctx` 拿到下一个测试号、冷标签、现有 RELICS id
4. Read 一次 schema 和 icon-templates，把关键片段嵌入 prompt（executor 自己也会读，但主 Claude 嵌一份省它往返）

## Executor prompt 模板

把下面的模板填空后派给 `general-purpose` agent：

```md
你是墨祟：走阴录的内容 executor（方案 B1）。

工作目录（你必须 cd 进去）：{WORKTREE_PATH}
任务：实现遗物 <{ID}>，name="{NAME}"，tags={TAGS}，机制="{EFFECT}"
字段预分配（不要改）：
  - 主字段：{FIELD_NAME}
  - 类型：bool
  - 默认：false
测试号（预分配，只用这个）：{TEST_ID}

=== 必读参考（你要 Read） ===
- .claude/content-spec/relic.schema.md       — 遗物字段约定
- .claude/content-spec/icon-templates.md      — CSS 图标模板
- .claude/skills/add-content/SKILL.md         — 流程和硬禁令（特别看"硬禁令"和"代码模板"）

=== 流程（严格顺序，不要跳步）===

1. Read schema 和 icon-templates，决定 icon.template 和配色
2. Read gamedata.js 末尾部分（找 RELICS 数组结束），Edit 插入新遗物条目
3. Read game.js 找 mkPlayer 末尾 `idleT:0}` 和 ck 数组末尾 `];`，Edit 插入字段
4. Read game.js 找对应触发点（hitE/hurtP/onEnemyKilled 等），Edit 插入机制代码
5. Read game.css 找已有最后一个 `.relic-pick[data-icon=...]`，Edit 在后面插入两行（::before + ::after）
6. Read content_test.js 找最后一个 `'}catch(e){errors.push("{上一号}: "...`，Edit 在它后面插入新测试块（字符串数组 + try/errors.push 格式，用测试号 {TEST_ID}）
7. 更新 content_test.js 里 `ALL N TESTS PASSED` 的 N（+1）和底部 console.log 列表

8. Bash: `node smoke_test.js 2>&1 | tail -3`
   - 期望看到 "ALL N PASSED"
   - 失败：读 error，修改代码，再跑一次。最多重试 2 次
9. Bash: `node content_test.js 2>&1 | tail -3`
   - 期望 ALL N TESTS PASSED
   - 失败同上

10. Bash: `git status --short` 列出改动
    - 应该只有 4 个文件：gamedata.js game.js game.css content_test.js

11. 写一个简短总结报告：
    - 改了什么（1-2 行）
    - 测试是否全绿
    - 如果卡住：具体 error，没改对的地方

=== 硬禁令 ===

（从 .claude/skills/add-content/SKILL.md 硬禁令节同步；任何一条违反都算失败）

- 不要 let/const/箭头/for...of/for...in
- 不要 g.xxx.push（除非是项目助手函数 pushLimited/pushAttack）
- 不要直接 e.hp -=，用 damageEnemy(g,e,dmg,src)
- 不要 assert/test/it/describe/expect
- content_test 必须字符串数组 + try/errors.push 格式
- CSS 必须 `.relic-pick[data-icon="ID"] .ink-icon::before` 和 `::after`（注意 `.ink-icon` 不可省），只用 var(--ink/accent/paper/game-bg)
- 禁 position/box-shadow/inset/opacity/top/left/right/bottom/hex/rgb/rgba/hsl
- spawnP 第 4 参数只能是 ink/accent/moss/fire/frost/gold/ash/soul（不要 paper/spirit/ghost）
- C.* 只能用项目已有键：ink/accent/moss/spirit/fire/ash/soft/boss/gold/frost/ghost/paper/edge/ivory/clear
- 遗物 fn 禁止 p._xxx=0 重置
- 不要 giveRelic/mkGame/spawnFloatText 等不存在函数
- 不要 g.enemies 手写循环或 forEach，用 forEachLiveEnemy(g,function(oe){...})
- 不要手算 dx*dx+dy*dy，用 dstSq(a,b)

=== 报告格式 ===

```
status: success | blocked
files: [gamedata.js, game.js, game.css, content_test.js]
tests:
  smoke: PASS
  content: PASS (N tests)
notes: <1-2 句备注>
blockers: <如果 blocked，列具体 error>
```

不要写长分析。不要改参考文件。不要提交 git。
```

## 主 Claude 在 executor 完成后

1. 读 executor 报告
2. `cd` 回主工作区，`npm run wt:finish -- <task-id>` 先产 patch 不 apply
3. 主 Claude 或用户过一遍 patch 内容
4. OK → `npm run wt:finish -- <task-id> -- --apply`
5. 在主工作区跑一次 `npm run test:all` 做最终确认
6. `git add` + commit

## 何时不要用 executor

- 机制创新（需要读 healToShield 等已有代码找复用点）——主 Claude 直接做更快
- 跨文件重构——executor 容易漂移
- 用户明确说 "稳一点"/"别派 agent 写代码"

## 已知限制

- general-purpose agent 的 Bash 可能有超时/权限提示，用户可能需要手动 allow
- executor 读 SKILL.md 会占掉一部分 context，派之前用户可以说 "你已经看过 skill"（让它相信主 Claude 的传达）
- 失败 2 次仍不绿时，executor 不应再试，直接报 blocked；主 Claude 接手
