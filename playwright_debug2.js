const { chromium } = require('playwright');

(async () => {
  console.log('调试游戏初始化...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // 收集所有控制台消息
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log(`[STACK] ${error.stack}`);
  });

  // 加载页面
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // 等待一段时间
  await page.waitForTimeout(3000);

  // 检查 init 是否被调用
  const initState = await page.evaluate(() => {
    return {
      initCalled: window._gameInitialized || false,
      hasCanvas: !!document.getElementById('gameCanvas'),
      canvasContext: (() => {
        const c = document.getElementById('gameCanvas');
        return c ? !!c.getContext('2d') : false;
      })(),
      titleScreenVisible: document.getElementById('titleScreen')?.style.display !== 'none',
      loadingScreenVisible: document.getElementById('loadingScreen')?.style.display !== 'none',
      // 检查关键函数
      functions: {
        init: typeof init === 'function',
        loop: typeof loop === 'function',
        startGame: typeof startGame === 'function',
        newGame: typeof newGame === 'function',
        setupWeaponSelect: typeof setupWeaponSelect === 'function'
      }
    };
  });

  console.log('\n初始化状态:', JSON.stringify(initState, null, 2));

  // 尝试手动调用 init
  if (!initState.initCalled) {
    console.log('\n尝试手动调用 init()...');
    const result = await page.evaluate(() => {
      try {
        if (typeof init === 'function') {
          init();
          return { success: true };
        }
        return { success: false, reason: 'init 函数不存在' };
      } catch (e) {
        return { success: false, reason: e.message, stack: e.stack };
      }
    });
    console.log('手动调用结果:', result);
  }

  // 再次检查
  const finalState = await page.evaluate(() => {
    return {
      initCalled: window._gameInitialized || false,
      hasG: typeof G !== 'undefined' && G !== null,
      functions: {
        startGame: typeof startGame === 'function',
        loop: typeof loop === 'function'
      }
    };
  });

  console.log('\n最终状态:', JSON.stringify(finalState, null, 2));

  await browser.close();
})();
