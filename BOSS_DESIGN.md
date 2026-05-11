# Boss / 精英战设计文档 v5.2

> 本文档是 v5.2-boss 的设计参考，不直接改代码。改动前先写测试切片。

## 现有 Boss 机制总结

### 3 个 Boss

| Boss | HP | 速度 | 伤害 | 特殊 |
|------|-----|------|------|------|
| 画皮娘子 (boss) | 320 | 1.4 | 12 | enrage(50%HP加速) + desperate(25%HP冲锋) |
| 墨将军 (mojiangjun) | 480 | 0.8 | 15 | 3阶段AI (60%/25% HP切换) |
| 墨鬼王 (moguiwang) | 500 | 0.75 | 18 | 3阶段AI (60%/25% HP切换) |

### 阶段系统

- `bossPhase2Hp: 0.6` — HP 降到 60% 进入 phase 2
- `bossPhase3Hp: 0.25` — HP 降到 25% 进入 phase 3
- 画皮娘子用 enrage/desperate 而非 phase 系统
- 墨将军/墨鬼王用 `mjjPhase`/`mgwPhase` 变量驱动行为切换

### TUNING 常量

```
bossEnrageHp: 0.5        — 画皮 enrage 阈值
bossDesperateHp: 0.25    — 画皮 desperate 阈值
bossEnrageSpdMult: 1.3   — enrage 加速倍率
bossChargeSpd: 5.5       — 冲锋速度
bossChargeDur: 14        — 冲锋持续帧
bossPrepDur: 20          — 冲锋预备帧
bossChargeRange: 200     — 冲锋触发距离
bossNormalAtkInterval: 140 — 普攻间隔帧
bossPhase2Hp: 0.6        — phase 2 阈值
bossPhase3Hp: 0.25       — phase 3 阈值
```

### 现有演出

- Boss 入场：肖像卡 + 判词（120帧）
- Boss 击杀：celebration 过场（120帧肖像+判词+Grade弹入）
- 击杀顿帧：22帧冻结 + slowMo 30帧
- 死亡粒子：16粒子 + 8精英金粒子

## 精英系统

- 精英概率：`eliteBaseChance + wave * eliteWaveScale + diffBonus`
- 精英标记：`e.elite = true`
- 精英效果：HP×2, 速度×1.15, 伤害×1.3, 金色边框
- 精英击杀：额外粒子 + `eliteKillBurst` 遗物触发

## v5.2 改进方向（候选，不全做）

### A. Boss 记忆点增强（低风险）

目标：让每个 Boss 有更明确的"签名招式"，玩家能记住。

1. **画皮娘子**：desperate 阶段加"分身"——生成 2 个低 HP 幻影，幻影死后消失不掉落。
2. **墨将军**：phase 3 加"墨阵护盾"——每 5 秒生成一个墨盾，吸收 50 伤害后碎裂。
3. **墨鬼王**：phase 3 加"墨潮脉冲"——每 3 秒向四周释放减速波，玩家需要闪避。

### B. 精英变体（中风险）

目标：让精英不只是"数值放大版普通怪"。

1. 精英随机获得 1 个 `eliteAbility`：沿用现有 `blink`(瞬移) / `deathburst`(死亡爆) / `enrage`(低血狂暴) / `armored`(护甲)
2. 精英击杀奖励：必定掉落 1 个临时 buff（攻速/移速/回血）

### C. Mini-Boss 波次（高风险）

目标：在非 Boss 波次加入 mini-boss 遭遇。

- 第 4/7 波有概率出现 mini-boss（HP 150-200，有 1 个签名招式）
- 需要新增 ETYPE 条目 + AI 代码

## 推荐实施顺序

1. **A1 画皮分身** ✅ 已实装 (v5.3)
   - desperate 触发时 spawn 2 个 clone（hpMul=0.12, isClone=true）
   - clone: isBoss=false, name+="·影", col 半透明, desperate+enraged
   - 不触发 Boss 击杀/结算/演出
   - wave_test Test 6 覆盖（clone 数量/isBoss/HP/名字后缀）
2. **B2 精英击杀奖励** ✅ 已实装 (v5.3)
   - 精英击杀后随机 180帧 buff：疾(移速)/锐(攻速)/愈(+8HP)
3. **再做 A2/A3**（墨将军护盾/墨鬼王脉冲）：中风险，放 v5.4。
4. **最后考虑 C**：需要新 ETYPE + AI，风险大，放 v5.4+。

## 测试切片（实施前先写）

```js
// Boss 分身测试：画皮 desperate 后应有 2 个 type==="boss" 且 hp<50 的幻影
// 精英能力测试：精英 spawn 后应有 blink/deathburst/enrage/armored 之一
// Mini-boss 测试：第 4/7 波有概率出现 midBoss=true 的敌人
```

## 不做的事

- 不改 Boss HP/伤害数值（平衡调整放 v5.3）
- 不改波次生成核心逻辑
- 不改 WAVE_BUDGETS 结构
- 不加新 Boss（3 个够了，先让现有 Boss 更有记忆点）

## 依赖

- 画皮分身需要 `spawnsOnDeath` 或新的 `bossClone` 字段
- 精英能力优先复用已有字段：`eliteAbility` + `blinkT` / `pendingDeathbursts` / `enraged` / `armorMult`
- 测试需要能 force-spawn 特定 Boss 到特定 HP
