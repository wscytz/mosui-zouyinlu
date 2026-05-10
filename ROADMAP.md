# 墨祟：走阴录 路线书 v4.31+

> 这份文档驱动开发节奏。详细 agent 流程见 `AGENT_SYSTEM.md`，自动化命令见 `.claude/AUTOMATION_GUIDE.md`。

## 现状 (v4.31)

- **内容体量**: 5武器 / 180遗物 / 30进化 / 37敌人(含3Boss) / 9关卡 / 22誓印 / 38成就 / 12波
- **测试基线**: 269 项口径（37 smoke + 5 wave + 217 content + 10 stress）
- **自动化主线**: 方案 B，`sequencer -> executor JSON block -> merger -> test:all`
- **自动化治理**: block rules、fixtures、content audit 已接入，`audit:content` 默认 report-only
- **当前巡检缺口**: `molielian` 缺 CSS 图标；`moyong/morui` 未进 WAVE_TIERS；RELIC_RULES 覆盖偏低
- **技术栈**: Canvas 2D (960x640), 纯手写, 零框架, IIFE 单文件运行时
- **远程仓库**: https://github.com/wscytz/mosui-zouyinlu

## 已完成阶段

### v3.2-v3.5 美术与演出期
- 封面、Boss 肖像、武器图标接入位
- 全页面 CSS 统一
- 墨鬼王与 Boss 过场
- 波次清场、击杀顿帧、结算演出

### v4.0-v4.24 内容扩充和冷标签填补
- 召唤、治疗、溅射、爆炸、持续、生命、防御、诅咒等冷标签补强
- 新敌人、誓印、成就和结算页反馈扩展
- APK 打包链、移动端交互、Wiki 同步和多轮审计

### v4.25-v4.28 Agent 自动化定型
- 建立 `add-content` 调度 skill 和四类专职 agent
- `.claude/ctx-extract.js` 成为内容事实源
- `.claude/validate-agent-output.js` 拦截 ES6、错误测试、直接 push、直接扣血等高危模式
- 方案 B 定型：JSON block + sequencer + merger，解决并发抢测试号和末尾插入冲突

### v4.29-v4.31 自动化治理
- add-content skill 明确方案 A/B/worktree/spec 的触发边界
- merger 支持 relic block 的 `player_fields` / `ck_fields` / `css_rules` / `mechanic_insertions`
- 新增 `content-block-rules.js`、fixture tests 和 `audit-content-invariants.js`
- 文档分层为：skill 管流程，AGENT_SYSTEM 管规则，AUTOMATION_GUIDE 管命令，ROADMAP 管方向

## 下一步方向

### v4.32 内容线治理

目标：继续薅低价模型做内容，但不让内容表膨胀成不可维护的噪声。

1. 先清 `audit:content` 的 ERROR：补 `molielian` CSS 图标，确认 `moyong/morui` 是否应入 WAVE_TIERS。
2. 给 180+ 遗物分层：核心构筑、补强件、奇物、诅咒件、实验件。
3. 把 RELIC_RULES 从 40 提升到至少 70+，优先覆盖新近高辨识遗物。
4. 用冷标签和构筑缺口驱动批量生产，而不是只按灵感堆数量。
5. 每 20 件内容后做一次 balance-auditor 审计，避免重复机制和死标签。

### v4.33 测试硬化

目标：测试不只证明“没崩”，还要证明“核心体验没歪”。

1. 增加种子化长跑：固定随机种子覆盖 5 武器、主流构筑、Boss 波。
2. 增加内容鲁棒性测试：所有 RELICS `fn` 可执行，所有新标记能进入 `ck` 或重建链。
3. 增加 Playwright 视觉冒烟：首页、武器选择、战斗首屏、遗物选择、结算页不空白不遮挡。
4. 给性能压力测试设预算：对象峰值、帧循环耗时、粒子/火场/敌弹上限。
5. 发布前再把 `audit-content-invariants.js --strict` 接进门禁。

### v4.34 自动化生产质量

目标：agent 不只是“能合并”，还要“少手修、有复盘、能越跑越稳”。

1. content-executor 输出继续保持完整模板，禁止压缩 prompt。
2. 新失败模式先加 fixture，再加 rules/validator。
3. merger 保持 dry-run 强校验、write 串行写入、commit 串行释放 lease。
4. 只把复发问题写入 `agent-lessons.md`，不要把单次偶发塞进长期规则。
5. 批量并发默认 3-5；质量下降时先降并发，不急着加规则。

### v5.0 发布 2.0

目标：让游戏从“持续扩展原型”升级到“有完成感的作品”。

- 封面、截图、简介、图标收口
- 全局测试、内容审计和视觉冒烟稳定在最新口径
- 明显技术债清理：移动端输入、Wiki 展示、遗物选择说明
- APK / 网页端双端收口
- 第一批试玩反馈收集

## 开发规范流程

每个版本必须：

1. **取上下文** → `npm run ctx`
2. **改代码** → 优先数据表，必要时改机制入口
3. **校验 agent 输出** → 方案 A raw/merged validator；方案 B merger dry run
4. **跑测试** → `npm run test:all`
5. **跑自动化巡检** → 自动化改动跑 `npm run test:automation`；内容批量后跑 `npm run audit:content`
6. **同步构建资源** → `npm run www` 或 `npm run cap:sync`
7. **更新文档** → DEVDOC.md 版本记录 + ROADMAP.md 状态 + 相关规则
8. **提交** → `git add` + `git commit` (无 AI 署名)
9. **推送** → `git push origin main` (失败就攒着下次推)

## 先别碰的东西

- 不要先改战斗判定核心。
- 不要先改波次生成核心逻辑。
- 不要一次性做太多风格分支。
- 不要在没有测试覆盖的情况下改核心系统。
- 不要让专职 agent 直接提交或直接改文件。

## 风险点

1. 内容量已过 180 遗物，重复机制和低权重死遗物会越来越多。
2. `audit:content` 目前仍是 report-only，发布前需要 ERROR 清零再 strict。
3. 移动端横屏布局需要真机实测。
4. RELIC_RULES / BUILD_PREFS 覆盖需要定期审查。
5. 高并发仍依赖主 Claude 串行保存 block 和运行 merger，不能让 agent 直接写主文件。

## 资产材料

- `ART_DIRECTION.md` — 美术方向
- `ASSET_MANIFEST.md` — 资产清单
- `ART_PROMPTS.md` — 提示词
- `assets/` — concept/ui/portraits/sprites/vfx
