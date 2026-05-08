# 墨祟：走阴录 开发规范 (v4.0)

本文是给 Codex / Claude / 人类开发者的接手入口。目标是减少重复踩坑：先稳定，再扩展；先补测试，再改玩法；先改数据表，再改分散逻辑。

> 当前基线：187 项测试（37 smoke + 5 wave + 135 content + 10 stress）

## 文档分工

| 文件 | 用途 | 维护规则 |
|------|------|----------|
| `README.md` | 玩家/运行入口，保持短 | 只写当前版本、启动、测试、文件说明 |
| `DEVELOPMENT.md` | 开发规范和交接清单 | 每次流程变化或踩坑后更新 |
| `DEVDOC.md` | 技术细节、版本历史、Bug追踪 | 每个小版本追加变更记录，修完 Bug 后移动到已修复 |
| `wiki.html` | 游戏内百科/内容展示 | 内容来自 `gamedata.js`，不要手写重复数据 |

## 每次开发顺序

1. 先读 `DEVELOPMENT.md`、`DEVDOC.md` 末尾的 Bug 追踪、最近一个版本记录。
2. 跑基线测试，确认不是在坏状态上继续开发。
3. 修 Bug 优先级高于加内容：崩溃、卡流程、状态错乱、性能尖峰先处理。
4. 改玩法时优先改 `gamedata.js` 数据表，只有机制需要才改 `game.js`。
5. 每个新机制至少补一个 `content_test.js` 或 `smoke_test.js` 覆盖。
6. 最后更新文档和版本号，再跑全量测试。

## 必跑命令

```bash
node --check gamedata.js
node --check game.js
node --check mobile-controls.js
node smoke_test.js
node wave_test.js
node content_test.js
```

只改文档时不用跑全量测试，但要说明“未改运行代码”。

## 架构边界

| 区域 | 放什么 | 不要做什么 |
|------|--------|------------|
| `gamedata.js` | 武器、遗物、敌人、誓印、常量、前置条件 | 不写依赖 DOM / canvas 的逻辑 |
| `game.js` | 状态机、战斗循环、碰撞、渲染、选择算法 | 不把新增内容写成大量 `id` 特判 |
| `game.css` | DOM UI、卡片、HUD、移动端布局 | 不影响 canvas 内战斗逻辑 |
| `mobile-controls.js` | 触摸输入桥接到 `_mobileInput` | 不复制桌面战斗逻辑 |
| `content_test.js` | 数据和机制单元测试 | 不依赖真实 DOM |
| `smoke_test.js` | 长跑、流程、回归测试 | 不做复杂数值断言 |
| `wave_test.js` | 波次推进、召唤、分裂、护盾等流程 | 不测纯数据表 |

## 核心不变量

- 攻击对象进入 `g.attacks` 必须走 `pushAttack()` 或 `addAttack()`，不要直接 `g.attacks.push()`。
- 火场进入 `g.fires` 必须走 `addFire()`；敌弹进入 `g.eProj` 必须走 `addEProj()`。
- 新增遗物如果依赖前置机制，必须同步更新 `PREREQS`，避免死词条。
- 数值型遗物改 `p.stats`；机制型遗物改玩家标记，并在 `pAtk/hitE/hurtP/onEnemyKilled/update` 中挂钩。
- 命中类效果必须考虑 `source`，避免火、魂、反伤、召物误触发“近战击杀”等文案效果。
- 波次切换只能清理瞬时对象；召物、玩家火场、长期构筑对象是否保留必须显式判断。
- 所有高频循环优先用 `dstSq()`，不要在热路径里滥用 `Math.sqrt()`。
- 新 UI 不要阻塞 `playing/waveClear/paused/over/victory` 状态机。

## 新增遗物检查表

1. 在 `RELICS` 添加 `id/name/type/tags/effect/fn`。
2. 如果有前置，在 `PREREQS` 添加过滤条件。
3. 如果影响构筑推荐，在 `BUILD_PREFS` 或 `RELIC_RULES` 补权重。
4. 如果是新机制，在 `mkPlayer()` 添加默认字段。
5. 在正确触发点实现机制，并传入清晰 `source`。
6. 在 `content_test.js` 加数据/机制测试。
7. 更新 `DEVDOC.md` 版本记录。

## 新增敌人检查表

1. 在 `ETYPE` 添加属性，明确是否 ranged/charge/summoner/splitter 等。
2. 在 `WAVE_TIERS` 和 `ENEMY_COST` 添加出场与成本。
3. 在 `DEATH_COLOR` / 渲染分支补视觉差异。
4. 如果有特殊 AI，优先用通用字段驱动，必要时才在 enemy loop 分支。
5. 补 `content_test.js` 或 `wave_test.js`，至少覆盖 spawn 和核心机制。

## 新增 UI / 图标检查表

1. DOM 选择界面优先用 `data-*` 和 CSS，不新增图片依赖。
2. 图标只是识别辅助，不要遮挡名称、标签、效果文案。
3. 移动端 overlay 必须可滚动，不能破坏横屏布局。
4. 修改遗物/武器卡后跑一次 `smoke_test.js`，因为测试会 mock DOM。

## Bug 处理规范

Bug 条目统一放在 `DEVDOC.md` 末尾“当前Bug追踪”。

格式：

```md
- **标题**: 现象。已知复现条件。怀疑范围。当前状态。
```

修复后：

1. 从待修区删除。
2. 移到“已修复”，写清楚修复文件/机制。
3. 如果能自动化复现，补测试编号。
4. 版本号末尾 +1，例如 `v2.14.1 -> v2.14.2`。

