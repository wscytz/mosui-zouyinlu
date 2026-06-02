const { chromium } = require('playwright');

(async () => {
  console.log('捕获 game.js IIFE 执行错误...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // 收集所有控制台消息和错误
  const logs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });

  page.on('pageerror', error => {
    const text = `[PAGE ERROR] ${error.message}\n${error.stack}`;
    logs.push(text);
    console.log(text);
  });

  // 在页面加载前注入错误捕获
  await page.addInitScript(() => {
    window._allErrors = [];
    
    // 捕获全局错误
    window.addEventListener('error', (e) => {
      window._allErrors.push({
        type: 'error',
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error ? e.error.stack : null
      });
    });
    
    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (e) => {
      window._allErrors.push({
        type: 'unhandledrejection',
        message: e.reason ? e.reason.message : 'Unknown',
        stack: e.reason ? e.reason.stack : null
      });
    });
    
    // 拦截 console.error
    const originalError = console.error;
    console.error = function(...args) {
      window._allErrors.push({
        type: 'console.error',
        message: args.join(' ')
      });
      originalError.apply(console, args);
    };
  });

  // 加载页面
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'networkidle', timeout: 30000 });
  
  // 等待脚本执行
  await page.waitForTimeout(5000);

  // 检查捕获的错误
  const errors = await page.evaluate(() => {
    return window._allErrors || [];
  });

  console.log('\n══════════════════════════════════════════════════');
  console.log('  捕获的错误:');
  console.log('══════════════════════════════════════════════════');
  
  if (errors.length === 0) {
    console.log('✓ 未发现错误');
  } else {
    errors.forEach((e, i) => {
      console.log(`\n[${i + 1}] ${e.type}:`);
      console.log(`  消息: ${e.message}`);
      if (e.filename) console.log(`  文件: ${e.filename}:${e.lineno}:${e.colno}`);
      if (e.stack) console.log(`  堆栈: ${e.stack.substring(0, 200)}...`);
    });
  }

  // 检查游戏状态
  const gameState = await page.evaluate(() => {
    return {
      _gameInitialized: window._gameInitialized || false,
      // 检查 IIFE 是否完整执行
      hasCanvas: typeof canvas !== 'undefined',
      hasCtx: typeof ctx !== 'undefined',
      hasG: typeof G !== 'undefined',
      hasKeys: typeof keys !== 'undefined',
      hasMouse: typeof mouse !== 'undefined',
      // 检查函数
      hasInit: typeof init === 'function',
      hasLoop: typeof loop === 'function',
      hasStartGame: typeof startGame === 'function',
      hasNewGame: typeof newGame === 'function',
      hasSetupWeaponSelect: typeof setupWeaponSelect === 'function',
      hasBuildBg: typeof buildBg === 'function',
      hasTogglePause: typeof togglePause === 'function'
    };
  });

  console.log('\n══════════════════════════════════════════════════');
  console.log('  游戏状态:');
  console.log('══════════════════════════════════════════════════');
  console.log(JSON.stringify(gameState, null, 2));

  await browser.close();
})();
