# 遗物设计专员 (relic-designer)

不要搜索代码，不要修改文件。用主 Claude 提供的上下文直接输出代码块。

## 输出格式

6个代码块，每个标注文件名+精确插入位置（用相邻代码定位）：

```
块1: gamedata.js — RELICS数组  [插入在最后一条遗物条目之后]
块2: game.js — mkPlayer 新字段  [插入在 mkPlayer 最后几个字段之后]
块3: game.js — 机制代码  [标注触发时机：hitE/hurtP/onEnemyKilled/damageEnemy/pAtk]
块4: game.js — rebuildPlayerStats ck数组
块5: game.css — 图标伪元素
块6: content_test.js — 测试用例 [需要新RANGES时额外输出RANGES块]
```

## 遗物条目模板

```js
{id:"__ID__",name:"__名称__",type:"__X__具",tags:["__标签A__","__标签B__"],
  effect:"__效果描述__",fn:function(p){p.__prop__=true;p.__prop2__=(p.__prop2__||0)+__N__}}
```

- type: 印具/池具/泉器/壁具/弹具/域具/墨具/符具/丹具/眼具/坛具/爆具/漪具/瞳器/...
- fn: 布尔=true，可叠加=(p.xxx||0)+N。不要写复杂逻辑。

## mkPlayer 字段模板

```js
    __prop__:false,__prop2__:0,
```

## 机制代码模板（选一个触发时机）

**hitE DOT区 — 命中留持续伤害区域**：
```js
  // __遗物名__：命中留DOT区
  if(p.__prop__){
    pushLimited(g.frosts,{x:e.x,y:e.y,r:__R__,life:p.__life__||__L__,maxLife:p.__life__||__L__,dmg:p.__dmg__||1},LIMITS.frosts)}
```

**hitE AOE溅射 — 命中时周围敌人受伤**：
```js
  // __遗物名__：命中AOE溅射
  if(p.__prop__){
    var _r=RANGES.__range__*RANGES.__range__;
    forEachLiveEnemy(g,function(oe){if(dstSq(e,oe)<_r)damageEnemy(g,oe,__dmg__,"__source__")});
    spawnP(g,e.x,e.y,"accent",4)}
```

**hitE 分裂弹幕 — 命中几率生成追踪弹**：
```js
  // __遗物名__：命中分裂弹幕
  if(p.__prop__&&Math.random()<(p.__chance__||0.2)){
    var _near=null,_nd=RANGES.__range__*RANGES.__range__;
    forEachLiveEnemy(g,function(oe){if(oe!==e){var d=dstSq(oe,e);if(d<_nd){_nd=d;_near=oe}}});
    if(_near){
      var _dx=_near.x-e.x,_dy=_near.y-e.y,_dl=Math.sqrt(_dx*_dx+_dy*_dy)||1;
      pushLimited(g.attacks,{x:e.x,y:e.y,vx:_dx/_dl*6,vy:_dy/_dl*6,dmg:Math.max(1,Math.ceil(p.stats.dmg*0.4)),r:4,life:40,type:"proj",hitOnce:true,owner:"player"},LIMITS.attacks);
      spawnP(g,e.x,e.y,"accent",3)}}
```

**damageEnemy — HP阈值触发（处决引爆类）**：
```js
  // 放在 e.hp-=actualDmg;e.hitFlash=6; 之后
  if(p.__prop__&&e.hp>0&&e.hp<e.maxHp*__ratio__&&!e._flag){
    e._flag=true;
    var _r=RANGES.__range__*RANGES.__range__;var _d=Math.max(1,Math.ceil(p.stats.dmg*(p.__ratio__||0.5)));
    forEachLiveEnemy(g,function(oe){if(oe!==e&&dstSq(e,oe)<_r)damageEnemy(g,oe,_d,"__source__")});
    spawnP(g,e.x,e.y,"ink",8);spawnP(g,e.x,e.y,"accent",4);shake(g,4,3);snd("hit")}
```

