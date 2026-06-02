const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('══════════════════════════════════════════════════');
  console.log('  Playwright 铃铛武器游戏测试');
  console.log('══════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // 收集所有控制台消息
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text, time: Date.now() });
    if (type === 'error') {
      console.log(`[ERROR] ${text}`);
    }
  });

  // 收集页面错误
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({ message: error.message, stack: error.stack, time: Date.now() });
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // 收集网络错误
  const networkErrors = [];
  page.on('requestfailed', request => {
    networkErrors.push({ url: request.url(), failure: request.failure().errorText });
    console.log(`[NETWORK ERROR] ${request.url()}: ${request.failure().errorText}`);
  });

  try {
    // 加载游戏页面
    console.log('正在加载游戏页面...');
    await page.goto('http://localhost:8080/game.html', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 等待游戏脚本加载 - 检查 init 是否完成
    console.log('等待游戏初始化...');
    await page.waitForFunction(() => {
      return typeof window.WEAPONS !== 'undefined' && 
             typeof window.startGame === 'function';
    }, { timeout: 15000 });
    console.log('游戏已初始化');
    await page.waitForTimeout(2000);

    // 直接调用 startGame 开始游戏，选择铃铛
    console.log('直接开始游戏（铃铛武器）...');
    const started = await page.evaluate(() => {
      try {
        // 隐藏标题屏幕，显示武器选择
        var ts = document.getElementById('titleScreen');
        if (ts) ts.style.display = 'none';
        
        // 直接调用 startGame
        startGame('ling');
        return true;
      } catch (e) {
        console.error('启动游戏失败:', e.message);
        return false;
      }
    });

    if (!started) {
      throw new Error('无法启动游戏');
    }
    
    await page.waitForTimeout(3000);

    // 检查游戏状态
    const gameState = await page.evaluate(() => {
      return {
        hasG: typeof G !== 'undefined' && G !== null,
        playerHP: typeof G !== 'undefined' && G && G.player ? G.player.hp : null,
        weapon: typeof G !== 'undefined' && G && G.weapon ? G.weapon.id : null,
        state: typeof G !== 'undefined' && G ? G.state : null,
        gameContainerVisible: document.getElementById('gameContainer')?.style.display !== 'none'
      };
    });

    console.log('游戏状态:', gameState);

    // 如果游戏在诅咒选择界面，跳过它
    if (gameState.state === 'prep') {
      console.log('跳过诅咒选择...');
      await page.evaluate(() => {
        if (typeof beginRun === 'function' && typeof G !== 'undefined' && G) {
          beginRun(G);
        }
      });
      await page.waitForTimeout(2000);
    }

    // 等待游戏真正开始
    await page.waitForFunction(() => {
      return typeof G !== 'undefined' && G && G.state === 'playing';
    }, { timeout: 10000 });
    
    console.log('游戏已开始运行！');

    // 获取canvas
    const canvas = await page.$('#gameCanvas');
    if (!canvas) {
      throw new Error('找不到游戏画布');
    }

    const canvasBox = await canvas.boundingBox();
    console.log(`画布位置: ${JSON.stringify(canvasBox)}`);

    if (!canvasBox) {
      throw new Error('画布未正确渲染');
    }

    // 模拟持续攻击和游戏操作
    console.log('开始模拟游戏操作（持续30秒）...');
    const startTime = Date.now();
    const duration = 30000; // 30秒

    while (Date.now() - startTime < duration) {
      const elapsed = Date.now() - startTime;

      // 移动鼠标到画布中心附近（模拟瞄准）
      const mx = canvasBox.x + canvasBox.width / 2 + (Math.random() - 0.5) * 200;
      const my = canvasBox.y + canvasBox.height / 2 + (Math.random() - 0.5) * 200;
      await page.mouse.move(mx, my);

      // 持续按住鼠标左键（攻击）
      await page.mouse.down();

      // WASD 移动
      const keys = ['w', 'a', 's', 'd'];
      const key = keys[Math.floor(Math.random() * keys.length)];
      await page.keyboard.press(key);

      // 偶尔闪避
      if (Math.random() < 0.05) {
        await page.keyboard.press('Shift');
      }

      // 每5秒报告一次状态
      if (elapsed % 5000 < 100) {
        const state = await page.evaluate(() => {
          if (typeof G === 'undefined' || !G) return null;
          return {
            playerHP: G.player ? G.player.hp : null,
            maxHp: G.player ? G.player.maxHp : null,
            wave: G.stage ? G.stage.wave : null,
            enemies: G.enemies ? G.enemies.length : null,
            kills: G.kills || 0,
            frame: G.frame || 0,
            weapon: G.weapon ? G.weapon.id : null,
            state: G.state
          };
        }).catch(() => null);

        if (state) {
          console.log(`  [${(elapsed/1000).toFixed(1)}s] 状态:${state.state} 武器:${state.weapon} HP:${state.playerHP?.toFixed(0)}/${state.maxHp} 波次:${state.wave} 敌人:${state.enemies} 击杀:${state.kills}`);
        }
      }

      await page.waitForTimeout(50); // 20 FPS
    }

    await page.mouse.up();

  } catch (e) {
    console.log(`测试过程中出错: ${e.message}`);
  }

  // 报告结果
  console.log('\n══════════════════════════════════════════════════');
  console.log('  测试结果报告');
  console.log('══════════════════════════════════════════════════');

  console.log(`