# 墨祟：走阴录 v9.2

水墨俯视角动作肉鸽。你扮演一名替亡者走阴的夜行客，手持法器深入地宫，斩妖除祟。

纯 Canvas 2D，零框架，单 IIFE。桌面键鼠 + 移动端双虚拟摇杆，同一份游戏逻辑，分开打包。

## 快速开始

浏览器直接打开 `game.html` 即可游玩。建议 Chrome / Edge。

```bash
# 取当前内容/测试/标签事实源
npm run ctx

# 运行完整回归（syntax + smoke + wave + content + stress + robust + seeded + strict audit）
npm run test:all

# 视觉冒烟（Playwright + Chromium，走 首页→武器→战斗 流程）
npm run test:visual

# 内容巡检
npm run audit:content
```

开发接手先读 [`DEVELOPMENT.md`](DEVELOPMENT.md)。agent 自动化规则见 [`AGENT_SYSTEM.md`](AGENT_SYSTEM.md)，自动化命令见 [`.claude/AUTOMATION_GUIDE.md`](.claude/AUTOMATION_GUIDE.md)，架构边界见 [`ARCHITECTURE.md`](ARCHITECTURE.md)，完整技术历史和 Bug 追踪见 [`DEVDOC.md`](DEVDOC.md)。

## 操作

| 操作 | 桌面 | 移动端 |
|------|------|--------|
| 移动 | WASD | 左摇杆 |
| 瞄准 / 攻击 | 鼠标移动 + 按住左键 | 自动瞄准（右摇杆手动覆盖） |
| 闪避 | 空格 / Shift | 闪避按钮 |
| 暂停 | Escape / P | 右上角暂停按钮 |
| 全屏 | F | — |
| 性能调试 | F3 | — |
| 快速重开 | R | — |

## 内容体量

- **5 把武器**：斩妖剑 / 符骨笔 / 镇魂铃 / 伏魔伞 / 召魂幡
- **203 件遗物**：标签驱动，按构筑自由组合；含10个武器专属遗物
- **38 种进化**：5把武器各有多条进化链
- **47 种敌人**（含 3 Boss）：画皮娘子 / 墨将军 / 墨鬼王
- **9 个关卡**：含墨潮脉动等8种关卡调制器
- **28 条誓印**：含诅咒型誓印
- **47 个成就**：覆盖各武器/遗物/Boss/难度/特殊挑战
- **3 种难度**：平常 / 险途 / 噩梦

## 测试基线

- `npm run test:all` = 326 项（44 smoke + 8 wave + 236 content + 11 stress + 5 robust + 3 seeded）+ strict audit gate
- `npm run test:visual` = 13 项 Playwright 视觉冒烟（含暂停/恢复、移动端竖屏/横屏、Wiki渲染、结算页/弹窗 DOM）
- 0 flake（6/6 连跑全绿）

## v9.0-v9.2 内容深度扩充 (2026-06-01)

- **v9.2**：10武器专属遗物（每武器2个），PREREQS用weaponType限定，遗物193→203
- **v9.1**：4新敌人+4特殊能力(chainLightning/soulHarvester/cloneOnHalf/vampiric)，敌人43→47
- **v9.0**：3誓印(虎威/沧浪/黔袅)+5成就+2舞台危害(墨落减速/鬼影恐惧)，誓印25→28，成就42→47

## v7.0-v7.18 战斗反馈体系 + 性能优化 (2026-05-20)

- **v7.18**：全量复查修复content_test(KILL_MILESTONES 6项/42成就)
- **v7.17**：Boss阶段提示，狂暴/绝望触发"狂 暴"/"绝 望"全屏火焰大字
- **v7.16**：版本号显示，MOSUI.version，标题页版本信息
- **v7.14**：评分公式优化，连斩(maxCombo×0.2)+暴击(critKills×0.15)纳入calcGrade
- **v7.8-v7.13**：性能优化，forEachLiveEnemy统一热路径(53处)
- **v7.0**：连杀里程碑重构，6级体系(3/5/10/20/30/50)

## v6.4-v6.9 战斗反馈增强 (2026-05-31)

- **v6.9**：发布收口 - v6.4-v6.8 提交推送，git tags 创建
- **v6.8**：遗物满时提示
- **v6.7**：波次预告显示敌人数
- **v6.6**：结算统计场均伤害显示
- **v6.5**：战斗反馈玩家受伤数字显示
- **v6.4**：连杀里程碑特效（五连斩/十连斩/二十连斩）

