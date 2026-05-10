# Icon Templates

所有遗物图标必须走模板，不允许自由写 CSS。

## 共同规则

- 选择器：`.relic-pick[data-icon="ID"] .ink-icon::before` 和 `::after`（两个都必须有）
- 颜色：仅 `var(--ink)` / `var(--accent)` / `var(--paper)` / `var(--game-bg)`
- 允许属性：`width` / `height` / `background` / `border` / `border-radius` / `transform` / `margin`
- 禁止属性：`content` / `position` / `box-shadow` / `inset` / `opacity` / `top` / `left` / `right` / `bottom`
- 禁止色值：`#xxx` / `rgb()` / `rgba()` / `hsl()`

## 模板列表

所有模板以 `ID` / `PRIMARY` / `SECONDARY` 为占位。生成时替换。

### orb — 圆球

```css
.relic-pick[data-icon="ID"] .ink-icon::before { width:14px;height:14px;background:var(--PRIMARY);border-radius:50%;margin:5px auto 0 }
.relic-pick[data-icon="ID"] .ink-icon::after { width:6px;height:6px;background:var(--SECONDARY);border-radius:50%;transform:translate(4px,-11px) }
```

### ring — 环

```css
.relic-pick[data-icon="ID"] .ink-icon::before { width:14px;height:14px;border:2px solid var(--PRIMARY);border-radius:50%;background:transparent;margin:5px auto 0 }
.relic-pick[data-icon="ID"] .ink-icon::after { width:4px;height:4px;background:var(--SECONDARY);border-radius:50%;transform:translate(5px,-11px) }
```

### shield — 菱形盾

```css
.relic-pick[data-icon="ID"] .ink-icon::before { width:14px;height:14px;background:var(--PRIMARY);border:2px solid var(--SECONDARY);border-radius:3px;transform:rotate(45deg);margin:6px auto 0 }
.relic-pick[data-icon="ID"] .ink-icon::after { width:6px;height:6px;background:var(--SECONDARY);border-radius:50%;transform:translate(4px,-13px) }
```

### flame — 火焰（水滴翻转）

```css
.relic-pick[data-icon="ID"] .ink-icon::before { width:12px;height:12px;background:var(--PRIMARY);border-radius:50% 50% 50% 0;transform:rotate(-45deg);margin:6px auto 2px }
.relic-pick[data-icon="ID"] .ink-icon::after { width:4px;height:4px;background:var(--SECONDARY);border-radius:50%;transform:translate(4px,-10px) }
```

### drop — 水滴

```css
.relic-pick[data-icon="ID"] .ink-icon::before { width:10px;height:12px;background:var(--PRIMARY);border-radius:50% 50% 50% 0;transform:rotate(45deg);margin:6px auto 0 }
.relic-pick[data-icon="ID"] .ink-icon::after { width:4px;height:4px;background:var(--SECONDARY);border-radius:50%;transform:translate(4px,-10px) }
```

### burst — 爆散（十字）

```css
.relic-pick[data-icon="ID"] .ink-icon::before { width:14px;height:2px;background:var(--PRIMARY);margin:10px auto 0 }
.relic-pick[data-icon="ID"] .ink-icon::after { width:2px;height:14px;background:var(--SECONDARY);margin:-12px auto 0 }
```

### split — 分裂（叶 + 斜线）

```css
.relic-pick[data-icon="ID"] .ink-icon::before { width:12px;height:12px;background:var(--PRIMARY);border-radius:50% 50% 50% 0;transform:rotate(-45deg);margin:6px auto 2px }
.relic-pick[data-icon="ID"] .ink-icon::after { width:14px;height:2px;background:var(--SECONDARY);transform:rotate(60deg);margin:2px auto }
```

### slash — 斜线

```css
.relic-pick[data-icon="ID"] .ink-icon::before { width:14px;height:3px;background:var(--PRIMARY);transform:rotate(-30deg);margin:10px auto 0 }
.relic-pick[data-icon="ID"] .ink-icon::after { width:6px;height:3px;background:var(--SECONDARY);transform:rotate(-30deg);margin:-6px auto 0 }
```

### scroll — 卷轴

```css
.relic-pick[data-icon="ID"] .ink-icon::before { width:12px;height:14px;background:var(--PRIMARY);border:1px solid var(--SECONDARY);border-radius:2px;margin:5px auto 0 }
.relic-pick[data-icon="ID"] .ink-icon::after { width:8px;height:2px;background:var(--SECONDARY);transform:translate(0,-10px);margin:0 auto }
```

## 选择建议

| icon.template | 适合的效果 |
|---------------|-----------|
| orb | 基础光球，通用 |
| ring | 环形效果（光环/持续） |
| shield | 防御/护盾类 |
| flame | 火焰/爆炸类 |
| drop | 治疗/液体/墨滴类 |
| burst | 爆发/十字/AOE |
| split | 分裂类 |
| slash | 攻击/斩击类 |
| scroll | 符咒/buff 类 |

## 配色建议

- `primary: ink, secondary: accent` — 墨色主，朱砂点缀（最常见）
- `primary: accent, secondary: ink` — 朱砂主，墨色压底
- `primary: paper, secondary: ink` — 纸白主，墨色边（视觉轻/治疗类）
- `primary: ink, secondary: paper` — 墨主，纸白高光
