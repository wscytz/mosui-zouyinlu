# 墨祟：走阴录 — v9.x 剩余任务包

> 历史归档：此文件记录 v9.x 时期任务，不作为当前 v13.1 开发来源。当前路线看 `ROADMAP.md`，当前规范看 `STRUCTURE_RULES.md`。

> v10.0之前必须先完成这些v9.x P2任务。

## 任务A: Boss行为微调（v9.3）

### 目标
基于当前Boss战斗数据，调整3个Boss的行为使其更有节奏感和策略深度。

### 当前Boss数据（gamedata.js ETYPE）
- **画皮娘子 huapi**: HP 320, 模仿(mimic)，分身
- **墨将军 mojiangjun**: HP 480, 墨盾(shieldRegen)
- **墨鬼王 moguiwang**: HP 500, 脉冲弹

### 调整内容

#### A1: 画皮娘子 — 分身时机优化
当前：初始分身。改为：HP<60%时分身，给玩家输出窗口。
- 文件：game.js，搜索 `huapi` 或 `mimicReveal`
- 逻辑：在画皮的update中，当 `e.hp <= e.maxHp * 0.6 && !e._mimicDone` 时触发模仿显形+分身

#### A2: 墨将军 — 墨盾节奏调整
当前：周期性回盾。改为：盾破后有8秒空窗期（不回盾），让玩家有集火窗口。
- 文件：game.js，搜索 `shieldRegen` 或 `shieldCd`
- 逻辑：在shieldBreak时设置 `e.shieldCd = 480`（8秒@60fps），shieldCd倒计时期间不回盾
- 当前可能是 `e.shieldCd=e.shieldRegen`，改为更大的值

#### A3: 墨鬼王 — 新增绝望阶段特殊攻击
当前：HP<25%狂暴。新增：绝望时每5秒释放一圈追踪弹（8方向）。
- 文件：game.js，搜索 `moguiwang` 或 `desperate`
- 逻辑：在Boss update的狂暴/绝望分支中，`g.time % 300 === 0` 时释放8方向追踪弹
- 参考现有Boss 8方向弹（搜索 `bossChargeRange` 或 `for(var ba=0;ba<8;ba++`）

### 验证
- 画皮在60%HP才分身，前期可安全输出
- 墨将军盾破后有明显空窗
- 墨鬼王绝望阶段更凶猛
- smoke_test 44项全绿
- content_test 236项全绿

---

## 任务B: 难度评估 — "炼狱"模式（v9.4）

### 目标
在现有3难度（平常/险途/噩梦）基础上，新增第4难度"炼狱"。

### 实现位置
- **gamedata.js**: DIFFICULTY定义、WAVE_SCALE等
- **game.js**: 难度选择UI、难度影响逻辑
- **game.html**: 难度选择按钮

### 炼狱难度参数（在现有噩梦基础上再强化）
```javascript
// 在gamedata.js的难度定义中添加
"purgatory": {
  label: "炼狱",
  hpMult: 2.0,       // 敌人HP倍率（噩梦1.5）
  spdMult: 1.4,       // 敌人速度倍率（噩梦1.2）
  eliteBonus: 0.3,    // 精英额外概率（噩梦0.18）
  playerHpMult: 0.7,   // 玩家HP倍率（噩梦0.8）
  relicSlots: 5,       // 遗物上限（噩梦6）
}
```

### 需要修改的位置
1. gamedata.js: DIFFICULTIES数组添加"purgatory"选项
2. game.html: 难度选择区域添加第4个按钮
3. game.js: 搜索 `diff==="hard"` 或 `diff==="nightmare"` 的地方，添加purgatory分支
4. 测试: content_test.js中如果有难度相关断言需更新

### 验证
- 标题页显示4个难度按钮
- 炼狱难度下敌人明显更强
- 玩家HP降低、遗物槽减少
- smoke 44项 + content 236项全绿

---

## 优先级
A（Boss微调）→ B（炼狱难度）→ 然后进v10.0
