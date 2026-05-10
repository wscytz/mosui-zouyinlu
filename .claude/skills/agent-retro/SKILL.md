---
name: agent-retro
description: Use when 用户要复盘 agent 失败、validator 报错、返工修正、模板漂移、更新经验库、agent lessons、retro；不是实现游戏内容。
---

# Agent 复盘

## 原则

- 不参与正常内容实现，不派设计 agent。
- 默认不运行 `npm run ctx`，不读取完整 `game.js`。
- 默认只处理最近一次失败/返工；用户要求时才做多轮总结。
- 只提炼可复用规则，不写长篇聊天纪要。
- 成功且没有新经验时，不写文件。

## 输入

优先使用用户给出的原始材料：
- subagent 原始输出。
- validator 报错。
- 主 Claude 的修正摘要。
- 测试失败片段。
- “这次哪里错”的人工描述。

如果材料不足，先给一个简短判断，不要为了复盘去全项目搜索。

## 输出

先判断是否值得留存：

```md
RETRO DECISION
- record: yes/no
- reason: ...
- target: agent-lessons / agent-template / validator / no-file-change
```

如果只是第一次出现、且主 Claude 已能手修，可以只在聊天中说明，不写文件。

## 升级规则

- 第一次：主 Claude 手修，必要时口头记录。
- 第二次：写入 `.claude/agent-lessons.md`。
- 第三次：进入 `.claude/validate-agent-output.js` 或对应 `.claude/agents/*.md`。
- 已经被 validator 拦住的错误，只记录一次，不反复刷屏。

## agent-lessons 格式

写入 `.claude/agent-lessons.md` 时使用：

```md
## YYYY-MM-DD <agent-name>

### <短标题>
- symptom: <agent 做错了什么>
- impact: <为什么会造成返工或风险>
- fix: <主 Claude 应如何修>
- gate: <validator 检查项 / template rule / manual>
- status: observed / documented / gated
```

只记录会复发、可复用的经验。不要记录一次性的审美偏好或已经不存在的旧问题。

## 目标选择

| 情况 | 去哪里 |
|------|--------|
| 可正则拦截 | `.claude/validate-agent-output.js` |
| 模板缺示例或禁令 | `.claude/agents/<role>.md` |
| 流程问题 | `.claude/skills/add-content/SKILL.md` 和 `AGENT_SYSTEM.md` |
| 点子/玩法方向 | `.claude/IDEA_BANK.md`，不要进 lessons |
| 已实现版本事实 | `DEVDOC.md` / `ROADMAP.md` |

## 成本控制

- 不总结整段长对话，只提取最近失败模式。
- 每次最多新增 3 条 lesson。
- 每条 lesson 控制在 5 行以内。
- 如果需要改 validator 或模板，改完后运行相关轻量验证：

```bash
node --check .claude/validate-agent-output.js
npm run skill:check
```

只有改了 skill 源文件时，才运行：

```bash
npm run skill:sync
npm run skill:check
```

## 更新钩子

- 只在复发或可复用时写 `.claude/agent-lessons.md`。
- 可正则拦截的问题优先更新 `.claude/validate-agent-output.js`，再用轻量坏样本验证。
- 模板问题更新对应 `.claude/agents/*.md`，不要写进 skill。
- 流程问题才更新 `.claude/skills/*/SKILL.md`、`AGENT_SYSTEM.md` 或 `DEVELOPMENT.md`。
- 修改任一 skill 后必须运行 `npm run skill:sync` 和 `npm run skill:check`。
