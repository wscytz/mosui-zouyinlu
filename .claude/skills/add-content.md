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

### Step 2: 构建上下文包（省 token 关键）

**不要让 agent 自己去搜索！** 主 Claude 用一次 bash 提取所有 agent 需要的上下文，打包进去。

```bash
# 一键提取所有 agent 需要的上下文
node -e "
eval(require('fs').readFileSync('gamedata.js','utf8'));
console.log('=== EXISTING_IDS ===');
console.log('RELICS:');RELICS.forEach(function(r){console.log(' '+r.id)});
console.log('ETYPE:');Object.keys(ETYPE).forEach(function(k){console.log(' '+k)});
console.log('ACHIEVEMENTS:');ACHIEVEMENTS.forEach(function(a){console.log(' '+a.id)});
console.log('CURSES:');CURSES.forEach(function(c){console.log(' '+c.id)});
console.log('=== COUNTS ===');
console.log('RELICS:'+RELICS.length+' ACH:'+ACHIEVEMENTS.length+' CURSES:'+CURSES.length+' ETYPE:'+Object.keys(ETYPE).length);
"
```

### Step 3: 读取精简 agent 定义

不用完整 agent 文件！读关键规则摘要即可：
- 输出块数量 + 格式
- mkPlayer/rebuildPlayerStats 当前最后几个字段（用 grep 获取）
- 禁止事项清单
- 质量自检清单

### Step 4: 派发 agent（高效版）

Agent prompt 结构：
```
[角色一句话] + [需求一句话]

=== 上下文（已提取，无需搜索）===
- 现有ID列表：[...]
- 当前最后mkPlayer字段：[...]
- 当前rebuildPlayerStats ck末尾：[...]
- 测试编号: N / 总数: M

=== 输出要求 ===
[N块代码，块名+插入位置标注]

不要修改任何文件，只输出代码块。不要搜索代码库。
```

- 单类型：1个 agent
- 多类型并发：N个 agent 同时派发
- agent 用 `subagent_type: "general-purpose"`，不用 worktree

**关键原则：agent 只设计+填空，不搜索。**

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
- **HTML实体问题**：agent 产出的 `>=` `<=` `>` `<` 可能被编码为 `&gt;=` `&lt;=` `&gt;` `&lt;`，合并时必须替换
- **agent 可能直接改文件**：有些 agent 会绕过"只输出代码块"的指令直接编辑文件，合并前先 `git diff` 检查
- **变量声明顺序**：agent 建议的插入点可能在变量声明之前（如 dmg 在 line 1019 才声明但 agent 建议在 line 1016 使用），合并时验证变量可用性
- **BUILD_PREFS 死标签**：定期运行 balance-auditor 检查，发现死标签及时补遗物标签或从 BUILD_PREFS 移除

## 调试记录

### v4.25 测试轮次发现的问题
1. **relic-designer**: 块3插入点在 `var dmg` 声明之前 → 已在 agent 文件中加 pAtk 插入点警告
2. **enemy-designer**: 测试代码含 HTML 实体 `&gt;=` → 已在 agent 文件中记录
3. **content-writer**: 直接改了源文件而非输出代码块 → 已在 agent 文件中加警告
4. **balance-auditor**: 发现 BUILD_PREFS "攻速" 死标签 → 已补遗物标签修复

### v4.26 并发测试发现
1. **并发可行**: relic-designer + enemy-designer 同时派发，产出互不冲突（改不同区段）
2. **测试编号冲突**: 两个 agent 都用了 test 176 → 主 Claude 需重编号（relic=176, enemy=177）
3. **本次 agent 都只输出代码块**，没有直接改文件 — 提示词中的"不要修改任何文件"有效
4. **墨碑设计优秀**: agent 主动选择了 hasShield+deathBuff 组合（现有敌人无此组合），展示了现有标记复用能力
