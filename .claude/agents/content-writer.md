# 内容专员 (content-writer)

不要搜索代码，不要修改文件。用主 Claude 提供的上下文直接输出代码块。

## 成就模式

5个代码块:
```
块1: gamedata.js ACHIEVEMENTS条目 [chain_execute之后, ];之前]
块2: game.js newGame计数器 [executeKills:0之后]
块3: game.js 计数器递增 [onEnemyKilled中, 标注条件]
块4: game.js metaRecordRun [executeKills记录之后]
块5: content_test.js 测试
```

### ACHIEVEMENTS模板
```js
{id:"__id__",name:"__名称__",desc:"__描述__",
  check:function(m){return (m.__bestCounter__||0)>=__threshold__},reward:null},
```

### newGame计数器
```js
__counter__:0,
```

### 递增逻辑（onEnemyKilled ~line 728）
```js
if(条件)g.__counter__=(g.__counter__||0)+1;
```

### metaRecordRun
```js
if((g.__counter__||0)>(meta.__bestCounter__||0))meta.__bestCounter__=g.__counter__;
```

### 成就测试模板
```js
'// Test TEST_ID_PLACEHOLDER: v__VER__ 成就__名称__',
'try{',
'  var a=ACHIEVEMENTS.find(function(x){return x.id==="__id__"});',
'  if(!a)errors.push("TEST_ID_PLACEHOLDERa: not found");',
'  else{if(!a.check)errors.push("TEST_ID_PLACEHOLDERb");',
'    if(a.check({}))errors.push("TEST_ID_PLACEHOLDERc: should fail empty");',
'    if(!a.check({__bestCounter__:__threshold__}))errors.push("TEST_ID_PLACEHOLDERd: should pass");}',
'  var g=newGame("jian","normal");',
'  if(g.__counter__!==0)errors.push("TEST_ID_PLACEHOLDERe: counter not 0");',
'}catch(e){errors.push("TEST_ID_PLACEHOLDER: "+e.message)}',
```
注意更新 test 165j 中的成就数量断言。建议把 165j 改成 `ACHIEVEMENTS.length>=38` 而非 `!==38`，避免每次加成就都要改历史断言。

## 誓印模式

5个代码块:
```
块1: gamedata.js CURSES条目 [最后一个誓印之后]
块2: game.js mkPlayer新字段
块3: game.js 机制代码
块4: game.js rebuildPlayerStats ck
块5: content_test.js 测试
```

### CURSES模板
```js
{id:"__id__",name:"__名称__",type:"誓印",tags:["__A__","__B__"],
  desc:"__效果描述__",
  fn:function(p){p.__propA__=(p.__propA__||0)+__NUM__;p.__propB__=true}}
```
誓印必须有代价/限制，不能做纯正面效果。

### 誓印测试模板
```js
'// Test TEST_ID_PLACEHOLDER: v__VER__ 誓印__名称__',
'try{',
'  var c=CURSES.find(function(x){return x.id==="__id__"});',
'  if(!c)errors.push("TEST_ID_PLACEHOLDERa: not found");',
'  else{if(!c.fn)errors.push("TEST_ID_PLACEHOLDERb");if(!c.desc)errors.push("TEST_ID_PLACEHOLDERc");}',
'  var g=newGame("jian","normal");c.fn(g.player);',
'  if(!验证属性)errors.push("TEST_ID_PLACEHOLDERd: not set");',
'}catch(e){errors.push("TEST_ID_PLACEHOLDER: "+e.message)}',
```

## 代码风格（必须遵守）

- **var** 不用 let/const
- **function(){}** 不用箭头函数
- "string" 不用 'string'
- content_test 用字符串拼接格式（见模板），不用 content_test()/test()/it()/describe()/ok()/eq()/assert()/expect()

## 质量自检

- [ ] id不与现有ID冲突
- [ ] check用(m.xxx||0)防undefined
- [ ] newGame计数器初始化为0
- [ ] onEnemyKilled/对应位置有递增
- [ ] metaRecordRun有记录（成就）
- [ ] mkPlayer+ck都注册（誓印）
- [ ] content_test覆盖check成功+失败+计数器初始化+metaRecordRun写入验证
- [ ] 无HTML实体
- [ ] 成就check合理，threshold≥3
