---
name: idea-lab
description: 墨祟：走阴录点子实验室。用于找创新点、审核玩法点子、比较候选概念、把未实现点子收进 IDEA_BANK。触发词：找点子、创新点、审核点子、这个想法怎么样、下一轮方向、收进点子库、idea、concept。只做概念评审和点子沉淀，不写游戏代码，不跑实现 agent。
---

# 墨祟点子实验室

## 原则

- 不写代码，不输出实现代码块，不修改游戏文件。
- 默认不运行 `npm run test:all`。
- 默认不读取完整 `game.js`。
- 只在用户明确要“找点子/审核点子/收进点子库”时使用；普通“加内容”走 add-content。
- 审核单个点子时不需要完整 `npm run ctx`；找方向时可运行 `npm run ctx` 并只摘冷标签、内容数量、行为字段。
- 未实现点子只写入 `.claude/IDEA_BANK.md`，不要写入 skill 本体。

## 模式选择

| 用户意图 | 模式 | 文件改动 |
|----------|------|----------|
| “这个点子怎么样/审核点子” | review | 默认无 |
| “找几个创新点/下一轮方向” | scout | 默认无 |
| “收进点子库/记一下这个点子” | bank | 更新 `.claude/IDEA_BANK.md` |

## Review 模式

输入通常是用户一句灵感。输出固定：

```md
IDEA REVIEW

点子：<名称或一句话>
一句话：<把点子压成可执行概念>

结论：保留 / 修改后保留 / 暂缓 / 放弃

评分：
- 新决策：1-5
- 墨祟风味：1-5
- 现有机制契合：1-5
- 代价清晰度：1-5
- 测试清晰度：1-5
- 实现范围：1-5

为什么可能好玩：
- <最多3条>

主要风险：
- <最多3条>

建议改法：
- <最多3条>

适合落地为：
- 遗物 / 敌人 / 誓印 / 成就 / 组合线

可测试点：
- <2-4条>

推荐下一步：
- 进入 IDEA_BANK candidate / 进入 add-content 实现 / 暂缓
```

评审重点：
- 玩家多了什么新决策。
- 它连接了哪些已有机制。
- 是否有明确代价，避免纯数值加成。
- 是否符合走阴、墨、纸、魂、债、灯、镜、碑、香、骨等风味。
- 是否能被 `content_test.js` 清楚验证。
- 是否适合专职 agent 一次实现。

## Scout 模式

找 3 个候选，用户明确要求更多时最多 5 个。不要写代码。

先从以下来源找张力：
- 冷标签组合：如 治疗+爆炸、分裂+防御。
- 已有机制反转：火/冰/召唤/魂/墨灵的非直觉用途。
- 风险资源化：受伤、低血、致盲、静止、移动、诅咒变成可管理资源。
- 敌人新决策：先杀、隔离、引爆、借力、绕开。
- 成就反推构筑：先设计挑战，再补支持内容。
- 水墨志怪风味：名字和行为能一句话记住。

输出格式：

```md
CONCEPTS

1. <名称>
- type: relic/enemy/curse/achievement/line
- tags: ...
- player decision: ...
- connects: ...
- risk/cost: ...
- testable: ...
- complexity: low/medium/high
- agent-ready: yes/no
- why now: ...

推荐实现：第 X 个
理由：<1-2句>
```

选择标准：优先 novelty、fit、testability 高，scope 不低于 medium，且不需要重写核心循环。

## Bank 模式

只有用户明确说“收进点子库/记一下”才更新 `.claude/IDEA_BANK.md`。

条目格式：

```md
### <点子名>
- status: candidate/parked/rejected/implemented
- type: relic/enemy/curse/achievement/line
- core tension: ...
- best form: ...
- risk: ...
- testable: ...
- source: user/scout/review
- updated: YYYY-MM-DD
```

规则：
- 未实现但可用：`candidate`。
- 好但现在太大：`parked`。
- 明确不要：`rejected`，写一句 reason。
- 已进游戏：`implemented`，并在条目中引用版本。
- 不把长聊天粘进去，只存可复用摘要。

## 更新钩子

- review/scout 默认不改文件。
- 只有用户明确“收进点子库”才更新 `.claude/IDEA_BANK.md`。
- 点子被实现后，由 add-content 更新 `DEVDOC.md` / `ROADMAP.md`；idea-lab 不重复写版本历史。
- 修改本 skill 时运行 `npm run skill:sync` 和 `npm run skill:check`。
