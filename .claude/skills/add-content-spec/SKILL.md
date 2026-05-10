---
name: add-content-spec
description: 墨祟：走阴录结构化 spec 内容开发（实验性）。agent 只输出 JSON spec，主 Claude/脚本按模板生成代码。当前只支持遗物。触发词：用 spec 加遗物、spec pipeline、结构化内容、生成 relic spec、add-content-spec。不抢 add-content 默认触发，用户必须明确提到 "spec" 或 "结构化" 才走这套。
---

# add-content-spec — 结构化 spec 内容开发（实验性）

## 状态

```text
pipeline: spec
status: experimental
scope: relic-only
```

和 `add-content` 并存。默认 "加遗物" 仍走 `add-content`。只有用户明确说 "用 spec"/"结构化"/"spec pipeline" 才走这套。

## 核心差异 vs add-content

| 维度 | add-content | add-content-spec |
|------|-------------|------------------|
| agent 输出 | 6 个代码块 | 一个 JSON spec |
| 决定 CSS 选择器 | agent 自由写 | 模板决定 |
| 决定测试格式 | agent 自由写 | 模板决定 |
| 决定机制代码结构 | agent 自由写 | 模板决定 |
| 主 Claude 合并 | 大量手修 | 只替换占位 |
| validator 层数 | 1 层（代码块） | 2 层（spec + 代码块） |

目标：让 agent 只做**设计**（选 trigger、填参数、选 icon 模板），不做**落地**。

## 工作流程

### 1. 解析需求 + 提取上下文

和 `add-content` 一样：

```bash
npm run ctx
```

当前只支持遗物。如果用户要敌人/成就/誓印，退回 `add-content` skill。

### 2. 读 schema 和模板

必读：

- `.claude/content-spec/relic.schema.md` — spec 字段
- `.claude/content-spec/icon-templates.md` — 可用图标
- `.claude/content-spec/relic-examples.md` — spec 示例

主 Claude 把 schema 和 examples 的关键片段放进 agent prompt。

### 3. 构造 agent prompt

prompt 必须说明：

- 只输出一个 JSON 代码块
- 不输出任何 JS/CSS/测试代码
- 字段必须在 schema 枚举内

模板：

```md
你是墨祟：走阴录的遗物 spec 设计专员。只输出 JSON spec，不输出任何代码。

需求：[用户要求]

=== Context Pack ===
[冷标签组合、现有 RELICS ID、相关字段]

=== Schema ===
[relic.schema.md 关键片段]

=== Icon Templates ===
[icon-templates.md 可选值]

=== Examples ===
[relic-examples.md 1-2 个示例]

=== 输出 ===
一个 JSON 代码块，字段齐全，符合 schema。不输出代码块以外的解释（设计说明可以放 JSON 里的 comment 字段里，schema 允许）。
```

### 4. 保存 agent 输出

把 agent 返回的 JSON 抠出来，保存到：

```text
.claude/tmp/relic-<id>.spec.json
```

### 5. 校验 spec

```bash
node .claude/content-spec/validate-relic-spec.js .claude/tmp/relic-<id>.spec.json
```

不通过：主 Claude 修 spec，再跑一次。不得跳过。

### 6. 生成代码块

**v0（当前）**：主 Claude 按 schema + icon-templates 手工生成代码块到 `.claude/tmp/relic-<id>.blocks.md`。模板是 deterministic 的——同样 spec 产出同样代码。

**v1（未来）**：

```bash
node .claude/content-spec/generate-relic-from-spec.js .claude/tmp/relic-<id>.spec.json > .claude/tmp/relic-<id>.blocks.md
```

### 7. 校验最终代码

```bash
node .claude/validate-agent-output.js .claude/tmp/relic-<id>.blocks.md
```

替换 `TEST_ID_PLACEHOLDER`，再跑 `--mode merged`。两道都必须 PASS，不得跳过。

### 8. 合并 + 测试 + 提交

和 `add-content` 一样。

## 硬约束

- agent 输出里禁止夹带任何 JS/CSS 代码块
- spec 不校验通过不进入代码生成
- 代码生成完必须跑 `validate-agent-output.js`
- 产物只放 `.claude/tmp/`
- 不修改 `add-content` skill 或它的流程

## 维护

- schema 字段变了：改 `relic.schema.md` 和 `validate-relic-spec.js`
- 新增 trigger / effect_template：先写 schema，再在 icon-templates 或模板库里落地
- 首次失败模式：记到 `.claude/agent-lessons.md`

## skill 同步

本 skill 是新创建的，生效前必须：

```bash
npm run skill:sync
npm run skill:check
```

## 决策：当请求到来

```text
用户说 "加个遗物"              -> add-content
用户说 "用 spec 加遗物"        -> add-content-spec
用户说 "结构化 relic"          -> add-content-spec
用户说 "填冷标签" 没提 spec    -> add-content（默认）
```