## v6.3 发布收口 (2026-05-31)

- **UI增强**：标题页静音按钮、暂停菜单震屏调节滑块
- **加载体验**：游戏启动显示"正在进入地宫..."加载画面
- **smoke_test 修复**：补充 localStorage mock，解决 Node.js 环境测试失败

## v6.0-v6.2 内容深化 (2026-05-30 ~ 05-31)

- **v6.2**：2精英能力(治愈/吸血)+4敌人+3誓印
- **v6.1**：音效补全+恐惧视觉反馈，Boss头像跨局残留bug修复
- **v6.0**：墨影鬼(传送型)+墨医师(治疗型)敌人，核心联动战场反馈增强

## v5.0-v5.2 构筑吸收 + 发布门槛 (2026-05-11)

- **v5.2**：RELIC_RULES 覆盖 193/193，结算页显示本局构筑路线，补 2 个流派核心遗物，并形成 Boss/精英战设计文档。
- **v5.1-builds**：RELIC_RULES 覆盖 106→157/191，遗物卡片显示 build hint，让内容从“数量”进入“构筑选择”。
- **v5.0-prep**：视觉冒烟扩到 10 项，覆盖标题、选武器、战斗 Canvas、暂停/恢复、移动端竖屏/横屏；DEVDOC/V5_PREP 入档。
- **管线收口**：block rules 拦截 HTML entity，skill 同步检查扩展为整目录校验，避免附属配置漏同步。

## v4.31-v4.34 自动化治理 + 测试硬化 (2026-05-10 ~ 05-11)

- **v4.33** 测试硬化首批：`robust_test.js`（186×5=930 组合 fn 可执行 + rebuild 一致性）、`seeded_test.js`（mulberry32 PRNG 确定性长跑）、`visual_smoke_test.js`（Playwright + Chromium 视觉冒烟）、帧时间 P99 预算、strict audit 接入门禁、修复 `jiuzhuanmofu` latent bug + `wave_test.killAll` flake
- **v4.32** 内容治理：补 `molielian` CSS 图标，`moyong/morui` 入 WAVE_TIERS，RELIC_RULES 40→75，冷标签 召唤/冲刺/范围 1→3（6新遗物）
- **v4.31** 共享门禁：新增 `.claude/content-block-rules.js` 共享校验（CSS selector/var、test 格式、重复 ID），fixture 测试 1 好 7 坏，`audit-content-invariants.js` 内容巡检，`.claude/AUTOMATION_GUIDE.md` 命令说明

## v4.14-v4.26 内容扩充 + 自动化期 (2026-05-09 ~ 05-10)

聚焦冷标签填补和内容深度：

- **v4.26** agent 自动化加固：ctx 提取、输出 validator、专职模板、规则文档收口
- **v4.25** 内容继续补强并进入主 Claude + 专职 agent 协作准备
- **v4.24** 墨裂符(分裂/法术)+墨铁壁(防御/反击)
- **v4.23** 墨爆弹(爆炸/爆发)+墨蚀域(持续/溅射)+续命墨(治疗/生命)
- **v4.22** 2新成就(绝地逢生/蛛后克星)+BUILD_PREFS标签补全
- **v4.21** 墨火眼+墨符坛+墨魂丹+墨蛛后(召唤型精英)
- **v4.20** 墨泉眼+墨焰溅+墨锁誓印
- **v4.19** 冰墨壁(防御/冰)+结算页成就进度
- **v4.18** 3成就+墨偶师(远程召唤)+音效
- **v4.17** 3遗物填冷标签(墨爆印/蚀墨池/骨续泉)
- **v4.16** 新誓印墨血(连击增伤+受伤连动)
- **v4.15** 墨萤(远程致盲)+blindT机制
- **v4.14** 还骨泉+墨散淬遗物
- 标签覆盖率全面提升，测试口径以 `npm run ctx` 扫描结果为准

## v4.0-v4.13 发布后维护 (2026-05-08 ~ 05-09)

