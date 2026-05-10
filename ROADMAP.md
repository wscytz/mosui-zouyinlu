# 墨祟：走阴录 路线书 v4.28+

> 这份文档驱动开发节奏。每完成一个阶段就更新状态。详细 agent 流程见 `AGENT_SYSTEM.md`。

## 现状 (v4.28)

- **内容体量**: 5武器 / 170遗物 / 30进化 / 37敌人(含3Boss) / 9关卡 / 22誓印 / 38成就 / 12波
- **测试基线**: 253 全绿 (37 smoke + 5 wave + 201 content + 10 stress)
- **冷标签**: 12 组全部填满 ✅
- **技术栈**: Canvas 2D (960x640), 纯手写, 零框架, IIFE 单文件运行时
- **构建产物**: www/ + Capacitor APK (android/)
- **内容开发流水线 (方案 B)**: sequencer → executor 生成 JSON block → merger 统一合并 → test:all 验证。并发 3-5 零冲突零手修。
- **远程仓库**: https://github.com/wscytz/mosui-zouyinlu

## 已完成阶段

### v3.2-v3.5 美术与演出期
- 封面、Boss 肖像、武器图标接入位
- 全页面 CSS 统一
- 墨鬼王与 Boss 过场
- 波次清场、击杀顿帧、结算演出

### v4.0-v4.13 发布后维护
- Capacitor APK 打包链
- 遗物上限6、第5武器召魂幡、召唤体系
- 墨潮关卡、波次多样性、移动端修复
- CSS 图标、BUILD_PREFS、PREREQS、首页/Wiki 同步
- 多轮代码审计与性能优化

### v4.14-v4.24 内容扩充和冷标签填补
- 治疗、溅射、爆炸、持续、生命、防御、诅咒等冷标签补强
- 新敌人：墨萤、墨偶师、墨蛛后等
- 新誓印：墨血、墨锁等
- 新成就：连锁墨爆、盲斗、百骨长生、绝地逢生、蛛后克星
- 结算页成就进度与音效扩展

### v4.25-v4.26 Agent 自动化准备
- 建立 `add-content` 调度 skill
- 建立遗物、敌人、内容、平衡审计四类专职 agent
- `.claude/ctx-extract.js` 自动输出当前内容事实源
- `.claude/validate-agent-output.js` 拦截 ES6 漂移、错误测试编号、直接 push、直接扣血等风险
- 文档入口收口到 `AGENT_SYSTEM.md` + `DEVELOPMENT.md`

## 下一步方向

### v4.27 自我迭代流水线

目标：让“给几个点子 + 投 token”可以稳定变成小批量内容，而不是每次人工翻 6 个文件。

优先级：

1. **修测试口径漂移**：让 `content_test.js` 输出 summary 与实际 `// Test N:` 块一致。
2. **增强 validator**：检测敌人缺 `tip`、遗物缺 CSS 图标、新标签缺 BUILD_PREFS/RELIC_RULES。
3. **agent 产物日志**：每次合并记录新增 ID、标签、测试号、风险点。
4. **冷组合补完**：按 ctx 输出的 cold tags / cold pair gaps 继续补内容。
5. **小批量并发策略**：并发只做设计输出，测试编号和合并永远由主 Claude 串行处理。

### v4.28 内容深挖

可选方向：

1. 新敌人：补 tier 2/3 池，优先远程+召唤、冲锋+分裂、诅咒支援型。
2. 新誓印：围绕召唤、火、冰、魂、低血做组合型代价。
3. 成就补全：为新构筑线补 1-2 个长期目标。
4. 音效扩展：新敌人和高辨识遗物补专属反馈。
5. 图标审计：确保所有遗物都有非文字 CSS 图标。

### v5.0 发布 2.0

目标：让游戏从“持续扩展原型”升级到“有完成感的作品”。

- 封面、截图、简介、图标收口
- 全局回归测试稳定在最新口径
- 明显技术债清理
- APK / 网页端双端收口
- 第一批试玩反馈收集

## 开发规范流程

每个版本必须：

1. **取上下文** → `npm run ctx`
2. **改代码** → 优先数据表，必要时改机制入口
3. **校验 agent 输出** → raw validate + merged validate
4. **跑测试** → `npm run test:all`
5. **同步构建资源** → `npm run www` 或 `npm run cap:sync`
6. **更新文档** → DEVDOC.md 版本记录 + ROADMAP.md 状态 + 相关规则
7. **提交** → `git add` + `git commit` (无 AI 署名)
8. **推送** → `git push origin main` (失败就攒着下次推)

## 先别碰的东西

- 不要先改战斗判定核心。
- 不要先改波次生成核心逻辑。
- 不要一次性做太多风格分支。
- 不要在没有测试覆盖的情况下改核心系统。
- 不要让专职 agent 直接提交或直接改文件。

## 风险点

1. `content_test.js` 历史 summary 文本与实际测试块存在漂移。
2. 移动端横屏布局需要真机实测。
3. banner PNG 图标缺失时依赖 CSS fallback。
4. 部分遗物 PREREQS / BUILD_PREFS / RELIC_RULES 条件链需定期审查。
5. 并发 agent 容易抢测试编号，必须用 placeholder + 主 Claude 串行替换。

## 资产材料

- `ART_DIRECTION.md` — 美术方向
- `ASSET_MANIFEST.md` — 资产清单
- `ART_PROMPTS.md` — 提示词
- `assets/` — concept/ui/portraits/sprites/vfx
