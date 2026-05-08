# 墨祟：走阴录 v4.0

水墨俯视角动作肉鸽。你扮演一名替亡者走阴的夜行客，手持法器深入地宫，斩妖除祟。

纯 Canvas 2D，零框架，单 IIFE。桌面键鼠 + 移动端双虚拟摇杆，同一份游戏逻辑，分开打包。

## 快速开始

浏览器直接打开 `game.html` 即可游玩。建议 Chrome / Edge。

```bash
# 运行测试（37 冒烟 + 5 波次 + 135 内容 + 10 压力 = 187）
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

## v4.0 发布准备 (2026-05-08)

- **v3.5 演出增强** — Boss入场墨迹渗入+粒子爆发+卷轴框（110帧）、连斩3加震/精英金粒/Boss大震、墨鬼王专属胜负风味。
- **v3.4 内容扩容** — 新Boss墨鬼王（3阶段AI）、3新敌人（墨蛛/墨骨/墨面）、新关卡墨潮（脉动墨环）、3新誓印（虚实/墨印/镜花）。
- **v3.3 视觉统一** — 遮罩/blur/padding/radius/seal全页面统一，卡片圆角20px。
- **v3.2 美术基建** — 新增 `ART_DIRECTION.md`/`ASSET_MANIFEST.md`/`ART_PROMPTS.md`，生成10张美术资产（3封面+3肖像+4武器图标），图片槽位接入 HTML/CSS/JS 并带文本 fallback。
- **bug修复** — enemyFlicker canvas污染、moguiwang双重加速、镜花missChance DOT惩罚、HP条脏检查优化。
- **测试** — 187项（37冒烟+5波次+135内容+10压力）

## v3.1.1 架构整理 (2026-05-08)

- **架构文档** — 新增 `ARCHITECTURE.md`，明确 data/input/core/render/ui/platform 六层边界。
- **运行时预留** — 新增 `window.MOSUI`，预留 hooks/input/platform/profiles/ui/debug 扩展入口。
- **输入契约** — `buildInputFrame()` 暴露为 `MOSUI.input.buildFrame`。

## v3.1 移动端操控重做 (2026-05-07)

- 安全区补偿修正、摇杆上移+缩小、非线性三次方响应曲线、死区10→22。
- 自动瞄准+自动攻击、锁敌黏性（35%切换阈值）、角度平滑插值。
- 触控反馈：摇杆激活高亮+方向线、自动瞄准红箭头指示、触觉震动。

## v3.0 候选版 (2026-05-07)

- 崩溃修复（quickRestart音效守卫、rebuildPlayerStats补字段）、鬼市三条退出路径修复。
- 遗物过滤 PREREQS 补全（封魔符等）、移动端摇杆 Canvas 状态隔离。
- UI可读性（最小字号8→10px、字体栈修复）、代码质量（.closest()守卫、DOM泄漏清理）。
- 测试 160→187项。

## v2.17-v2.29 累积更新

- v2.29 稳定版审计、v2.26 UX打磨（死亡/胜利冻结、低血警告）、v2.25 Boss登场卡片。
- v2.24 FPS计数器、v2.20-v2.23 代码质量（forEachLiveEnemy→filter/some、35项TUNING）。
- v2.19 音效+视觉（5种新音效、镜殿视觉、墨将军P2/P3）、v2.18 QoL（R键重开、墨契/狂墨诅咒）。

## v2.17 第三进化 + 鬼市 + 墨灵扩展

- 第三进化(wave 8)：回斩/梭破/回鸣/影迹、鬼市关卡（遗物交换/HP换购）。
- 墨灵遗物扩展（爆墨灵/愈墨灵/寒墨灵/分墨灵）、新环境事件（阴兵借道/纸剑雨）。
- 信息架构：状态图标系统(23种buff)、遗物tooltip、Boss名称同步、波次进度"余N"。
- 移动端UX：摇杆安全区补偿、灵敏度设置、伤害数字放大。
- HTML标准合规：meta/OG/PWA manifest/favicon/noscript。
- 渲染性能优化：离屏裁剪、渐变缓存、粒子世界坐标旋转。
- 成就补全：灰烬之路、全法器皆通。

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
game.js            # 核心逻辑 (~4200行 Canvas 2D)
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
content_test.js    # 内容/机制测试（135项）
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
- 测试：Node.js 冒烟测试（无框架）
