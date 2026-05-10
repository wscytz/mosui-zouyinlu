# Relic Spec Examples

从已实现遗物反推的 spec 示例，agent 可以照抄结构。

## 示例 1 — 分裂+生命（简单模板型）

已实现为 `molieshengfu`（墨裂生符）。分裂弹命中有概率回血。

```json
{
  "id": "molieshengfu",
  "name": "墨裂生符",
  "type": "符具",
  "tags": ["分裂", "生命"],
  "effect": "分裂弹命中敌人时18%几率回复1点生命",
  "trigger": {
    "kind": "hitE",
    "condition": "atk.split",
    "chance": 0.18
  },
  "effect_template": {
    "kind": "heal",
    "amount": 1,
    "particles": ["moss:3"],
    "float_text": "+1"
  },
  "icon": {
    "template": "split",
    "primary": "accent",
    "secondary": "ink"
  },
  "props": [
    {"name": "splitHitHeal", "type": "bool", "default": false}
  ],
  "test_intent": ["relic_exists", "tags_valid", "has_fn", "fn_sets_prop"],
  "comment": "分裂 + 治疗最直接的组合；chance 要低，避免 ranged 构筑过强。"
}
```

## 示例 2 — 治疗+爆炸（复用已有机制点，创新型）

已实现为 `moyingyi`（墨盈溢）。治疗溢出转 AOE 伤害。创新点：同一个 overflow 字段，已有 `healToShield` 走护盾，本遗物走伤害。

```json
{
  "id": "moyingyi",
  "name": "墨盈溢",
  "type": "墨具",
  "tags": ["治疗", "爆炸"],
  "effect": "满血时受到治疗，溢出部分转化为3倍伤害墨爆溅射到周围",
  "trigger": {
    "kind": "onEnemyKilled"
  },
  "effect_template": {
    "kind": "heal_overflow_route",
    "route": "damage",
    "multiplier": 3,
    "radius_ref": "splashBoom",
    "radius_mult": 0.64,
    "damage_src": "healBoom"
  },
  "icon": {
    "template": "orb",
    "primary": "paper",
    "secondary": "accent"
  },
  "props": [
    {"name": "healOverflowBoom", "type": "bool", "default": false}
  ],
  "test_intent": ["relic_exists", "tags_valid", "has_fn", "fn_sets_prop"],
  "comment": "必须在 killHealChance 触发点附近落地；和 healToShield 是分叉路由关系。"
}
```

## 示例 3 — 持续+爆炸（DoT 蓄能，创新型）

已实现为 `mofenyu`（墨焚域）。DoT 累计 30 触发敌人爆炸。创新点：把看似纯数值的持续伤害变成蓄能器。

```json
{
  "id": "mofenyu",
  "name": "墨焚域",
  "type": "域具",
  "tags": ["持续", "爆炸"],
  "effect": "持续伤害累计30点后，该敌人引爆，对周围造成累计伤害一半的AOE",
  "trigger": {
    "kind": "damageEnemy"
  },
  "effect_template": {
    "kind": "dot_accum_boom",
    "threshold": 30,
    "sources": ["frost", "fire", "dot", "splitDot", "wideHeal"],
    "boom_damage_expr": "Math.ceil(e._dotAccum*0.5)",
    "radius_ref": "splashBoom",
    "radius_mult": 0.5,
    "enemy_flag": "_dotBoomed"
  },
  "icon": {
    "template": "ring",
    "primary": "ink",
    "secondary": "paper"
  },
  "props": [
    {"name": "dotAccumBoom", "type": "bool", "default": false}
  ],
  "test_intent": ["relic_exists", "tags_valid", "has_fn", "fn_sets_prop"],
  "comment": "enemy_flag 防止重复触发；sources 是 damageEnemy src 参数的白名单。"
}
```

## 示例 4 — 持续+防御（计时器型）

已实现为 `mohunjia`（墨魂甲）。

```json
{
  "id": "mohunjia",
  "name": "墨魂甲",
  "type": "甲具",
  "tags": ["持续", "防御"],
  "effect": "受伤后3秒内再受伤减伤50%，每次受伤刷新时长",
  "trigger": {
    "kind": "hurtP"
  },
  "effect_template": {
    "kind": "shield_timer",
    "ticks_default": 180,
    "damage_mult": 0.5,
    "refresh_on_trigger": true,
    "tick_field": "hurtShieldTicks"
  },
  "icon": {
    "template": "shield",
    "primary": "ink",
    "secondary": "accent"
  },
  "props": [
    {"name": "hurtShieldActive", "type": "bool", "default": false},
    {"name": "hurtShieldTicks", "type": "int", "default": 0}
  ],
  "test_intent": ["relic_exists", "tags_valid", "has_fn", "fn_sets_prop"],
  "comment": "两个 prop：开关 + 计时器。计时器需要主 Claude 在 player tick 里自行递减。"
}
```