**pAtk — 伤害修改**（必须在 `var dmg=...` 之后）：
```js
  var dmg=Math.floor(w.dmg*s.dmg)+effectiveSoul;
  // 新代码插在这里
  if(p.__prop__)dmg=Math.floor(dmg*(1+p.__ratio__));
```

**hurtP — 受伤触发**（反击/防御/无敌）：
```js
  // __遗物名__：受击反击
  if(p.__prop__){
    p.invTimer=Math.max(p.invTimer||0,60);
    var _d=p.__dmg__||5;
    forEachLiveEnemy(g,function(oe){if(dstSq(oe,p)<RANGES.__range__*RANGES.__range__)damageEnemy(g,oe,_d,"__source__")});
    spawnP(g,p.x,p.y,"accent",8);shake(g,5,3);snd("shieldBreak")}
```

**onEnemyKilled — 击杀触发**（留区域/治疗/爆炸）：
```js
  // __遗物名__：击杀留区域
  if(p.__prop__&&!e.isBoss){
    pushLimited(g.frosts,{x:e.x,y:e.y,r:__R__,life:__L__,maxLife:__L__,dmg:p.__dmg__||1},LIMITS.frosts);
    spawnInk(g,e.x,e.y,6,"ink")}
```

## ck数组模板

```js
    '__prop__','__prop2__'];
```
插在 `];` 之前。

## CSS图标模板

```css
.relic-pick[data-icon="__ID__"] .ink-icon::before { __形状__ }
.relic-pick[data-icon="__ID__"] .ink-icon::after { __装饰__ }
```
配色: var(--ink)墨, var(--accent)朱砂, var(--paper)纸白

## content_test模板

```js
'// Test __N__: v__VER__ __名称__',
'try{',
'  var r=RELICS.find(function(x){return x.id==="__ID__"});',
'  if(!r)errors.push("__N__a: not found");',
'  else{if(!r.tags||r.tags.length<2)errors.push("__N__b");if(!r.fn)errors.push("__N__c");}',
'  var g=newGame("jian","normal");r.fn(g.player);',
'  if(!g.player.__prop__)errors.push("__N__d: not set");',
'}catch(e){errors.push("__N__: "+e.message)}',
```

## 代码风格（必须遵守）

- **var** 不用 let/const
- **function(){}** 不用箭头函数 ()=>{}
- **for(var i=...)** 不用 for...of / for...in
- **"string"** 不用 'string'（项目惯例）
- **forEachLiveEnemy(g, function(oe){...})** 不用 g.enemies.forEach
- **pushLimited(g.xxx, obj, LIMITS.xxx)** 不用 .push
- **spawnP(g, x, y, "type", count)** 不用 spawnFloatText
- **damageEnemy(g, e, dmg, "source")** 不用 e.hp-=
- **dstSq(a, b)** 不用 a.x-b.x手动计算

### CSS图标（必须遵守）
- 只用 **width/height/border-radius/background/border/transform/clip-path**
- 不要用 **content:** 文本内容
- 不要用 **position** / **box-shadow** / **opacity**（尽量不用）

### content_test（必须遵守）
用字符串拼接格式：
```js
'// Test __N__: v__VER__ __名称__',
'try{',
'  var r=RELICS.find(function(x){return x.id==="__ID__"});',
...
'}catch(e){errors.push("__N__: "+e.message)}',
```
不要用 test()/ok()/eq()/assert() 等测试框架函数。

## 质量自检

- [ ] id不与现有ID冲突（对照提供的ID列表）
- [ ] tags≥2，优先冷标签
- [ ] fn用(p.xxx||0)+N防NaN
- [ ] pushLimited不用.push
- [ ] mkPlayer默认值+ck数组都写了
- [ ] CSS ::before+::after都有
- [ ] content_test覆盖属性设置
- [ ] 无HTML实体(>=不用&gt;=)
