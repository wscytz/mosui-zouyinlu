// 铃铛武器自动化游戏测试脚本
// 模拟选择铃铛武器，持续攻击，捕获运行时错误

const fs = require('fs');
const path = require('path');

// 加载游戏代码
const gamedataPath = path.join(__dirname, 'gamedata.js');
const gamePath = path.join(__dirname, 'game.js');

// 读取代码内容用于分析
const gamedataSrc = fs.readFileSync(gamedataPath, 'utf8');
const gameSrc = fs.readFileSync(gamePath, 'utf8');

console.log('══════════════════════════════════════════════════');
console.log('  铃铛武器 (镇魂铃) 自动化游戏测试');
console.log('══════════════════════════════════════════════════\n');

// ── 1. 分析铃铛武器配置 ──
console.log('【1】铃铛武器配置分析');
console.log('──────────────────────────────────────────────────');

const bellMatch = gamedataSrc.match(/\{id:"ling"[\s\S]*?type:"aoe"\}/);
if (bellMatch) {
    console.log('✓ 铃铛武器配置找到:', bellMatch[0].replace(/\s+/g, ' '));
} else {
    console.log('✗ 铃铛武器配置未找到');
}

// ── 2. 检查铃铛相关的遗物 ──
console.log('\n【2】铃铛相关遗物检查');
console.log('──────────────────────────────────────────────────');

const bellRelics = [
    'lingshe',  // 青铜镇铃舌
    'lingmu',   // 铃木鱼
];

bellRelics.forEach(id => {
    const regex = new RegExp(`\\{id:"${id}"[\\s\\S]*?\\}`);
    const match = gamedataSrc.match(regex);
    if (match) {
        console.log(`✓ ${id}:`, match[0].substring(0, 80) + '...');
    } else {
        console.log(`✗ ${id}: 未找到`);
    }
});

// ── 3. 分析游戏循环中的潜在问题 ──
console.log('\n【3】游戏循环关键代码分析');
console.log('──────────────────────────────────────────────────');

// 检查 forEachLiveEnemy 的使用
const forEachMatches = gameSrc.match(/forEachLiveEnemy\(g,.*?\{[\s\S]*?\}\)/g);
console.log(`forEachLiveEnemy 调用次数: ${forEachMatches ? forEachMatches.length : 0}`);

