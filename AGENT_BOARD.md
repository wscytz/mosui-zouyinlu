# 墨祟：走阴录 Agent Board

> 当前施工白板，只记录正在做、准备做、刚完成的任务。不要把这里当历史档案；版本历史写 `DEVDOC.md`，规则写 `MULTI_AGENT_PROTOCOL.md` / `STRUCTURE_RULES.md`。

## 使用规则

- 开工前必须登记。
- 完成后只保留到下一阶段收口。
- 冲突以锁定文件和锁定区域为准，不以工具名为准。
- 未登记任务不合并。

## Active

| Task ID | Owner | 身份 | 状态 | 允许修改 | 锁定区域 | 验收 |
|---|---|---|---|---|---|---|
| - | - | - | - | - | - | - |

## Pending

| Task ID | 建议 Owner | 身份 | 目标 | 允许修改 | 锁定区域 | 验收 |
|---|---|---|---|---|---|---|
| v13.1-docs-entry | Codex | 文档 | 收口入口文档和可持续迭代机制 | `*.md` | 文档入口 | 文档-only，确认未改运行代码 |

## Recently Done

| Task ID | Owner | 身份 | 结果 | 自测 | 后续 |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## Locks

| 区域 | 当前 Owner | 释放条件 |
|---|---|---|
| - | - | - |

## Notes

- 旧任务包 `TASKS.md`、`TASKS_V9.md`、`TASKS_V12.md`、`V5_PREP.md` 不作为当前任务来源。
- 多 agent 协作先看 `MULTI_AGENT_PROTOCOL.md`。
- 代码红线看 `STRUCTURE_RULES.md`。
