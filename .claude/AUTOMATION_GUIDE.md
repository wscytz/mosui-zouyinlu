# 墨祟 Agent 自动化指南 v4.31

这份文档只讲自动化流水线。玩法设计、版本历史和长期路线分别看 `DEVELOPMENT.md`、`DEVDOC.md`、`ROADMAP.md`。

## 角色

| 名称 | 通用理解 | 项目职责 |
|------|----------|----------|
| skill | 说明书 | 判断走方案 A/B，规定 prompt、测试、同步和失败处理 |
| validator | 门卫 | 拦截 agent 原始输出里的风格、测试、CSS、API 漂移 |
| sequencer | 排队叫号机 | 高并发时唯一分配 `task_id` 和 `test_id` |
| executor | 代工位 | 只产 JSON block，不搜索、不改文件 |
| merger | 合并器 | 校验 JSON block，再统一写入主文件 |
| fixtures | 门卫演习 | 用好/坏样例确认 merger 规则真的生效 |
| audit | 巡检表 | 跨文件检查内容一致性，默认只报告不阻塞 |

## 默认路线

- 1-2 项内容：方案 A，专职 agent 输出代码块，主 Claude raw/merged validator 后手动合并。
- 3 项及以上：方案 B，`sequencer -> executor JSON block -> merge-content-blocks -> test:all`。
- 实验或隔离手修：用户明确说 worktree 时才走 worktree。

## 方案 B 命令流

```bash
npm run ctx
node .claude/sequencer.js reserve relic 4 --task-id-prefix=batch
node .claude/merge-content-blocks.js
node .claude/merge-content-blocks.js --write --commit
npm run fix:entities
node .claude/fix-test-count.js --write
npm run test:all
```

`merge-content-blocks.js` dry run 已经会检查：

- 批次内重复 `task_id` / `test_id` / relic id。
- `entry_js` 里的 `let`、`const`、箭头函数、`for...of`、`for...in`。
- 遗物 CSS 是否有 `.relic-pick[data-icon="ID"] .ink-icon::before` 和 `::after`。
- CSS 是否使用禁用属性、hex/rgb/hsl 色值、非白名单 `var(--*)`。
- `test_lines` 是否使用 `// Test N:` + `errors.push`，并禁止 `assert()`、`test()`、`expect()`。

## 自动化自检

只改 `.claude` 自动化脚本时优先跑：

```bash
npm run test:syntax
npm run test:block-fixtures
npm run test:automation
npm run audit:content
```

`audit:content` 默认 report-only。它发现 ERROR 也不会退出失败，适合跑批时当巡检清单。需要发布前强门禁时运行：

```bash
node .claude/audit-content-invariants.js --strict
```

当前审计会检查：遗物 CSS 图标、重复 id、content_test 编号和 summary、敌人 `ENEMY_COST` / `DEATH_COLOR` / `tip`、WAVE_TIERS 引用、RELIC_RULES 覆盖和冷标签。

## 失败处理

- agent 没给可用 JSON：`node .claude/sequencer.js release <task-id>`。
- dry run 失败：不要 `--write`，修 block 或 release。
- HTML entity 漂移：先 `npm run fix:entities`。
- 测试 summary 漂移：`node .claude/fix-test-count.js --write`。
- skill 改动：`npm run skill:sync && npm run skill:check`。
- push 失败：不回滚本地 commit，等网络恢复后再推。

## 低 token 规则

- 不把完整 changelog 塞进 skill。
- 不把长对话塞进 `IDEA_BANK` 或 `agent-lessons`。
- 失败第二次才写经验，第三次才进 validator/fixture。
- 版本事实放 `DEVDOC.md`，阶段方向放 `ROADMAP.md`，操作说明放本文件。
