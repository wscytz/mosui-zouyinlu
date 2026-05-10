# Relic Spec Schema v0

结构化描述一个遗物，代替 agent 直接输出代码。validator 和 generator 都基于本 schema。

## 文件位置

```text
.claude/tmp/relic-<id>.spec.json
```

格式 JSON。注释只允许通过 `comment` 字段承载。

## 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✓ | camelCase，不能和 RELICS 已有 id 冲突 |
| `name` | string | ✓ | 中文名 |
| `type` | string | ✓ | 墨具/符具/甲具/魂器/盾具/饰具/芝具/域具 等 |
| `tags` | array[string] | ✓ | 2-3 个，至少 1 个是当前空缺冷标签 |
| `effect` | string | ✓ | UI 短描述，中文 |
| `trigger` | object | ✓ | 触发点，见下 |
| `effect_template` | object | ✓ | 效果模板，见下 |
| `icon` | object | ✓ | 图标配置，见下 |
| `props` | array[object] | ✓ | mkPlayer/ck 字段，见下 |
| `test_intent` | array[string] | ✓ | 测试项，见下 |
| `comment` | string | ✗ | 设计说明，仅用于 review，不写入代码 |

## trigger

```json
"trigger": {
  "kind": "hitE | hurtP | pAtk | onEnemyKilled | damageEnemy | waveClear | tick",
  "condition": "可选 — 附加判定表达式，如 atk.split / !e.isBoss / p.hp<p.maxHp*0.5",
  "chance": 0.0
}
```

- `kind` 枚举：
  - `hitE` — 玩家攻击命中敌人
  - `hurtP` — 玩家受伤
  - `pAtk` — 玩家生成攻击
  - `onEnemyKilled` — 击杀敌人
  - `damageEnemy` — 伤害敌人（damageEnemy 函数入口，包括 DoT）
  - `waveClear` — 波次结束
  - `tick` — 每帧
- `condition` 只能引用当前触发点已有的变量（atk/e/p/g/src/opts），不能编造
- `chance` 取值 0-1，省略视为 1

## effect_template

所有模板都以 `kind` 开头：

### splash_damage

```json
"effect_template": {
  "kind": "splash_damage",
  "radius_ref": "splashBoom",
  "radius_mult": 0.64,
  "damage_expr": "Math.max(1,Math.ceil(atk.dmg*0.45))",
  "damage_src": "splitBoom",
  "particles": ["fire:5", "accent:3"],
  "shake": null
}
```

- `radius_ref` 必须是 RANGES 里的 key
- `damage_expr` 支持 `p.stats.dmg`/`atk.dmg`/数字常量
- `damage_src` 是 damageEnemy 的 src 参数，任意字符串

### heal

```json
"effect_template": {
  "kind": "heal",
  "amount": 1,
  "particles": ["moss:3"],
  "float_text": "+1"
}
```

### heal_overflow_route

```json
"effect_template": {
  "kind": "heal_overflow_route",
  "route": "damage | shield",
  "multiplier": 3,
  "radius_ref": "splashBoom",
  "radius_mult": 0.64,
  "damage_src": "healBoom"
}
```

只能用在 onEnemyKilled + 已有 heal 路径上。

### shield_timer

```json
"effect_template": {
  "kind": "shield_timer",
  "ticks_default": 180,
  "damage_mult": 0.5,
  "refresh_on_trigger": true,
  "tick_field": "hurtShieldTicks"
}
```

### dot_accum_boom

```json
"effect_template": {
  "kind": "dot_accum_boom",
  "threshold": 30,
  "sources": ["frost", "fire", "dot"],
  "boom_damage_expr": "Math.ceil(e._dotAccum*0.5)",
  "radius_ref": "splashBoom",
  "radius_mult": 0.5,
  "enemy_flag": "_dotBoomed"
}
```

### retaliate

```json
"effect_template": {
  "kind": "retaliate",
  "radius_ref": "retaliate",
  "damage_expr": "5",
  "damage_src": "retaliate",
  "inv_timer": 60
}
```

### set_buff_timer

```json
"effect_template": {
  "kind": "set_buff_timer",
  "field": "breathTicks",
  "ticks": 360
}
```

### fire_proj

```json
"effect_template": {
  "kind": "fire_proj",
  "proj_kind": "split | tracking",
  "count": 3,
  "dmg_expr": "Math.floor(atk.dmg*0.35)"
}
```

## icon

```json
"icon": {
  "template": "orb | slash | ring | split | shield | flame | drop | burst | scroll",
  "primary": "ink | accent | paper",
  "secondary": "ink | accent | paper"
}
```

template 的 CSS 细节见 `icon-templates.md`。

## props

```json
"props": [
  {"name": "splitHitHeal", "type": "bool", "default": false},
  {"name": "hurtShieldTicks", "type": "int", "default": 0}
]
```

- `type` 只接受 bool / int / float
- 每个 prop 都会进 mkPlayer 默认值和 ck 数组
- 第 1 个 prop 通常是 effect 开关（布尔），后续是计数器

## test_intent

```json
"test_intent": ["relic_exists", "tags_valid", "has_fn", "fn_sets_prop"]
```

枚举：

- `relic_exists` — RELICS.find 能找到
- `tags_valid` — r.tags.length >= 2
- `has_fn` — typeof r.fn === "function"
- `fn_sets_prop` — 调用 fn 后 `p[props[0].name]` === 预期

所有 4 项都是默认集合，通常全开。

## 完整示例

参考 `relic-examples.md`。
