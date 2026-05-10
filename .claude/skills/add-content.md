# 墨祟内容开发调度 (add-content)

## 触发条件

用户要求新增游戏内容时自动触发。识别关键词：
- 遗物/装备/道具 → relic-designer
- 敌人/怪物/boss → enemy-designer
- 成就/誓印/诅咒 → content-writer
- 审计/检查/标签覆盖 → balance-auditor
- "加几个"/"补几个"/"填冷标签" → 可能需要多个 agent

## 调度流程

### Step 1: 解析需求

从用户消息中提取：
- 内容类型（遗物/敌人/成就/誓印/审计）
- 数量
- 特殊要求（填冷标签、指定tag组合等）

如果用户没指定细节，参考 balance-auditor 的最新报告决定填什么。

### Step 2: 读取 agent 定义

根据内容类型读取对应文件：
- `.claude/agents/relic-designer.md`
- `.claude/agents/enemy-designer.md`
- `.claude/agents/content-writer.md`
- `.claude/agents/balance-auditor.md`

### Step 3: 派发 agent

**单类型**：spawn 1 个 agent，传入 agent 定义 + 用户需求。

**多类型并发**：如用户要"加个遗物和个敌人"，spawn 2 个 agent **并行**（同一消息多个 Agent 调用）。

Agent prompt 模板：
```
你是墨祟：走阴录的[角色名]。

以下是你的规则和模板：
[agent文件完整内容]

用户需求：[用户的具体要求]

请按输出格式要求产出代码块。确保通过质量自检清单。
```

**重要**：agent 用 `subagent_type: "general-purpose"`，不要用 worktree（因为 agent 不改文件，只输出代码）。

### Step 4: 合并产出

Agent 返回代码块后，逐个应用到源文件：

1. **先检查 agent 产出的自检清单**是否都通过
2. 按标注的插入位置，用 Edit/Write 工具合并到源文件
3. **特别注意行号可能偏移**——用代码内容定位而非行号

### Step 5: 测试

```
node --check game.js && node --check gamedata.js
node smoke_test.js && node wave_test.js && node content_test.js && node stress_test.js
```

如果测试失败：
- 分析错误信息
- 如果是 agent 产出的代码问题，修复并记录到 agent 模板的注意事项中
- 重新跑测试直到全绿

### Step 6: 文档同步

更新以下文件中的数字：
- `index.html` — 遗物数/敌人数/成就数
- `DEVDOC.md` — 新增版本记录
- `ROADMAP.md` — 更新当前版本状态

### Step 7: 提交推送同步

```bash
git add [改动的文件]
git commit -m "v__版本__: __改动摘要__"
cp game.js game.css gamedata.js www/
cp game.js game.css gamedata.js android/app/src/main/assets/public/
git push
```

### Step 8: 维护 agent 文档

如果合并过程中发现 agent 模板过时（行号偏移大、变量名不对、新增了必要步骤），**立刻更新对应的 agent 文件**，标注新版本号。

## 并发规则

- 同类型可以并发（2个遗物同时设计）→ 产出后顺序合并
- 不同类型可以并发（遗物+敌人）→ 产出后顺序合并（它们改不同区段）
- 合并时如果两个 agent 改了同一文件同一区段，后合并的需要重新定位插入点

## 冷标签优先

当用户说"填冷标签"/"随便加几个"时，按以下优先级选标签组合：

### 遗物冷标签（v4.24 基线）
| 标签 | 遗物数 |
|------|--------|
| 分裂 | 3 |
| 防御 | 4 |
| 诅咒 | 4 |
| 反击 | 4 |
| 爆炸 | 4 |
| 治疗 | 4 |
| 溅射 | 4 |
| 持续 | 4 |
| 生命 | 4 |
| 爆发 | 5 |

优先填 ≤4 的标签，组合选两个冷标签配对。

### 敌人 tier 缺口
查看 WAVE_TIERS 中各 tier 的敌人数量，tier 2-3 优先扩充。

## 版本号规则

每次内容添加递增版本号：v4.25, v4.26, ...
提交消息格式：`v__版本__: __内容摘要__`

## 注意事项

- Agent 产出可能有小错误（行号偏移、遗漏字段），合并时要仔细核对
- 如果 agent 产出的代码块不完整，不要凑合，要求 agent 补充
- 每次合并后都跑全量测试，不要跳过
- 测试数必须递增，content_test 总数要更新
- agent 文件末尾的版本号是维护的关键信号——过时了就更新