## 版本记录模板

```md
### vX.Y.Z 标题 (YYYY-MM-DD)

**目标：**
- 本次为什么改。

**改动：**
- 关键代码/数据/UI变化。

**测试覆盖：**
- 新增/更新了哪些测试。
- 当前通过的测试命令。

**未解决：**
- 需要实机确认或后续平衡的事项。

*vX.Y.Z 更新于 YYYY-MM-DD。*
```

## 交接给另一个模型时的提示模板

```md
先读 DEVELOPMENT.md 和 DEVDOC.md 末尾 Bug 追踪。
当前目标：<一句话目标>
优先级：先修 <Bug/稳定性>，再做 <玩法/UI/数值>。
限制：
- 不要直接 push 到 g.attacks/g.fires/g.eProj。
- 新遗物必须补 PREREQS/测试/文档。
- 不要大规模重构无关代码。
验收：
- node --check gamedata.js
- node --check game.js
- node --check mobile-controls.js
- node smoke_test.js
- node wave_test.js
- node content_test.js
最后更新 DEVDOC.md 版本记录和 Bug 追踪。
```

## 当前优先级

1. ~~实机确认纸薄和移动端右摇杆~~：已完成（v2.17 移动端修复 + 窗口触控转发）。
2. ~~系统化数值平衡~~：已完成（v2.14.5-v2.14.6）。
3. ~~UI 继续补强~~：已完成（v2.16 遗物图标全覆盖88件）。
4. ~~性能压测脚本~~：已完成（v2.17 全部优化已落地）。
5. ~~彩蛋成就~~：已完成（v2.15 实现8个彩蛋成就，v2.16 结算画面显示解锁通知）。
6. ~~v2.17 第三进化+鬼市+墨灵扩展+新环境事件~~：已完成（2026-05-05）。
7. ~~v2.18 QoL+内容+音效~~：R键重开、墨契/狂墨诅咒、镜殿关卡、5音效+1氛围（2026-05-06）。
8. ~~数值审查~~：狂墨改为击杀回血+8HP抵消攻击消耗（2026-05-06）。
9. ~~发布前审计~~：纸薄遗物机制确认、噬魂遗物理赔修复、quickRestart弹窗清理、梯度缓存补漏（2026-05-06）。
10. ~~Wiki同步~~：STAGE_HAZARDS章节补全、eOrder动态化、BUILDS计数动态化（v2.18.2）。
11. ~~深度代码审计~~：gamedata.js零问题(8维度)、game.js 5处修复、wiki.html 4处修复（v2.18.2）。
12. ~~移动端视觉修复~~：摇杆亮色+放大、letterbox黑底、按钮亮色（v2.18.1）。
13. ~~v2.20 性能优化+桌面增强+代码规范~~：热路径优化、P/F键、魔法数字→TUNING（2026-05-06）。
14. ~~v2.21 代码质量+循环优化~~：17处forEachLiveEnemy、filter→some、18新常量（2026-05-06）。
15. ~~v2.22 性能修复+Bug修复+代码清理~~：kill里程碑常量提升、decoy/deathburst对象分配消除、elite deathburst maxTimer修复、_isMob作用域修复、leeches→splice、5新TUNING常量（2026-05-07）。
16. ~~v2.23 常量提取+Wiki同步+数据表审计~~：8项TUNING新增(pAtk/Boss/eProj预警)、Wiki进化文案修正+导航补全、DEVDOC数据表计数校正（2026-05-07）。
17. ~~v2.24 FPS计数器+暂停信息增强~~：F3切换Canvas内FPS+对象计数、暂停菜单stats追加FPS（2026-05-07）。
15. 实机验证：鬼市交互、镜殿残影弹、墨契狂墨平衡、精英标记识别、移动端摇杆可见度。

## 彩蛋成就（已实现）

在 `ACHIEVEMENTS` 数组中添加，`check` 函数读取 `meta` 对象。每个成就需在 game.js 的对应位置埋检测点，在 `content_test.js` 补测试。

| 成就 | 条件 | 检测点 | 备注 |
|------|------|--------|------|
| 不动如山 | 全程不按WASD/方向键通关（闪避移动不算） | `newGame` 时设 `p._usedMove=false`，WASD 按下时置 true，结算时检查 | 伞/铃闪避流 |
| 一刀不漏 | 受伤次数 ≤ 3 通关 | `hurtP` 计数 `g.hurtCount`，结算检查 | 极限闪避 |
| 暴走夜行 | 30秒内击杀所有波次敌人 | 每波首杀记录 `g._waveStartT`，波次清除时检查 | 速度挑战 |
| 纸糊的人 | 纸薄誓印通关 | 结算时检查 `G.maxHpOverride<=60` | 低HP高遗物 |
| 赤手空拳 | 不拾取任何遗物通关 | `g.relics.length===0` | 纯技术流 |
| 灰烬之路 | 全程被焚烧面积覆盖 50%+ | 统计 `g.fires` 中 `owner=”player”` 的覆盖面积占比 | 火系专精 |
| 百鬼夜行 | 单局击杀 100+ 敌人 | `g.kills>=100` | 耐力挑战 |
| 完美谢幕 | Boss 战不受伤 | Boss 波开始设 `g._bossHurt=false`，`hurtP` 时检查波次 | 无伤Boss |
| 全法器皆通 | 四种武器各通关一次 | 累计 meta.weaponsCleared 四项均 >0 | 已有，但无奖励效果 |
| 孤勇者 | 孤行誓印通关 | 结算检查 `p.noEvolution` | 无进化通关 |

全部10项彩蛋成就已实现并埋好检测点。
