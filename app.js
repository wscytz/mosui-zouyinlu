const weapons = [
  {
    id: "jian",
    name: "斩妖剑",
    tone: "近战 / 破绽 / 处决",
    blurb: "三段贴身剑势，第三击挑出破绽。最适合做硬朗、干脆的斩杀流。",
    hook: "第三击挑破绽，处决后追出一道残墨。",
    tags: ["近战", "处决", "暴击"],
    route: "优先吃精英与献祭节点，尽快把处决窗口做大。",
    stats: { burst: 72, control: 34, mobility: 58, gamble: 46 }
  },
  {
    id: "bi",
    name: "符骨笔",
    tone: "远程 / 法术 / 魂伤",
    blurb: "用骨笔挥出半月墨痕，主动法术会沿着笔迹二次结算，越打越像在写阵。",
    hook: "墨痕会为法术留线，命中后能拖出魂丝。",
    tags: ["远程", "法术", "魂"],
    route: "优先奇遇与商店，找能放大法术和魂伤的遗物。",
    stats: { burst: 60, control: 68, mobility: 50, gamble: 42 }
  },
  {
    id: "ling",
    name: "镇魂铃",
    tone: "控场 / 召物 / 魂域",
    blurb: "铃响就是领域。怪会被拉进你的节拍里，适合做控场、召物和慢压型构筑。",
    hook: "铃响留下魂域，停留其上的敌人会不断被牵魂。",
    tags: ["控场", "魂", "召物"],
    route: "优先神龛和持续战斗节点，把控场收益滚成雪球。",
    stats: { burst: 48, control: 82, mobility: 40, gamble: 38 }
  },
  {
    id: "san",
    name: "伏魔伞",
    tone: "闪避 / 远程 / 反击",
    blurb: "撑伞能吞掉第一轮压力，随后用折返、滑步和反击把局面拉成自己的节奏。",
    hook: "完美闪避会让下一击带穿透和短暂无敌。",
    tags: ["闪避", "远程", "反击"],
    route: "优先选空间宽、回避余地大的路线，放大拉扯收益。",
    stats: { burst: 56, control: 52, mobility: 76, gamble: 50 }
  }
];

const relics = [
  {
    id: "zhusha",
    name: "朱砂封钉",
    type: "凶器",
    tags: ["处决", "暴击"],
    effect: "对破绽目标暴击率大幅提高，处决后返还一次闪避。"
  },
  {
    id: "kuhao",
    name: "枯毫遗墨",
    type: "残器",
    tags: ["近战", "魂"],
    effect: "近战第三击会放出一道追魂墨刃，自动补尾刀。"
  },
  {
    id: "zhiren",
    name: "纸人替魄",
    type: "法具",
    tags: ["闪避", "生存"],
    effect: "完美闪避后留下纸人吸引仇恨，为你抢出重整节奏的空隙。"
  },
  {
    id: "chenfu",
    name: "无字谶符",
    type: "符物",
    tags: ["法术", "魂"],
    effect: "主动法术会附带摄魂，命中的敌人拖出可被二次引爆的魂丝。"
  },
  {
    id: "lingshe",
    name: "青铜镇铃舌",
    type: "古铃",
    tags: ["控场", "召物"],
    effect: "控场持续更久，铃响时额外叫出一枚会自爆的纸傀。"
  },
  {
    id: "jingjuan",
    name: "倒写经卷",
    type: "残卷",
    tags: ["远程", "分裂"],
    effect: "远程墨迹会折返一次，返程轨迹额外撕开一段裂纸伤害。"
  },
  {
    id: "yedeng",
    name: "夜灯残烬",
    type: "烛具",
    tags: ["火", "击杀"],
    effect: "击杀敌人会在地面留下磷火，逼迫剩余怪群改变走位。"
  },
  {
    id: "xianghui",
    name: "祟面香灰",
    type: "禁物",
    tags: ["诅咒", "暴击"],
    effect: "生命越低，暴击伤害越高，但受到的持续伤害也会放大。"
  },
  {
    id: "xuanbing",
    name: "玄冰简穗",
    type: "祠器",
    tags: ["控场", "冰"],
    effect: "命中会积攒寒意，冻结敌人的动作尾段，方便接后手。"
  },
  {
    id: "gupen",
    name: "阴泥骨盆",
    type: "祭器",
    tags: ["召物", "生存"],
    effect: "纸傀或铃影被击碎时，会在你身上结出一层护墨。"
  },
  {
    id: "dieyin",
    name: "鬼脊蝶印",
    type: "异印",
    tags: ["魂", "远程"],
    effect: "魂伤能在敌群之间跳印，把远距离压制变成成片传播。"
  },
  {
    id: "fanling",
    name: "返魂幡铃",
    type: "幡铃",
    tags: ["处决", "召物"],
    effect: "处决后召出一枚短命幡灵，自动追击最近的受创目标。"
  },
  {
    id: "xuezhu",
    name: "血烛祭片",
    type: "禁物",
    tags: ["诅咒", "火"],
    effect: "主动献祭生命后，下一次攻击会泼出大面积血墨。"
  },
  {
    id: "pojing",
    name: "破镜残片",
    type: "镜片",
    tags: ["闪避", "反击"],
    effect: "闪避后的第一击获得穿透和短暂无敌，适合反手夺回空间。"
  }
];

