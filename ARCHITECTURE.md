# 墨祟：走阴录 — 架构文档 v4.0

## 分层总览

```
┌─────────────────────────────────────────────────┐
│  Platform (platform layer)                       │
│  Capacitor / 浏览器 / APK                        │
├─────────────────────────────────────────────────┤
│  UI (DOM)                                        │
│  game.html + game.css                            │
│  HUD / 遮罩层 / 按钮 / 卡片 / 图片槽位            │
├─────────────────────────────────────────────────┤
│  Render (canvas)                                 │
│  game.js render() L1938-2896                     │
│  mobile-controls.js _renderMobileControls()      │
├─────────────────────────────────────────────────┤
│  Core (game loop)                                │
│  game.js update() L1271-1850                     │
│  战斗 / 碰撞 / 敌人AI / 波次推进                  │
├─────────────────────────────────────────────────┤
│  Input                                           │
│  桌面: game.js keys/mouse L97-101                │
│  移动: mobile-controls.js → _mobileInput         │
│  统一消费点: game.js update() L1210-1270          │
├─────────────────────────────────────────────────┤
│  Data                                            │
│  gamedata.js (WEAPONS/RELICS/ETYPE/WAVES/...)    │
│  game.js CAPS/LIMITS/RANGES/TUNING (L102-145)    │
├─────────────────────────────────────────────────┤
│  Art Assets                                      │
│  assets/ (concept/ui/portraits/sprites/vfx)     │
│  ART_DIRECTION.md / ASSET_MANIFEST.md            │
│  generate-assets.js 生图脚本                     │
└─────────────────────────────────────────────────┘
```

## Data 层

**文件**: `gamedata.js` (551 行)

存放所有游戏内容数据表。被 `game.html` 和 `wiki.html` 共同引用。

| 数据 | 用途 | 数量 |
|------|------|------|
| WEAPONS | 武器定义 | 4 |
| RELICS | 遗物定义 | ~92 |
| EVOLUTIONS | 进化定义 | 20 |
| ETYPE | 敌人模板 | 28 (25敌人+3首领) |
| STAGE_MODS | 关卡调制器 | 9 |
| CURSES | 誓印 | 17 |
| ACHIEVEMENTS | 成就 | 27 |
| WAVES | 波次生成规则 | 动态 |
| PREREQS | 遗物前置条件 | 30 |
| JUDGMENTS | 判词文本池 | ~30 |

**规则**: 不写依赖 DOM/canvas 的逻辑，不写游戏流程控制。

**game.js 内嵌常量** (L102-145):
- `CAPS` — 7 项封顶值（atkCdFloor/critRate/bellCombo 等）
- `LIMITS` — 10 类对象上限（particles/fires/attacks 等）
- `RANGES` — 17 项距离阈值
- `TUNING` — 70+ 项可调参数
- `WAVE_SCALE` — 2 项波次缩放

## Input 层

桌面和移动端各有独立的输入采集，统一在 `update()` 中消费。

### 桌面端

**文件**: `game.js` L97-101, L1236-1291

```
keys{} → WASD/方向键 → dx/dy
mouse{x,y,down} → 鼠标位置 → facing + attacking
键盘 空格/Shift → startDodge()
```

事件监听在 `init()` 中绑定 (keydown/keyup/mousemove/mousedown/mouseup)。

### 移动端

**文件**: `mobile-controls.js` (507 行)

```
canvas touchstart/move/end
  → handleTouches()
  → 左摇杆: sticks.left → input.dx/dy
  → 右摇杆: sticks.right → input.aimAngle + input.attacking
  → 闪避按钮(DOM): requestMobileDodge() → input.dodgeRequest

_tickMobileAutoAim() (每帧)
  → nearestAimVector() (锁敌黏性)
  → lerpAngle() (角度平滑)
  → input.autoAtk + input.aimAngle
```

输出到 `window._mobileInput`:
```javascript
{
  active, dx, dy, aimAngle,
  attacking, autoAtk,
  dodging, dodgeRequest,
  leftActive, rightActive, lastAimMode,
  sensitivity (getter/setter)
}
```

### 消费点

`game.js` `update()` L1236-1291 统一读取：

```javascript
var mob = window._mobileInput;
if (mob && mob.active) { dx = mob.dx; dy = mob.dy; }
else { /* 键盘 */ }
// facing: mob aimAngle || 鼠标角度
// 攻击: mob.attacking || mob.autoAtk || mouse.down
// 闪避: mob.dodgeRequest || 键盘空格
```