- **v4.1** Boss击杀结算演出（120帧肖像过场+判词+Grade弹入）
- **v4.2** 遗物上限6+成就补全+第5武器召魂幡
- **v4.3** 召唤补全（3新遗物+BUILD_PREFS+成就）
- **v4.4** 性能+手感（波次墨纹/boss顿帧/banner免碰撞）
- **v4.5** 闪避手感重做+文档更新
- **v4.6** 墨潮关卡+波次多样性(survival/horde/elite)
- **v4.7** 2新遗物+波次特殊标签(5/9波)
- **v4.8** 新誓印墨旋(移动留减速+静止受伤加重)
- **v4.9** CSS图标+BUILD_PREFS修复+首页数字同步
- **v4.10** 召魂幡自伤修复+武器选择5列
- **v4.11** 7项代码审计Bug修复
- **v4.12** 新敌人墨罐(死后减速墨池)
- **v4.13** 新遗物墨迹残步+成就疾风步

## v3.0-v3.5 候选版 (2026-05-07 ~ 05-08)

- **v3.5** Boss入场演出+连斩震屏+墨鬼王专属胜负风味
- **v3.4** 墨鬼王(3阶段AI)+3新敌人+墨潮关卡+3新誓印
- **v3.3** 全页面CSS视觉统一
- **v3.2** 美术基建（10张资产+图片槽位+fallback）
- **v3.1** 移动端操控重做（安全区/非线性曲线/自动瞄准/触控反馈）
- **v3.0** 崩溃修复+PREREQS补全+测试160→187

## 在线试玩

通过 GitHub Pages 免费部署，无需服务器：

1. 仓库 → Settings → Pages
2. Source: `Deploy from a branch` → 分支 `main` → 目录 `/ (root)` → Save
3. 等待 1-2 分钟，访问 `https://用户名.github.io/仓库名/` 即可在线游玩

桌面和移动端浏览器均可直接打开，无需安装。

## 移动端打包

```bash
npm run www              # 同步源文件 → www/
npm run cap:sync         # 同步 www/ → Android
npm run cap:open:android # Android Studio 打开编译
```

需要 Android Studio + Android SDK。

## 文件结构

```
game.html          # 游戏入口
game.js            # 核心逻辑 (~4500行 Canvas 2D)
game.css           # 游戏样式（含移动端全屏适配）
gamedata.js        # 武器/遗物/敌人/波次/成就数据
sound.js           # Web Audio API 合成音效
mobile-controls.js # 移动端虚拟摇杆 + 触摸输入
manifest.json      # PWA 安装清单

index.html         # 原型宣传页
wiki.html          # 游戏百科（自动读取 gamedata.js）
styles.css         # 宣传页/百科/游戏共用样式

assets/            # 美术资产
  concept/         #   概念图/封面 (5张)
  portraits/       #   Boss肖像 (3张)
  ui/              #   武器/遗物图标
  sprites/         #   场景精灵 (预留)
  vfx/             #   视觉特效 (预留)

ART_DIRECTION.md   # 美术方向指引
ART_PROMPTS.md     # 生图提示词备忘
ASSET_MANIFEST.md  # 资产清单
ROADMAP.md         # 路线书
AGENT_SYSTEM.md    # agent 自动化系统总纲
generate-assets.js # 批量生图脚本
.claude/           # Claude 专职 agent、上下文提取、输出校验

smoke_test.js      # 冒烟测试（37项，含60秒长跑）
wave_test.js       # 波次专项测试（8项）
content_test.js    # 内容/机制测试（active blocks 以 ctx 扫描为准）
stress_test.js     # 压力测试（11项，含帧时间 P99 预算）
robust_test.js     # 鲁棒性测试（193×5 遗物fn + rebuild一致性）
seeded_test.js     # 种子化确定性测试（mulberry32 PRNG）
visual_smoke_test.js # Playwright 视觉冒烟（13项）
ARCHITECTURE.md    # 架构文档（六层边界）
DEVDOC.md          # 开发文档（含完整版本历史）
DEVELOPMENT.md     # 开发规范 / 交接清单
```

## 移动端架构

```
game.js（不动，双端共用）
  ↑ WASD + 鼠标     ↑ _mobileInput 桥接 (mobile-controls.js)
  桌面浏览器           Capacitor WebView
```

## 技术栈

- 渲染：Canvas 2D（960×640 内部分辨率）
- 音效：Web Audio API 合成（38 种音效 + 8 种环境氛围）
- 打包：Capacitor 8.x → Android APK
- 测试：Node.js 冒烟/波次/内容/压力测试（无框架），`npm run test:all`