const regions = [
  {
    name: "纸灰古镇",
    subtitle: "第一章 · 纸扎与火盆",
    blurb: "被焚纸钱和空店铺覆盖的坍塌镇集，纸扎人会从狭窄盲角里突然抬头。",
    footer: "关键词：纸傀、火盆、窄巷精英、视野压迫"
  },
  {
    name: "悬井回廊",
    subtitle: "第二章 · 潮湿与拖拽",
    blurb: "倒悬井口、祈雨长廊和湿滑石地交错在一起，走位与控场价值会被极度放大。",
    footer: "关键词：拖拽、坠井、潮鸣、连续战斗压力"
  },
  {
    name: "无面神窟",
    subtitle: "第三章 · 残神与傩面",
    blurb: "洞窟里遍布戴着傩面的石像，敌人会借面重生，终局前要先学会拆穿假身。",
    footer: "关键词：假身、破相、献祭、终局试卷"
  }
];

const bosses = [
  {
    name: "画皮娘子",
    subtitle: "纸灰古镇镇守",
    blurb: "以纸衣换身，制造真假分身。你要么拥有位移和折返，要么就有足够的范围把真身逼出来。",
    footer: "有利标签：远程、分裂、闪避"
  },
  {
    name: "井龙尸",
    subtitle: "悬井回廊镇守",
    blurb: "用水环和拖拽打断节奏，给近战留出的窗口非常短，但处决流能在一个破绽里直接压垮它。",
    footer: "有利标签：处决、控场、反击"
  },
  {
    name: "无面傩王",
    subtitle: "无面神窟镇守",
    blurb: "不同傩面对应不同招式。只有在正确的面具阶段打出压制，它的本体才会露出来。",
    footer: "有利标签：暴击、魂、机动"
  },
  {
    name: "瘟目真君",
    subtitle: "终局 Boss",
    blurb: "瘟眼会不断污染场地，检验的是你的构筑会不会自己转起来。稳定循环比面板数字更重要。",
    footer: "有利标签：稳定循环、击杀触发、召物牵制"
  }
];

const tagInfluence = {
  近战: { burst: 8, control: -2, mobility: -1, gamble: 5 },
  处决: { burst: 12, control: 0, mobility: 0, gamble: 8 },
  暴击: { burst: 10, control: 0, mobility: 0, gamble: 8 },
  远程: { burst: 4, control: 2, mobility: 8, gamble: -2 },
  法术: { burst: 5, control: 8, mobility: 0, gamble: 2 },
  魂: { burst: 4, control: 10, mobility: 0, gamble: 2 },
  控场: { burst: 0, control: 12, mobility: 0, gamble: -4 },
  召物: { burst: 3, control: 10, mobility: -1, gamble: -1 },
  闪避: { burst: 0, control: 0, mobility: 12, gamble: -8 },
  反击: { burst: 7, control: 2, mobility: 8, gamble: 4 },
  分裂: { burst: 6, control: 4, mobility: 2, gamble: 2 },
  击杀: { burst: 7, control: 2, mobility: 0, gamble: 4 },
  火: { burst: 8, control: 1, mobility: 0, gamble: 4 },
  冰: { burst: 1, control: 11, mobility: -1, gamble: -2 },
  生存: { burst: -2, control: 1, mobility: 1, gamble: -12 },
  诅咒: { burst: 14, control: 0, mobility: 0, gamble: 18 }
};

const buildPrefix = {
  近战: "断锋",
  处决: "斩祟",
  暴击: "朱砂",
  远程: "巡符",
  法术: "咒墨",
  魂: "摄魄",
  控场: "镇邪",
  召物: "纸傀",
  闪避: "走影",
  反击: "回刃",
  分裂: "乱笔",
  击杀: "追命",
  火: "燎祟",
  冰: "凝魄",
  生存: "镇脉",
  诅咒: "祭命"
};