## Core 层

**文件**: `game.js` `update()` L1149-1804 (~655 行)

### 状态机

```
playing → waveClear → (选遗物) → playing → ... → victory/over
        ↘ paused → playing
dying → over (死亡动画)
```

### 战斗函数

| 函数 | 行 | 职责 |
|------|-----|------|
| `pAtk(g)` | L841 | 玩家攻击生成 |
| `hitE(g,atk,e)` | L1023 | 攻击命中敌人 |
| `hurtP(g,dmg,src)` | L979 | 玩家受伤 |
| `damageEnemy(g,e,dmg,src)` | L721 | 敌人扣血 |
| `onEnemyKilled(g,e,src)` | L595 | 击杀结算 |
| `startDodge(g,dx,dy)` | L1116 | 闪避启动 |
| `addAttack(g,atk)` | L584 | 注册攻击到池 |
| `pushAttack(g,atk)` | L76 | 带边界检查的攻击入池 |

### 波次/关卡

| 函数 | 行 | 职责 |
|------|-----|------|
| `startWave(g)` | L754 | 波次启动 |
| `cleanupWave(g)` | L745 | 波次清理 |
| `spawnEnemy(g,type,opts)` | L295 | 生成敌人 |
| `mkMinion(...)` | L341 | 生成召唤物 |
| `startStage(g,w)` | L364 | 关卡调制器启动 |
| `updateStage(g)` | L442 | 关卡更新（事件/环境） |
| `renderStage(g,c)` | L481 | 关卡渲染 |

### 辅助

| 函数 | 职责 |
|------|------|
| `mkPlayer()` L181 | 创建玩家对象 |
| `newGame(wid,diff)` L245 | 创建游戏状态 |
| `rebuildPlayerStats(g)` L3334 | 从遗物重建 stats |
| `moveScale(p)` L15 | 计算实际移速 |
| `perfPressure/perfMul/markPerf` L36-60 | 性能监控 |

## Render 层

**文件**: `game.js` `render()` L1805-2896 (~1090 行)

分层渲染顺序（由远到近）：

1. 背景 + 关卡环境 (ink pool / ash / mask)
2. 火场 (fires)
3. 冰霜区 (frosts)
4. 地面效果 (风区/阴兵/纸剑)
5. 敌人阴影
6. 敌人本体 + 血条
7. 玩家阴影 + 本体 + 武器
8. 攻击特效 (近战弧/弹道/AOE/墨灵)
9. 粒子
10. 浮动文字 (伤害/判词/连段)
11. 画面震动 + 屏幕闪烁
12. 小地图
13. HUD 背景条
14. 移动端控件覆盖 (mobile-controls.js)
15. 调试面板 (F3)
16. Boss 血条

性能保护：`perfMul(g)` 返回 0.25-1.0 的乘数，高负载时自动跳过装饰性阴影和粒子。

## UI 层

**文件**: `game.html` (160 行) + `game.css` (2030 行)

### DOM 结构

```
#titleScreen        — 标题页
#weaponSelect       — 武器选择
#gameContainer      — 游戏区（canvas + HUD + 移动按钮）
  #gameCanvas       — 主画布
  #hud              — 顶部信息条（血条/武器/波次/斩杀数）
  #hudRelics        — 遗物标签
  #hudBuffs         — buff 图标
  #hudBossName      — Boss 名称
  #mobilePauseBtn   — 移动端暂停
  #mobileDodgeBtn   — 移动端闪避
#relicPopup         — 遗物选择弹窗
#cursePopup         — 誓印选择弹窗
#gameOver           — 结算页
#pauseOverlay       — 暂停页
```

### HUD 更新

`updateHUD(g)` L2951-3035 — 每帧调用，带脏检查防止每帧写 DOM。

### 遗物/进化选择

- `scoreRelicChoice()` L3126 — 打分
- `pickRelicChoices()` L3209 — 加权随机选3个
- `showRelic(g)` L3250 — DOM 渲染卡片
- `relicCardHtml()` L3233 — 卡片 HTML

## Platform 层

### 浏览器

直接打开 `game.html`。输入走键鼠。`needsMobileUI()` 返回 false。

### Android APK (Capacitor)

- `android/` — Capacitor 8.x 项目
- `www/` — Capacitor 资源目录（同步自根目录）
- `android/app/src/main/assets/public/` — 热更新资源