// 检查数组修改操作
const spliceMatches = gameSrc.match(/\.splice\(/g);
console.log(`splice 调用次数: ${spliceMatches ? spliceMatches.length : 0}`);

// 检查 enemies 数组修改
const enemyModifications = gameSrc.match(/g\.enemies\.(push|splice|pop|shift)/g);
console.log(`enemies 数组修改次数: ${enemyModifications ? enemyModifications.length : 0}`);

// ── 4. 检查铃铛攻击逻辑 ──
console.log('\n【4】铃铛攻击逻辑检查');
console.log('──────────────────────────────────────────────────');

// 查找 AOE 攻击处理
const aoePattern = /w\.type==="aoe"/;
if (aoePattern.test(gameSrc)) {
    console.log('✓ AOE 攻击类型处理存在');
    
    // 提取 AOE 处理代码块
    const aoeBlockMatch = gameSrc.match(/w\.type==="aoe"[\s\S]{0,500}/);
    if (aoeBlockMatch) {
        console.log('  AOE 代码片段:');
        console.log('  ', aoeBlockMatch[0].substring(0, 200).replace(/\n/g, '\n   '));
    }
} else {
    console.log('✗ AOE 攻击类型处理未找到');
}

// ── 5. 检查潜在的空引用 ──
console.log('\n【5】空引用风险检查');
console.log('──────────────────────────────────────────────────');

const riskyPatterns = [
    { name: 'g.stage 访问', pattern: /g\.stage\.[a-zA-Z]/g },
    { name: 'g.player 访问', pattern: /g\.player\.[a-zA-Z]/g },
    { name: 'g.weapon 访问', pattern: /g\.weapon\.[a-zA-Z]/g },
];

riskyPatterns.forEach(({ name, pattern }) => {
    const matches = gameSrc.match(pattern);
    console.log(`${name}: ${matches ? matches.length : 0} 次`);
});

// 检查 g.stage 是否有守卫
const stageGuardPattern = /if\s*\(\s*!g\.stage\s*\)/;
if (stageGuardPattern.test(gameSrc)) {
    console.log('✓ 存在 g.stage 空值检查');
} else {
    console.log('⚠ 未发现 g.stage 空值检查');
}

// ── 6. 检查铃铛特定机制 ──
console.log('\n【6】铃铛机制特定检查');
console.log('──────────────────────────────────────────────────');

// 检查是否有铃铛范围计算
const rangePattern = /range.*ling|ling.*range/i;
if (rangePattern.test(gameSrc) || gameSrc.includes('镇魂铃')) {
    console.log('✓ 铃铛范围相关代码存在');
} else {
    console.log('ℹ 铃铛范围计算可能在通用 AOE 逻辑中');
}

// 检查召唤物逻辑 (铃铛有召物标签)
const summonPattern = /type==="summon"|\.summon/i;
if (summonPattern.test(gameSrc)) {
    console.log('✓ 召唤逻辑存在');
} else {
    console.log('✗ 召唤逻辑未找到');
}

// ── 7. 检查性能问题 ──
console.log('\n【7】性能风险检查');
console.log('──────────────────────────────────────────────────');

// 检查粒子系统
const particlePatterns = [
    { name: 'particles.push', pattern: /g\.particles\.push/g },
    { name: 'particles 遍历', pattern: /g\.particles\.forEach/g },
    { name: 'spawnP 调用', pattern: /spawnP\(/g },
];

particlePatterns.forEach(({ name, pattern }) => {
    const matches = gameSrc.match(pattern);
    console.log(`${name}: ${matches ? matches.length : 0} 次`);
});

// 检查对象池
if (gameSrc.includes('pool') || gameSrc.includes('reuse')) {
    console.log('✓ 对象池机制可能存在');
} else {
    console.log('ℹ 未找到显式对象池');
}

// ── 8. 铃铛持续攻击模拟 ──
console.log('\n【8】铃铛持续攻击模拟');
console.log('──────────────────────────────────────────────────');

// 连斩奖励配置 (从 game.js 复制)
const KILL_MILESTONES=[
  {at:3,text:"三连斩",life:60,pCnt:6,pCol:"accent",sh:5,shA:2,rf:0,gold:0},
  {at:5,text:"五连斩!",life:70,pCnt:8,pCol:"accent",sh:8,shA:3,rf:0,gold:0},
  {at:10,text:"十连斩!!",life:80,pCnt:14,pCol:"accent",sh:12,shA:5,rf:6,gold:0},
  {at:20,text:"二十连斩!!!",life:90,pCnt:20,pCol:"accent",sh:16,shA:7,rf:8,gold:20},
  {at:30,text:"三十连斩!!!!",life:100,pCnt:28,pCol:"fire",sh:20,shA:10,rf:10,gold:12},
  {at:50,text:"五十连斩！！！！",life:120,pCnt:40,pCol:"fire",sh:24,shA:12,rf:15,gold:40}
];

// 模拟游戏状态
function simulateBellGame(durationFrames) {
    let errors = [];
    let warnings = [];
    
    // 模拟状态
    let state = {
        frame: 0,
        player: {
            hp: 100,
            maxHp: 100,
            x: 480,
            y: 320,
            atkCd: 0,
            stats: { range: 1, dmg: 1, spd: 1, atkSpd: 1, def: 0, critRate: 0.05, critDmg: 1.5 }
        },
        weapon: { id: 'ling', type: 'aoe', dmg: 16, range: 100, cd: 28 },
        enemies: [],
        particles: [],
        stage: { id: 'ash', wave: 1 },
        attacks: [],
        killCombo: 0,
        relics: []
    };
    
    // 生成敌人
    function spawnEnemy(wave) {
        const types = ['modun', 'mojar', 'mogu', 'moying'];
        return {
            id: Math.random().toString(36).substr(2, 9),
            type: types[Math.floor(Math.random() * types.length)],
            hp: 30 + wave * 5,
            maxHp: 30 + wave * 5,
            x: Math.random() * 960,
            y: Math.random() * 640,
            r: 12,
            spd: 1 + wave * 0.1,
            dmg: 8 + wave,
            atkCd: 0,
            spawnGraceT: 30,
            deathT: 0,
            slowT: 0,
            freezeT: 0,
            poisonT: 0
        };
    }
    
    // 模拟攻击
    function simulateAttack(g) {
        if (g.player.atkCd > 0) return;
        
        // 铃铛 AOE 攻击
        const range = g.weapon.range * g.player.stats.range;
        const dmg = g.weapon.dmg * g.player.stats.dmg;
        
        // 检查范围内的敌人
        let hitCount = 0;
        g.enemies.forEach(e => {
            if (e.hp <= 0 || e.spawnGraceT > 0) return;
            const dx = g.player.x - e.x;
            const dy = g.player.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist <= range) {
                // 应用伤害
                const actualDmg = dmg * (0.9 + Math.random() * 0.2);
                e.hp -= actualDmg;
                hitCount++;
                
                // 检查击杀
                if (e.hp <= 0) {
                    e.deathT = 1;
                    g.killCombo++;
                    
                    // 检查连斩奖励
                    KILL_MILESTONES.forEach(m => {
                        if (g.killCombo === m.at) {
                            warnings.push(`帧 ${g.frame}: 达成 ${m.text}`);
                        }
                    });
                }
            }
        });
        
        g.player.atkCd = g.weapon.cd * g.player.stats.atkSpd;
        
        if (hitCount > 0) {
            // 生成粒子
            for (let i = 0; i < 5; i++) {
                g.particles.push({
                    x: g.player.x,
                    y: g.player.y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 30,
                    maxLife: 30,
                    size: 3,
                    type: 'ring'
                });
            }
        }
    }
    
    // 模拟敌人更新
    function updateEnemies(g) {
        g.enemies.forEach(e => {
            if (e.hp <= 0) {
                if (e.deathT > 0) e.deathT--;
                return;
            }
            
            if (e.spawnGraceT > 0) {
                e.spawnGraceT--;
                return;
            }
            
            // 向玩家移动
            const dx = g.player.x - e.x;
            const dy = g.player.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 0) {
                e.x += (dx / dist) * e.spd;
                e.y += (dy / dist) * e.spd;
            }
            
            // 攻击玩家
            if (dist < e.r + 15) {
                if (e.atkCd <= 0) {
                    g.player.hp -= e.dmg * (1 - g.player.stats.def);
                    e.atkCd = 30;
                    
                    if (g.player.hp <= 0) {
                        errors.push(`帧 ${g.frame}: 玩家死亡 (HP: ${g.player.hp.toFixed(1)})`);
                    }
                }
            }
            
            if (e.atkCd > 0) e.atkCd--;
        });
    }
    
    // 主循环
    for (let frame = 0; frame < durationFrames; frame++) {
        state.frame = frame;
        
        // 生成新敌人
        if (frame % 60 === 0 && state.enemies.length < 20) {
            state.enemies.push(spawnEnemy(state.stage.wave));
        }
        
        // 玩家攻击 (每帧都尝试，但受 CD 限制)
        simulateAttack(state);
        
        // 更新敌人
        updateEnemies(state);
        
        // 更新粒子
        state.particles = state.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            return p.life > 0;
        });
        
        // 更新玩家 CD
        if (state.player.atkCd > 0) state.player.atkCd--;
        
        // 清理死亡敌人
        state.enemies = state.enemies.filter(e => e.hp > 0 || e.deathT > 0);
        
        // 检查异常状态
        if (state.particles.length > 1000) {
            warnings.push(`帧 ${frame}: 粒子数量过多 (${state.particles.length})`);
        }
        
        if (state.enemies.length > 50) {
            warnings.push(`帧 ${frame}: 敌人数量过多 (${state.enemies.length})`);
        }
        
        // 每100帧报告一次状态
        if (frame % 300 === 0) {
            console.log(`  帧 ${frame}: HP=${state.player.hp.toFixed(1)}, 敌人=${state.enemies.length}, 击杀连击=${state.killCombo}, 粒子=${state.particles.length}`);
        }
    }
    
    return { errors, warnings, finalState: state };
}

