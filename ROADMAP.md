# 墨祟：走阴录 路线书 v4.13+

> 这份文档驱动开发节奏。每完成一个阶段就更新状态。

## 现状 (v4.20)

- **测试基线**: 200 项全绿 (37 smoke + 5 wave + 148 content + 10 stress)
- **内容体量**: 5武器 / 106遗物 / 25进化 / 31敌人(3Boss) / 9关卡 / 22誓印 / 35成就 / 12波
- **技术栈**: Canvas 2D (960x640), 纯手写 ~4350行, 零框架, IIFE 单文件
- **构建产物**: www/ + Capacitor APK (android/)
- **远程仓库**: https://github.com/wscytz/mosui-zouyinlu

## 已完成阶段

### v3.2 美术接入期 ✅
- 封面 × 3, Boss 肖像 × 3, 武器图标 × 4 (AI 生成)
- game.html/game.css 图片接入位, data-img fallback
- generate-assets.js 批量生图脚本

### v3.3 视觉统一期 ✅
- 全页面 CSS 一致化 (index.html / game.html / wiki.html)
- 卡片、印章、按钮、头像边距比例统一
- 移动端和桌面端视觉一致

### v3.4 内容扩容期 ✅
- 墨鬼王 (HP 500, 3阶段 AI)
- 3 新敌人 (墨蛛/墨骨/墨面)
- 墨潮关卡调制器
- 3 新誓印

### v3.5 手感演出期 ✅
- Boss 入场过场 (Canvas 肖像 + 判词)
- Boss 击杀庆祝 (120帧肖像过场 + Grade 弹入动画)
- 波次清场墨纹扩散
- 击杀顿帧加强

### v4.0 发布准备期 ✅
- Capacitor APK 打包链
- 187→190 测试基线
- DEVDOC / ARCHITECTURE / DEVELOPMENT 文档

### v4.1-v4.6 发布后维护 ✅
- v4.1: Boss 击杀结算演出
- v4.2: 遗物上限6 + 成就补全 + 第5武器召魂幡
- v4.2.1: 13处颜色引用bug + fire重复行 + 召魂幡追踪
- v4.3: 召唤补全 (3新遗物 + BUILD_PREFS + 成就)
- v4.4: 性能+手感+QoL (波次墨纹/boss顿帧/banner免碰撞)
- v4.5: 闪避手感重做 + 文档更新
- v4.6: 墨潮关卡 + 波次多样性 (survival/horde/elite)

### v4.7-v4.13 深度内容期 ✅
- v4.7: 2新遗物 (墨镜碎影/九转墨符) + 波次特殊标签 (5/9波有特殊类型)
- v4.8: 新誓印墨旋 (移动留减速+静止受伤加重)
- v4.9: CSS图标+BUILD_PREFS标签修复+首页数字同步
- v4.10: 召魂幡自伤修复 + 武器选择5列 + 图标z-index
- v4.11: 7项代码审计Bug修复 (stillT/cleanupWave/hitDmgMult等)
- v4.12: 新敌人墨罐 (死后减速墨池)
- v4.13: 新遗物墨迹残步 (移动充能+静止释放) + 成就疾风步

### v4.14-v4.17 内容扩充+冷标签填补 ✅ (当前)
- v4.14: 2新遗物 (还骨泉/墨散淬) 填补治疗+溅射标签 + 首页数字同步
- v4.15: 新敌人墨萤 (远程致盲blindShot) + blindT机制
- v4.16: 新誓印墨血 (连击增伤comboDmgScale + 受伤连动comboVuln)
- v4.17: 3新遗物填补冷标签 — 墨爆印(爆炸/近战) + 蚀墨池(持续/击杀) + 骨续泉(生命/生存)
- v4.18: 3新成就(连锁墨爆/盲斗/百骨长生) + 新敌人墨偶师(远程召唤) + 音效
- v4.19: 冰墨壁(防御/冰) + 结算页成就进度
- v4.20: 墨泉眼(治疗/生存) + 墨焰溅(溅射/火) + 墨锁誓印(召物/诅咒)

## 下一步方向

### v4.18 内容继续+打磨

可选方向（按性价比排序）：
1. **新敌人** — 扩充 tier 2/3 池，增加"远程+召唤"组合型敌人
2. **新誓印** — 围绕"召唤/火"等组合型誓印
3. **成就补全** — 检查 BUILD_PREFS 中是否有死标签（无遗物匹配的标签）
4. **音效扩展** — 新遗物/敌人的专属音效
5. **CSS图标补全** — 确认所有遗物都有伪元素图标

### v5.0 发布 2.0

目标：让游戏从"可玩原型"升级到"有完成感的作品"。

重点：
- 封面/截图/简介/图标 制作
- 全局回归测试 190+ 项
- 明显技术债清理
- APK / 网页端双端收口
- 第一批试玩反馈收集

## 开发规范流程

每个版本必须：
1. **改代码** → `node --check game.js` 语法检查
2. **跑测试** → `node smoke_test.js && node wave_test.js && node content_test.js && node stress_test.js` (190项)
3. **补测试** → 新机制必须在 content_test.js 中有对应测试
4. **更新文档** → DEVDOC.md 版本记录 + ROADMAP.md 状态
5. **提交** → `git add` + `git commit` (wscytz 身份，无 AI 署名)
6. **推送** → `git push origin main` (失败就攒着下次推)
7. **同步** → `cp game.js game.css www/ && cp game.js game.css android/app/src/main/assets/public/`

## 先别碰的东西

- 不要先改战斗判定核心
- 不要先改波次生成核心逻辑
- 不要一次性做太多风格分支
- 不要在没有测试覆盖的情况下改核心系统

## 风险点

1. 移动端横屏布局需要真机实测
2. banner PNG 图标缺失 (CSS fallback 可用)
3. 部分遗物 PREREQS 条件链需定期审查

## 资产材料

- `ART_DIRECTION.md` — 美术方向
- `ASSET_MANIFEST.md` — 资产清单
- `ART_PROMPTS.md` — 提示词 (待批量生成)
- `assets/` — concept/ui/portraits/sprites/vfx
