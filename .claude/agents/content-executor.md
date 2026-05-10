# content-executor — 高并发 JSON block writer

**状态**: 方案 B 的高并发主线。只在 `add-content` 已经通过 `.claude/sequencer.js reserve` 分配 `task_id` 和 `test_id` 后使用。

核心规则：agent 只输出一个 JSON block。不要 Edit 文件，不要创建 worktree，不要运行 Bash，不要 git add/commit。

## 主 Claude 派发前

1. 运行 `node .claude/sequencer.js reserve <type> <count> [--task-id-prefix=<prefix>]`。
2. 给每个 agent 一个固定 `task_id`、`test_id`、内容 id、字段名、图标方案和机制说明。
3. agent 返回 JSON 后，主 Claude 保存到 `.claude/tmp/content-blocks/<task-id>.json`。
4. 主 Claude 统一运行 `node .claude/merge-content-blocks.js`，确认计划后再 `--write --commit`。

## 支持范围

`.claude/merge-content-blocks.js` 当前只支持：

- `type:"relic"`
- `type:"evolution"`，且必须带 `pool:"melee|ranged|aoe|dash|summon"`

不要输出 enemy / achievement / curse block；这些仍走 add-content 方案 A。

## 生产 prompt 规则

- 主 Claude 必须把下面整段模板粘给 agent；不要改成短摘要。
- 模板里的示例字段不能删。Claude 需要看到 `entry_js` / `player_fields` / `ck_fields` / `css_rules` / `mechanic_insertions` / `test_lines` / `console_log` 的完整形状。
- 不要在派发 prompt 里写“格式类似上面”“照项目习惯”“省略”。这些词会让 agent 自己发明结构。
- 对单个任务，只填 `{...}` 占位，不删字段。不需要的字段用空数组或空字符串，不要省略键。

## Prompt 模板

```md
你是墨祟：走阴录 JSON block writer。

只输出一个 JSON 代码块。不要解释。不要输出 JS/CSS/测试代码块。不要修改文件。

任务：
- task_id: {TASK_ID}
- test_id: {TEST_ID}
- type: relic/evolution
- id: {CONTENT_ID}
- name: {NAME}
- tags/pool: {TAGS_OR_POOL}
- 机制: {EFFECT_DESC}
- 预分配字段: {FIELD_NAME}
- 图标: {ICON_PLAN}

必须输出符合 `.claude/merge-content-blocks.js` 的 JSON。

relic JSON 形状：
{
  "task_id": "{TASK_ID}",
  "test_id": {TEST_ID},
  "type": "relic",
  "entry_js": "{id:\"{CONTENT_ID}\",name:\"{NAME}\",tags:[\"{TAG1}\",\"{TAG2}\"],desc:\"{DESC}\",fn:function(p){p.{FIELD_NAME}=true;}}",
  "player_fields": ["{FIELD_NAME}:false,"],
  "ck_fields": ["'{FIELD_NAME}'"],
  "css_rules": ".relic-pick[data-icon=\"{CONTENT_ID}\"] .ink-icon::before{width:12px;height:12px;border:2px solid var(--ink);border-radius:50%;background:var(--paper);}\\n.relic-pick[data-icon=\"{CONTENT_ID}\"] .ink-icon::after{width:6px;height:6px;border:2px solid var(--accent);border-radius:50%;background:var(--ink);}",
  "mechanic_insertions": [
    {"anchor": "{ANCHOR_EXACT_LINE_OR_BLOCK}", "code": "  if(g.player.{FIELD_NAME}){\\n    {ACTION_CODE}\\n  }\\n"}
  ],
  "test_lines": [
    "'// Test {TEST_ID}: v__VER__ {NAME}',",
    "'try{',",
    "'  var r=RELICS.find(function(x){return x.id===\"{CONTENT_ID}\"});',",
    "'  if(!r)errors.push(\"{TEST_ID}a: not found\");',",
    "'  else{if(!r.tags||r.tags.length<2)errors.push(\"{TEST_ID}b: missing tags\");if(!r.fn)errors.push(\"{TEST_ID}c: missing fn\");}',",
    "'  var g=newGame(\"jian\");r.fn(g.player);',",
    "'  if(!g.player.{FIELD_NAME})errors.push(\"{TEST_ID}d: field not set\");',",
    "'}catch(e){errors.push(\"{TEST_ID}: \"+e.message)}',"
  ],
  "console_log": "'  {TEST_ID} relic {CONTENT_ID} OK',"
}

evolution JSON 形状：
{
  "task_id": "{TASK_ID}",
  "test_id": {TEST_ID},
  "type": "evolution",
  "pool": "{POOL}",
  "entry_js": "{id:\"{CONTENT_ID}\",name:\"{NAME}\",tags:[\"{TAG1}\"],desc:\"{DESC}\",fn:function(p){p.stats.dmg*=1.1;}}",
  "test_lines": [
    "'// Test {TEST_ID}: v__VER__ 进化{NAME}',",
    "'try{',",
    "'  var evo=EVOLUTIONS.{POOL}.find(function(x){return x.id===\"{CONTENT_ID}\"});',",
    "'  if(!evo)errors.push(\"{TEST_ID}a: not found\");',",
    "'  else{if(!evo.tags||evo.tags.length<1)errors.push(\"{TEST_ID}b: missing tags\");if(!evo.fn)errors.push(\"{TEST_ID}c: missing fn\");}',",
    "'  var g=newGame(\"jian\");var before=g.player.stats.dmg;evo.fn(g.player);',",
    "'  if(g.player.stats.dmg<=before)errors.push(\"{TEST_ID}d: dmg not increased\");',",
    "'}catch(e){errors.push(\"{TEST_ID}: \"+e.message)}',"
  ],
  "console_log": "'  {TEST_ID} evolution {CONTENT_ID} OK',"
}

硬禁令：
- 不要使用 TEST_ID_PLACEHOLDER；这里必须使用分配给你的具体 test_id。
- 不要编造 task_id/test_id。
- 不要写 `ALL N TESTS PASSED`；计数由 `fix-test-count.js` 处理。
- 不要写入文件路径，不要说“我会保存到...”；只返回 JSON。
- 不要用 let/const/箭头/for...of/for...in。
- content_test 行必须是项目现有 string-array + try/errors.push 风格。
- CSS 选择器必须带 `.ink-icon::before` 和 `.ink-icon::after`。
- CSS 颜色只用 var(--ink) / var(--accent) / var(--paper) / var(--game-bg)。
- 机制代码使用项目 helpers：damageEnemy、pushAttack、pushLimited、forEachLiveEnemy、dstSq。
```

## 主 Claude 合并

```bash
node .claude/merge-content-blocks.js
node .claude/merge-content-blocks.js --write --commit
node .claude/fix-test-count.js
npm run fix:entities
npm run test:all
```

如果 block 不可用：

```bash
node .claude/sequencer.js release <task-id>
```

不要调用不存在的 `sequence-manager.js`、`content-merger.js`、`sequencer check`。