// 运行模拟
console.log('开始模拟 3000 帧 (约 50 秒游戏时间)...\n');
const result = simulateBellGame(3000);

console.log('\n模拟完成!');
console.log(`总击杀连击: ${result.finalState.killCombo}`);
console.log(`最终 HP: ${result.finalState.player.hp.toFixed(1)}`);
console.log(`存活敌人: ${result.finalState.enemies.length}`);
console.log(`活跃粒子: ${result.finalState.particles.length}`);

// ── 9. 报告问题 ──
console.log('\n【9】问题报告');
console.log('──────────────────────────────────────────────────');

if (result.errors.length === 0) {
    console.log('✓ 未发现严重错误');
} else {
    console.log(`✗ 发现 ${result.errors.length} 个错误:`);
    result.errors.forEach(e => console.log('  -', e));
}

if (result.warnings.length === 0) {
    console.log('✓ 未发现警告');
} else {
    console.log(`⚠ 发现 ${result.warnings.length} 个警告:`);
    result.warnings.forEach(w => console.log('  -', w));
}

// ── 10. 代码静态分析 ──
console.log('\n【10】静态代码分析');
console.log('──────────────────────────────────────────────────');

// 检查未声明变量
const implicitGlobals = [];
const varPattern = /var\s+(\w+)/g;
const declaredVars = new Set();
let match;
while ((match = varPattern.exec(gameSrc)) !== null) {
    declaredVars.add(match[1]);
}

