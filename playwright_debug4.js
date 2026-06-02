const { chromium } = require('playwright');

(async () => {
  console.log('深度调试游戏初始化...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // 收集所有控制台消息
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // 在页面加载前注入调试代码
  await page.addInitScript(() => {
    window._debugLog = [];
    window._log = (msg) => {
      window._debugLog.push(msg);
      console.log('[DEBUG]', msg);
    };
    
    // 拦截 window.onerror
    window._jsErrors = [];
    window.addEventListener('error', (e) => {
      window._jsErrors.push({
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error ? e.error.stack : null
      });
    });
  });

  // 加载页面
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'networkidle', timeout: 30000 });
  
  // 等待一段时间让脚本执行
  await page.waitForTimeout(5000);

  // 检查状态
  const state = await page.evaluate(() => {
    return {
      debugLog: window._debugLog || [],
      jsErrors: window._jsErrors || [],
      gameInitialized: window._gameInitialized || false,
      // 检查 IIFE 是否执行完毕
      hasG: typeof G !== 'undefined',
      // 检查 IIFE 末尾的变量
      hasLoopActive: typeof _loopActive !== 'undefined',
      // 检查是否在 window 上暴露了任何东西
      windowKeys: Object.keys(window).filter(k => 
        ['init', 'loop', 'startGame', 'safeInit', 'G'].includes(k)
      )
    };
  });

  console.log('\n调试日志:', state.debugLog);
  console.log('\nJS 错误:', JSON.stringify(state.jsErrors, null, 2));
  console.log('\n游戏初始化状态:', state.gameInitialized);
  console.log('G 存在:', state.hasG);
  console.log('_loopActive 存在:', state.hasLoopActive);
  console.log('Window 上的游戏相关键:', state.windowKeys);

  // 尝试在页面上下文中执行 game.js 代码来查看错误
  console.log('\n尝试重新加载 game.js...');
  const reloadResult = await page.evaluate(() => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'game.js?' + Date.now();
      
      script.onload = () => {
        resolve({ success: true, message: 'Script loaded successfully' });
      };
      
      script.onerror = (e) => {
        resolve({ success: false, message: 'Script failed to load', error: e.message });
      };
      
      // 设置超时
      setTimeout(() => {
        resolve({ success: false, message: 'Timeout waiting for script' });
      }, 10000);
      
      document.head.appendChild(script);
    });
  });

  console.log('重新加载结果:', reloadResult);

  // 再次检查
  const finalState = await page.evaluate(() => {
    return {
      hasG: typeof G !== 'undefined' && G !== null,
      hasStartGame: typeof startGame === 'function',
      windowKeys: Object.keys(window).filter(k => 
        ['init', 'loop', 'startGame', 'safeInit', 'G', 'newGame'].includes(k)
      )
    };
  });

  console.log('\n最终状态:', finalState);

  await browser.close();
})();