**构建流程**:
```bash
cp game.js game.css game.html mobile-controls.js www/
cp game.js game.css game.html mobile-controls.js android/app/src/main/assets/public/
cd android && ./gradlew assembleDebug
```

APK 输出: `android/app/build/outputs/apk/debug/app-debug.apk`

**移动端检测链**:
1. `window.Capacitor.isNativePlatform()` → true → 初始化摇杆
2. URL `?mobile=1` 调试标志
3. `body.is-mobile-ui` class 控制 CSS 切换
4. `_loadLog` 诊断系统追踪启动链

## 文件依赖关系

```
sound.js ──────┐
gamedata.js ───┤
game.js ───────┼──→ game.html
mobile-controls.js ─┘
                    │
                    ├── index.html (首页，用 app.js + styles.css)
                    └── wiki.html (百科，用 gamedata.js + styles.css)
```

脚本加载顺序（HTML 中定义）：
1. `sound.js` — 音效系统
2. `gamedata.js` — 数据表
3. `game.js` — 核心逻辑 + 启动
4. `mobile-controls.js` — 移动端控件

game.js 在 `init()` 末尾尝试初始化摇杆（fallback），mobile-controls.js 也自行检测初始化。两者不会重复初始化（`_mobileInput` 存在则跳过）。

## 预留插槽

当前已经完成“分层”和“分区”，下一步要补的是“预留位”。预留位的原则很简单：以后再加内容时，优先挂到固定入口，不再新增一堆平行全局变量。

### 运行时命名空间

统一使用 `window.MOSUI` 存放跨层共享的稳定入口：

| 命名空间 | 用途 | 预留内容 |
|----------|------|----------|
| `MOSUI.hooks` | 生命周期插槽 | `beforeUpdate / afterUpdate / beforeRender / afterRender` |
| `MOSUI.input` | 输入适配 | `buildFrame`、当前输入快照、移动端输入状态 |
| `MOSUI.platform` | 平台能力 | `isNative`、`safeArea`、`orientation`、`haptics` |
| `MOSUI.profiles` | 参数档位 | `control`、`render`、`ui` 的未来配置表 |
| `MOSUI.ui` | 界面桥接 | HUD / overlay / modal 未来 API |
| `MOSUI.debug` | 调试入口 | 启动链日志、输入诊断、性能观测 |

### 现在就该预留的三个方向

1. **控制档位**
   - 把摇杆死区、回正速度、自动瞄准黏性、按钮尺寸收进 `profiles.control`
   - 以后 APK、手机浏览器、平板就能走不同档位，但不拆逻辑

2. **渲染档位**
   - 把 `_pm` 门控继续收口到 `profiles.render`
   - 以后想加 `low / balanced / high` 三档，不需要继续散改 `render()`

3. **平台能力**
   - `visibilitychange`、`blur`、`safe-area`、`haptics`、`orientation` 继续归平台层
   - 这样网页端和 APK 的差异不会再渗进核心战斗

### 未来扩展的默认接法

- 新输入方式先接 `MOSUI.input`
- 新视觉档位先接 `MOSUI.profiles.render`
- 新平台特性先接 `MOSUI.platform`
- 新 UI 状态先接 `MOSUI.ui`
- 新调试面板先接 `MOSUI.debug`

这样以后做录像、AI 演示、控制器适配、主题包，都不会再长出第二套平行结构。

## 测试体系

| 文件 | 类型 | 数量 | 运行方式 |
|------|------|------|----------|
| smoke_test.js | 冒烟+长跑 | 37 | Node.js |
| wave_test.js | 波次流程 | 5 | Node.js |
| content_test.js | 内容静态 | 135 | Node.js |
| stress_test.js | 压力极限 | 10 | Node.js |

总计 **187 项**。全部不依赖 DOM，用 mock canvas 运行。

## 关键不变量

1. 攻击入池必须走 `pushAttack()` / `addAttack()`，禁止直接 `push()`。
2. 火场入池走 `addFire()`；敌弹入池走 `addEProj()`。
3. 新增遗物有前置机制时必须同步更新 `PREREQS`。
4. 高频碰撞用 `dstSq()`，热路径禁用 `Math.sqrt()`。
5. 波次清理只清瞬时对象，长期构筑必须显式保留判断。
6. 移动端输入和桌面输入在 `update()` 中统一消费，互不干扰。
7. render 每帧开头 `c.save()` + translate shake offset，结尾 `c.restore()`。
