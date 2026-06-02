const { chromium } = require('playwright');

(async () => {
  console.log('测试 init() 函数执行...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // 收集所有控制台消息
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // 加载页面
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // 等待脚本加载
  await page.waitForTimeout(3000);

  // 检查 safeInit 是否执行，以及是否有错误
  const state = await page.evaluate(() => {
    return {
      _gameInitialized: window._gameInitialized || false,
      loadLogContent: document.getElementById('loadDiag')?.textContent || '无',
      // 尝试获取所有控制台错误
      errors: window._jsErrors || []
    };
  });

  console.log('初始化状态:', state._gameInitialized);
  console.log('加载日志:', state.loadLogContent);

  // 手动调用 safeInit 并捕获结果
  console.log('\n手动调用 safeInit()...');
  const result = await page.evaluate(() => {
    return new Promise((resolve) => {
      // 重置 _gameInitialized 以便再次调用 init
      window._gameInitialized = false;
      
      try {
        // 直接调用 init
        if (typeof init === 'function') {
          init();
          resolve({ success: true, message: 'init() executed' });
        } else {
          resolve({ success: false, message: 'init function not found' });
        }
      } catch (e) {
        resolve({ success: false, message: e.message, stack: e.stack });
      }
    });
  });

  console.log('调用结果:', JSON.stringify(result, null, 2));

  // 检查调用后的状态
  const afterState = await page.evaluate(() => {
    return {
      hasG: typeof G !== 'undefined' && G !== null,
      hasStartGame: typeof startGame === 'function',
      hasLoop: typeof loop === 'function',
      gameContainerVisible: document.getElementById('gameContainer')?.style.display !== 'none'
    };
  });

  console.log('\n调用后状态:', JSON.stringify(afterState, null, 2));

  await browser.close();
})();
