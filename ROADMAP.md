# 墨祟：走阴录 路线书 v12.0

> 这份文档驱动开发节奏。

## 现状 (v11.1)

- **内容体量**: 5武器 / 203遗物 / 47敌人(含3Boss) / 9关卡 / 28誓印 / 52成就 / 4难度(含炼狱)
- **代码规模**: game.js 5435行 / gamedata.js 894行 / game.css 2446行
- **测试基线**: 44 smoke + 236 content（全绿）
- **技术栈**: Canvas 2D (960x640), 纯手写, 零框架, IIFE 单文件运行时
- **模式**: 普通/无尽/每日种子(mulberry32 PRNG)
- **社交**: 结算截图PNG / 战斗回放近5局 / 本地排行榜前20 / 无尽独立榜
- **远程仓库**: https://github.com/wscytz/mosui-zouyinlu

---

## 已完成阶段

### v3.x-v6.x 基建期
- 封面、Boss肖像、CSS统一、波次演出、Agent自动化、构筑深化、音效补全

### v7.0-v7.18 战斗反馈 + 性能优化
- 连杀里程碑(6级)、暴击/闪避统计、评分公式优化、forEachLiveEnemy统一

### v8.0 发布收口（内部标记）
- Boss血条Canvas、版本号显示、Boss阶段提示、低血量警告、结算评级动画

### v9.0-v9.4 内容深度扩充
- v9.0: 3誓印+5成就+2舞台危害
- v9.1: 4新敌人+4特殊能力(chainLightning/soulHarvester/cloneOnHalf/vampiric)
- v9.2: 10武器专属遗物+PREREQS weaponType限定
- v9.3: Boss行为微调(画皮60%分身/墨将军8秒盾空窗/墨鬼王8方向弹)
- v9.4: 炼狱难度(hpM 2.0/spdM 1.4/dmgM 1.55)+成就"炼狱行者"

### v10.0 视觉升级
- T1 结算截图(Canvas→PNG下载)
- T2 粒子升级(暴击金粒/Boss 16向弹/连杀冲击波)
- T3 5武器视觉差异化(性能门控_pm>=0.5)
- T4 战斗回放(localStorage近5局)
- T5 本地排行榜(calcScore抽离/评级排序前20)
- T6 敌人画像补全(47/47)

### v11.0 无尽模式 + 每日种子
- T1 无尽模式(URL参数+无尽波生成+3成就15/25/50波)
- T2 无尽难度递增(每波+10%hp/+5%spd/+8%dmg)+UI checkbox
- T3 无尽独立排行榜(tab切换)
- 每日种子标记+连签成就"三朝走阴"
- 真每日种子(mulberry32 PRNG seeded from date string)

---

## 下一阶段: v12.0 体验补全

**目标**: 不扩内容量，补全体验缺口，准备APK发布

### A. 收口（进行中）

| 项 | 状态 |
|----|------|
| 真每日种子RNG | done — mulberry32 seeded from date, swap in startWave |
| ROADMAP更新 | done — 从v7.0更新到v12.0 |
| DEVDOC同步 | todo — 补v11.0/v11.1段 |
| Wiki同步核查 | todo — 52成就/4难度/无尽/每日 |
| www/同步 | todo — npm run www |

### B. 体验补全（计划中）

| 优先级 | 改动 | 说明 | 行数预算 |
|--------|------|------|---------|
| P0 | 成就解锁弹窗 | 当前成就解锁无反馈，结算页才看到 | ~15行 |
| P1 | 关卡调制器×2 | gamedata.js STAGE_MODS扩展，不改game.js | 0行game.js |
| P1 | 每日种子真checkbox | game.html加每日勾选框（现只有链接） | ~2行 |
| P2 | 首局教学引导 | 首次进入显示操作提示overlay | ~25行 |
| P2 | 移动端真机适配 | 真机测试横屏/触控 | 0行(验证) |
| P2 | APK打包 | cap:sync → Android Studio编译 | 0行(流程) |

game.js当前5435行，余65行空间。P0+P1约17行，安全。

---

## 远期路线 (v13.0+)

| 方向 | 前置条件 |
|------|---------|
| 第6武器 | game.js模块拆分（需抽1000+行到独立文件释放空间） |
| 第4/5 Boss | 同上 |
| 多人概念 | 技术评估 |
| Mod支持 | 数据驱动编辑器 |

---

## 开发规范

每个版本必须：
1. 改代码 → 优先gamedata.js，必要时改game.js
2. 跑测试 → `node smoke_test.js` + `node content_test.js`
3. 同步构建 → `npm run www`
4. 提交 → `git add` + `git commit`（wscytz身份，无AI署名）
5. 推送 → `git push origin main`（设代理 `http.proxy 127.0.0.1:7897`）

## 红线

- 不改hitE/hurtP/spawnWave核心结构
- game.js ≤ 8000行
- 改动攒波提交，不逐个推送
- 敏感文件不上传