const buildSuffix = {
  jian: "剑势",
  bi: "笔阵",
  ling: "铃域",
  san: "伞舞"
};

const state = {
  weaponId: null,
  relicIds: [],
  notice: ""
};

const weaponGrid = document.querySelector("#weaponGrid");
const relicGrid = document.querySelector("#relicGrid");
const regionGrid = document.querySelector("#regionGrid");
const bossGrid = document.querySelector("#bossGrid");
const buildName = document.querySelector("#buildName");
const buildPitch = document.querySelector("#buildPitch");
const metricGrid = document.querySelector("#metricGrid");
const activeTags = document.querySelector("#activeTags");
const combatLoop = document.querySelector("#combatLoop");
const routePlan = document.querySelector("#routePlan");
const riskNote = document.querySelector("#riskNote");
const randomizeButton = document.querySelector("#randomizeBuild");
const clearButton = document.querySelector("#clearBuild");

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getWeaponById(id) {
  return weapons.find((weapon) => weapon.id === id) || null;
}

function getRelicsByIds(ids) {
  return relics.filter((relic) => ids.includes(relic.id));
}

function countTags(selectedWeapon, selectedRelics) {
  const counts = {};
  if (selectedWeapon) {
    selectedWeapon.tags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 2;
    });
  }

  selectedRelics.forEach((relic) => {
    relic.tags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))
    .map(([tag, count]) => ({ tag, count }));
}

function computeMetrics(selectedWeapon, selectedRelics) {
  const base = selectedWeapon
    ? { ...selectedWeapon.stats }
    : { burst: 18, control: 18, mobility: 18, gamble: 18 };

  selectedRelics.forEach((relic) => {
    relic.tags.forEach((tag) => {
      const influence = tagInfluence[tag];
      if (!influence) {
        return;
      }

      base.burst += influence.burst;
      base.control += influence.control;
      base.mobility += influence.mobility;
      base.gamble += influence.gamble;
    });
  });

  return {
    burst: clamp(base.burst),
    control: clamp(base.control),
    mobility: clamp(base.mobility),
    gamble: clamp(base.gamble)
  };
}

function getSynergyScore(selectedWeapon, selectedRelics, tagSummary) {
  if (!selectedWeapon) {
    return 0;
  }

  let matches = 0;
  selectedRelics.forEach((relic) => {
    relic.tags.forEach((tag) => {
      if (selectedWeapon.tags.includes(tag)) {
        matches += 1;
      }
    });
  });

  const uniqueTags = new Set([
    ...selectedWeapon.tags,
    ...selectedRelics.flatMap((relic) => relic.tags)
  ]).size;

  return clamp(matches * 14 + uniqueTags * 4 + selectedRelics.length * 6 + tagSummary.length * 2);
}

function buildTitle(selectedWeapon, tagSummary) {
  if (!selectedWeapon) {
    return "未成局";
  }

  const topTag = tagSummary[0]?.tag || selectedWeapon.tags[0];
  return `${buildPrefix[topTag] || "夜行"}${buildSuffix[selectedWeapon.id] || "流"} `;
}

function buildPitchText(selectedWeapon, selectedRelics, tagSummary, synergyScore) {
  if (!selectedWeapon) {
    return "先定兵器。遗物要服务手感，而不是反过来拖着武器走。";
  }

  const tags = tagSummary.slice(0, 3).map((entry) => entry.tag).join(" / ");
  const grade =
    synergyScore >= 88 ? "墨势已成" :
    synergyScore >= 66 ? "主轴清晰" :
    synergyScore >= 42 ? "轮廓初显" :
    "仍在试配";

  const baseText = `已选 ${selectedRelics.length}/6 件遗物，主标签偏 ${tags || "武器本体"}，当前属于“${grade}”的局。`;
  return state.notice ? `${state.notice} ${baseText}` : baseText;
}