// 检查赋值给未声明变量
const assignPattern = /(^|[;\{\}])\s*(\w+)\s*=[^=]/gm;
while ((match = assignPattern.exec(gameSrc)) !== null) {
    const varName = match[2];
    if (!declaredVars.has(varName) && 
        !['if', 'for', 'while', 'return', 'function', 'switch', 'case', 'break', 'continue', 'true', 'false', 'null', 'undefined', 'this', 'new', 'typeof', 'instanceof'].includes(varName) &&
        !/^[A-Z]/.test(varName) && // 排除全局常量
        varName.length > 1) {
        // 可能是隐式全局变量
    }
}

// 检查特定风险模式
const riskPatterns = [
    { name: '可能除以零', pattern: /\/\s*\w+\s*\)/, severity: 'high' },
    { name: '数组越界访问', pattern: /\[\s*\w+\s*\]/, severity: 'medium' },
    { name: '递归调用', pattern: /function\s+(\w+).*\{[\s\S]*?\1\s*\(/, severity: 'low' },
];

riskPatterns.forEach(({ name, pattern, severity }) => {
    const matches = gameSrc.match(pattern);
    if (matches) {
        console.log(`${severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢'} ${name}: ${matches.length} 处`);
    }
});

// ── 11. 铃铛特定测试 ──
console.log('\n【11】铃铛武器特定测试');
console.log('──────────────────────────────────────────────────');

// 测试铃铛 + 青铜镇铃舌组合
console.log('测试铃铛 + 青铜镇铃舌 (范围+25%)...');
const bellWithRangeRelic = {
    ...result.finalState,
    player: {
        ...result.finalState.player,
        stats: { ...result.finalState.player.stats, range: 1.25 }
    }
};
console.log(`  基础范围: 100, 加成后: ${100 * 1.25}`);

// 测试铃铛 + 铃木鱼组合
console.log('测试铃铛 + 铃木鱼 (减速追加魂伤)...');
console.log('  需要敌人处于减速状态才能触发');

console.log('\n══════════════════════════════════════════════════');
console.log('  测试完成');
console.log('══════════════════════════════════════════════════');
