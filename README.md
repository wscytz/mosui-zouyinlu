# 墨祟：走阴录 v4.24

水墨俯视角动作肉鸽。你扮演一名替亡者走阴的夜行客，手持法器深入地宫，斩妖除祟。

纯 Canvas 2D，零框架，单 IIFE。桌面键鼠 + 移动端双虚拟摇杆，同一份游戏逻辑，分开打包。

## 快速开始

浏览器直接打开 `game.html` 即可游玩。建议 Chrome / Edge。

```bash
# 运行测试（37 冒烟 + 5 波次 + 151 内容 + 10 压力 = 203）
node smoke_test.js && node wave_test.js && node content_test.js && node stress_test.js
```

开发接手先读 [`DEVELOPMENT.md`](DEVELOPMENT.md)，架构边界见 [`ARCHITECTURE.md`](ARCHITECTURE.md)，完整技术历史和 Bug 追踪见 [`DEVDOC.md`](DEVDOC.md)。

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
- **114 件遗物**：标签驱动，按构筑自由组合
- **25 种进化**：3条武器进化链
- **32 种敌人**（含 3 Boss）：画皮娘子 / 墨将军 / 墨鬼王
- **9 个关卡**：含墨潮脉动等特殊关卡调制器
- **22 条誓印**：含诅咒型誓印
- **37 个成就**：覆盖各武器/遗物/特殊挑战
- **3 种难度**：平常 / 险途 / 噩梦

## v4.14-v4.24 内容扩充期 (2026-05-09 ~ 05-10)

聚焦冷标签填补和内容深度：

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
- 测试 187→203 项，标签覆盖率全面提升

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
  concept/         #   概念图/封面 (3张)
  portraits/       #   Boss肖像 (3张)
  ui/              #   武器图标 (4张)
  sprites/         #   场景精灵 (预留)
  vfx/             #   视觉特效 (预留)

ART_DIRECTION.md   # 美术方向指引
ART_PROMPTS.md     # 生图提示词备忘
ASSET_MANIFEST.md  # 资产清单
ROADMAP.md         # 路线书
generate-assets.js # 批量生图脚本

smoke_test.js      # 冒烟测试（37项，含60秒长跑）
wave_test.js       # 波次专项测试（5项）
content_test.js    # 内容/机制测试（151项）
stress_test.js     # 压力测试（10项）
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
- 测试：Node.js 冒烟测试（无框架，203 项）