function buildCombatLoop(selectedWeapon, topTags) {
  if (!selectedWeapon) {
    return "先确定主武器，再决定这一局是贴身压制、远程写阵还是走位反击。";
  }

  const baseLoops = {
    jian: "贴身三连，第三击挑出破绽，然后在极短的处决窗口里把爆发一口气灌满。",
    bi: "中距离挥出墨痕，先给敌人挂上魂丝或异常，再让法术沿笔迹二次结算，越打越像写阵。",
    ling: "先用铃响控住怪群和空间，再让魂域、纸傀与持续伤害接管整场战斗的节拍。",
    san: "先用撑伞和闪避吞掉第一波压力，随后靠折返与反击不断把对手逼回你的节奏里。"
  };

  const notes = [];
  const tags = topTags.map((entry) => entry.tag);

  if (tags.includes("闪避")) {
    notes.push("这套很吃擦招后的立刻回头反打。");
  }
  if (tags.includes("魂")) {
    notes.push("魂伤会帮你把散开的怪重新串起来。");
  }
  if (tags.includes("召物")) {
    notes.push("召物负责补空档，你负责把站位引到最糟糕的位置给敌人。");
  }
  if (tags.includes("诅咒")) {
    notes.push("低血时伤害会异常高，但任何连段失误都可能直接断局。");
  }
  if (tags.includes("火")) {
    notes.push("别站桩，要让燃烧地面替你封路线。");
  }

  return [baseLoops[selectedWeapon.id], ...notes.slice(0, 2)].join(" ");
}

function buildRoute(selectedWeapon, topTags, metrics) {
  if (!selectedWeapon) {
    return "路线建议会跟着武器和遗物变化。先选兵器，才能看出这局该贪精英还是保稳定。";
  }

  const tags = topTags.map((entry) => entry.tag);
  const plan = [selectedWeapon.route];

  if (metrics.burst >= 72) {
    plan.push("第一章优先精英和献祭房，尽快把伤害曲线抬到能秒关键怪的水平。");
  } else {
    plan.push("第一章先走稳定战斗和商店，把基础遗物凑齐，再决定要不要赌献祭。");
  }

  if (tags.includes("控场") || tags.includes("魂") || tags.includes("召物")) {
    plan.push("第二章多吃奇遇与神龛，让持续收益滚起来，别急着只看面板伤害。");
  } else if (tags.includes("处决") || tags.includes("暴击")) {
    plan.push("第二章开始主动找精英，给处决和暴击留出能滚雪球的目标。");
  } else {
    plan.push("第二章优先拿位置更宽的路线，保证你能把武器节奏完整打出来。");
  }

  if (metrics.gamble >= 66) {
    plan.push("第三章看到商店或回复节点不要省，这种赌命局死法通常都很突然。");
  }

  return plan.join(" ");
}

function buildRisk(metrics, selectedRelics) {
  if (!selectedRelics.length) {
    return "风险还没成形。单靠武器本体通常很稳，但也还没到最有意思的时候。";
  }

  const curseCount = selectedRelics.filter((relic) => relic.tags.includes("诅咒")).length;
  if (metrics.gamble >= 72 || curseCount >= 2) {
    return "高赌命。输出和清场会非常凶，但被 Boss 连段或地图机制抓到时，容错几乎没有。";
  }
  if (metrics.gamble >= 48) {
    return "中等风险。建议至少保留一个闪避、护墨或控场钩子，不然终局很容易断节奏。";
  }
  return "低风险。容错不错，但要警惕后期输出不够，别把遗物全拿成纯防御。";
}

function renderMetrics(metrics) {
  const entries = [
    ["爆发", metrics.burst],
    ["控场", metrics.control],
    ["机动", metrics.mobility],
    ["赌命", metrics.gamble]
  ];

  metricGrid.innerHTML = entries.map(([label, value]) => `
    <div class="metric">
      <div class="metric__head">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
      <div class="metric__bar">
        <div class="metric__fill" style="width: ${value}%"></div>
      </div>
    </div>
  `).join("");
}

function renderTagCloud(tagSummary) {
  if (!tagSummary.length) {
    activeTags.innerHTML = '<span class="tag">等待标签生成</span>';
    return;
  }

  activeTags.innerHTML = tagSummary.slice(0, 6).map((entry, index) => `
    <span class="tag ${index < 3 ? "tag--accent" : ""}">${entry.tag} × ${entry.count}</span>
  `).join("");
}

function renderWeapons() {
  weaponGrid.innerHTML = weapons.map((weapon) => `
    <button
      type="button"
      class="select-card ${state.weaponId === weapon.id ? "is-selected" : ""}"
      data-weapon-id="${weapon.id}"
      aria-pressed="${state.weaponId === weapon.id}"
    >
      <div class="select-card__name">
        <h4>${weapon.name}</h4>
        <span class="select-card__meta">${weapon.tone}</span>
      </div>
      <p class="select-card__blurb">${weapon.blurb}</p>
      <div class="tag-row">
        ${weapon.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>
      <p class="select-card__meta">${weapon.hook}</p>
    </button>
  `).join("");
}

