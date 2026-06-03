# 墨祟：走阴录 文档索引 v13.1

> 这份文档用于防止接手者读错入口。所有 Markdown 都按“当前事实源 / 当前规范 / 设计参考 / 历史归档”分类。

## 当前事实源

| 文件 | 用途 | 维护规则 |
|---|---|---|
| `PROJECT_INTRO.md` | 当前版本、路径、技术栈、内容数量、测试基线 | 数量或版本变化必须同步 |
| `README.md` | 玩家和开发者快速入口 | 保持短，不写长历史 |
| `DEVDOC.md` | 技术历史、版本记录、Bug 追踪 | 每个小版本追加记录 |

## 当前路线与规范

| 文件 | 用途 | 维护规则 |
|---|---|---|
| `ROADMAP.md` | 阶段路线，决定当前该做什么 | 每个阶段收口时更新 |
| `ITERATION_SYSTEM.md` | 可持续迭代机制，规定版本节奏、任务流、冻结/准入 | 每次改变开发节奏时更新 |
| `STRUCTURE_RULES.md` | 结构治理、代码、UI、性能、测试、协作硬规则 | 复发 bug 或新红线出现时更新 |
| `DEVELOPMENT.md` | 日常开发流程、测试命令、agent 合并规则 | 流程变化时更新 |
| `ARCHITECTURE.md` | 分层、关键函数、运行时不变量 | 架构边界变化时更新 |
| `COLLAB.md` | 给 Claude / Codex / agent 的任务与交付模板 | 协作方式变化时更新 |
| `MULTI_AGENT_PROTOCOL.md` | 多 agent 协作协议，规定身份、文件锁、任务板和合并规则 | 多工具协作规则变化时更新 |
| `AGENT_BOARD.md` | 当前 agent 任务白板 | 高频维护，只保留当前任务 |
| `AGENT_SYSTEM.md` | agent 自动化系统、validator、批量内容流程 | agent / skill / validator 变化时更新 |

## 当前设计参考

| 文件 | 用途 | 注意 |
|---|---|---|
| `ART_DIRECTION.md` | 水墨画风、色彩、字体、Canvas 视觉原则 | 风格仍有效，数量不作为事实源 |
| `ART_PROMPTS.md` | 生图提示词和早期图标 prompt | prompt 可复用，但资产缺口以 v13.2 图标管线为准 |
| `ASSET_MANIFEST.md` | 早期资产清单 | 是第一批资产清单，不代表当前完整缺口 |
| `BOSS_DESIGN.md` | Boss / 精英战早期设计原则 | 3 Boss 数据是历史，当前 Boss 数量看 `PROJECT_INTRO.md` |

## 历史归档

| 文件 | 用途 | 注意 |
|---|---|---|
| `.bugs-v3.0.md` | v3.0 代码审计记录 | 不作为当前 Bug 清单 |
| `TASKS.md` | v10.0 任务包 | 不作为当前任务来源 |
| `TASKS_V9.md` | v9.x 任务包 | 不作为当前任务来源 |
| `TASKS_V12.md` | v12.0 任务包 | 不作为当前任务来源 |
| `V5_PREP.md` | v5 开工交接 | 不作为当前任务来源 |

## 接手顺序

1. `PROJECT_INTRO.md`
2. `ROADMAP.md`
3. `ITERATION_SYSTEM.md`
4. `STRUCTURE_RULES.md`
5. `DEVELOPMENT.md`
6. `ARCHITECTURE.md`
7. `DEVDOC.md` 末尾
8. `COLLAB.md`
9. 多 agent 并行时读 `MULTI_AGENT_PROTOCOL.md` 和 `AGENT_BOARD.md`
10. 需要 agent 自动化时再读 `AGENT_SYSTEM.md`
11. 需要美术或图标时再读 `ART_DIRECTION.md` / `ART_PROMPTS.md` / `ASSET_MANIFEST.md`

## 判断规则

- 版本、数量、测试基线冲突时，以 `PROJECT_INTRO.md` 和脚本输出为准。
- 阶段方向冲突时，以 `ROADMAP.md` 为准。
- 版本节奏、冻结/准入和复盘机制冲突时，以 `ITERATION_SYSTEM.md` 为准。
- 代码红线冲突时，以 `STRUCTURE_RULES.md` 为准。
- 多 agent 分工、文件锁和当前任务冲突时，以 `MULTI_AGENT_PROTOCOL.md` 和 `AGENT_BOARD.md` 为准。
- 历史任务包只可参考过去做法，不可直接执行。
- `DEVDOC.md` 中的旧版本号属于历史记录，不需要改成当前版本。
