# 墨祟：走阴录 路线书 v3.2+

> 这份文档是给后续一段时间的施工用的。目标不是“多做点东西”，而是让程序慢慢长成一款完整作品。

## 现状

- 架构已稳：`v3.1.1`
- 测试基线：`187` 项全绿
- 分层已定：`data / input / core / render / ui / platform`
- 控制参数已集中：`window.MOSUI.profiles.control`
- 美术文档已就位：`ART_DIRECTION.md`
- 资产清单已就位：`ASSET_MANIFEST.md`
- 提示词已准备：`ART_PROMPTS.md`
- 资产目录已建：`assets/concept` / `assets/ui` / `assets/portraits` / `assets/sprites` / `assets/vfx`
- 关键接入口已开：
  - `game.html` 的 `bossPortrait` / `endPortrait`
  - `game.css` 的 `data-img` 标题图槽位
  - `mobile-controls.js` 的 `PROF` 参数表

## 现在的真实判断

程序已经不缺“能跑”，缺的是“像一款完整游戏”。

因此后续工作的重心应该变成：
1. 视觉统一
2. 资产接入
3. 内容扩容
4. 演出增强
5. 发布准备

## 阶段路线

### v3.2  美术接入期

目标是把最值钱、最先被看到的地方做漂亮。

优先顺序：
1. 主封面 / 标题页视觉
2. Boss 肖像
3. 结算页肖像
4. 武器图标
5. 印章 / 徽记 / 关键 UI 小图

原则：
- 只改“不会伤逻辑”的地方
- 所有图都要有文件名、尺寸、用途
- 没图时必须保留文本 fallback

### v3.3  视觉统一期

目标是把 UI 语言统一成一套完整风格。

重点：
- 标题页、选器页、暂停页、结算页统一
- 卡片、印章、按钮、头像、提示的边距和比例统一
- 移动端和网页端看起来是同一个世界

### v3.4  内容扩容期

目标是让构筑开始变厚，而不是只换外观。

重点：
- 新敌人家族
- 新 Boss
- 新章节调制器
- 新武器 / 遗物 / 誓印
- 新波次节奏

### v3.5  手感和演出期

目标是让战斗更像“会呼吸的战斗”。

重点：
- 移动端操控再调一轮
- 击杀反馈更强
- Boss 登场更有压迫感
- 胜负演出更完整
- 中端手机帧率更稳

### v4.0  发布准备期

目标是让它可以被正式展示、录屏、发给别人玩。

重点：
- 封面、截图、简介、图标、演示材料
- 全局回归测试
- 明显技术债清理
- APK / 网页端双端收口

## 明天开工包

如果明天只做最划算的事，顺序应该是：

1. 生成主封面 `cover_main.png`
2. 生成标题页备选 `cover_symmetry.png`
3. 生成压迫感备选 `cover_temple_pressure.png`
4. 生成 `portrait-mojiangjun.png`
5. 生成 `portrait-boss.png`
6. 生成 4 个武器图标

如果只想先试一张，就先做主封面。

## 先别碰的东西

- 不要先改战斗判定
- 不要先改波次逻辑
- 不要先把程序绘制的敌人全换成 sprite
- 不要一次性做太多风格分支

## 风险点

1. `game.css` 的 `data-img` 方案需要浏览器实测
   - 如果兼容性不稳，改成 JS 设 `backgroundImage` 或直接 `<img>` 接入
2. `bossPortrait` / `endPortrait` 目前是接入口，不是完整资产系统
   - 先接图片，再决定是否做更深的头像管理
3. `assets/sprites` 现在不该优先动
   - 战斗实体 sprite 属于后续增强，不该抢第一批资源

## 已准备好的材料

- `ART_DIRECTION.md`
- `ASSET_MANIFEST.md`
- `ART_PROMPTS.md`
- `assets/concept/README.md`
- `assets/ui/README.md`
- `assets/portraits/README.md`
- `assets/sprites/README.md`
- `assets/vfx/README.md`

## 结论

下一阶段不是“继续堆功能”，而是把这个游戏从“能玩”推进到“有作品感”。
最先动手的应该是封面、标题、Boss 肖像和几个关键 UI 图，而不是战斗主体。