function renderRelics() {
  relicGrid.innerHTML = relics.map((relic) => {
    const selected = state.relicIds.includes(relic.id);
    return `
      <button
        type="button"
        class="select-card ${selected ? "is-selected" : ""}"
        data-relic-id="${relic.id}"
        aria-pressed="${selected}"
      >
        <div class="select-card__name">
          <h4>${relic.name}</h4>
          <span class="select-card__meta">${relic.type}</span>
        </div>
        <p class="select-card__blurb">${relic.effect}</p>
        <div class="tag-row">
          ${relic.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
      </button>
    `;
  }).join("");
}

function renderLore() {
  regionGrid.innerHTML = regions.map((region) => `
    <article class="lore-card">
      <h3>${region.name}</h3>
      <p class="lore-card__subtitle">${region.subtitle}</p>
      <p>${region.blurb}</p>
      <p class="lore-card__footer">${region.footer}</p>
    </article>
  `).join("");

  bossGrid.innerHTML = bosses.map((boss) => `
    <article class="lore-card">
      <h3>${boss.name}</h3>
      <p class="lore-card__subtitle">${boss.subtitle}</p>
      <p>${boss.blurb}</p>
      <p class="lore-card__footer">${boss.footer}</p>
    </article>
  `).join("");
}

function updateBuildPanel() {
  const selectedWeapon = getWeaponById(state.weaponId);
  const selectedRelics = getRelicsByIds(state.relicIds);
  const tagSummary = countTags(selectedWeapon, selectedRelics);
  const metrics = computeMetrics(selectedWeapon, selectedRelics);
  const synergyScore = getSynergyScore(selectedWeapon, selectedRelics, tagSummary);

  buildName.textContent = buildTitle(selectedWeapon, tagSummary).trim();
  buildPitch.textContent = buildPitchText(selectedWeapon, selectedRelics, tagSummary, synergyScore);
  renderMetrics(metrics);
  renderTagCloud(tagSummary);
  combatLoop.textContent = buildCombatLoop(selectedWeapon, tagSummary);
  routePlan.textContent = buildRoute(selectedWeapon, tagSummary, metrics);
  riskNote.textContent = buildRisk(metrics, selectedRelics);
}

function randomPick(list, count) {
  const pool = [...list];
  const result = [];

  while (pool.length && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }

  return result;
}

function randomizeBuild() {
  const weapon = weapons[Math.floor(Math.random() * weapons.length)];
  const relicCount = 3 + Math.floor(Math.random() * 4);
  const selectedRelics = randomPick(relics, relicCount).map((relic) => relic.id);

  state.weaponId = weapon.id;
  state.relicIds = selectedRelics;
  state.notice = "已为你起一局。";
  renderWeapons();
  renderRelics();
  updateBuildPanel();
}

function clearBuild() {
  state.weaponId = null;
  state.relicIds = [];
  state.notice = "";
  renderWeapons();
  renderRelics();
  updateBuildPanel();
}

weaponGrid.addEventListener("click", (event) => {
  const target = event.target.closest("[data-weapon-id]");
  if (!target) {
    return;
  }

  state.weaponId = target.dataset.weaponId;
  state.notice = "";
  renderWeapons();
  updateBuildPanel();
});

relicGrid.addEventListener("click", (event) => {
  const target = event.target.closest("[data-relic-id]");
  if (!target) {
    return;
  }

  const relicId = target.dataset.relicId;
  const relicIndex = state.relicIds.indexOf(relicId);

  if (relicIndex >= 0) {
    state.relicIds.splice(relicIndex, 1);
    state.notice = "";
  } else if (state.relicIds.length < 6) {
    state.relicIds.push(relicId);
    state.notice = "";
  } else {
    state.notice = "遗物位已满。先取消一件，再试新的组合。";
  }

  renderRelics();
  updateBuildPanel();
});

randomizeButton.addEventListener("click", randomizeBuild);
clearButton.addEventListener("click", clearBuild);

function setupReveal() {
  const revealTargets = document.querySelectorAll(".hero__copy, .hero__card, .section, .footer");
  revealTargets.forEach((element) => {
    element.setAttribute("data-reveal", "");
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  revealTargets.forEach((element) => observer.observe(element));
}

renderWeapons();
renderRelics();
renderLore();
updateBuildPanel();
setupReveal();
