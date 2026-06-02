const { chromium } = require('playwright');

(async () => {
  console.log('捕获游戏初始化错误...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // 收集所有控制台消息
  const logs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });

  page.on('pageerror', error => {
    const text = `[PAGE ERROR] ${error.message}\n[STACK] ${error.stack}`;
    logs.push(text);
    console.log(text);
  });

  // 在页面加载前注入错误捕获
  await page.addInitScript(() => {
    window._initErrors = [];
    window._originalConsoleError = console.error;
    console.error = function(...args) {
      window._initErrors.push(args.join(' '));
      window._originalConsoleError.apply(console, args);
    };
  });

  // 加载页面
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // 等待一段时间让脚本执行
  await page.waitForTimeout(5000);

  // 检查捕获的错误
  const errors = await page.evaluate(() => {
    return {
      initErrors: window._initErrors || [],
      safeInitResult: window._safeInitResult || '未记录',
      // 检查 game.js 是否完整加载
      scriptLoaded: (() => {
        const scripts = Array.from(document.scripts);
        const gameScript = scripts.find(s => s.src.includes('game.js'));
        return gameScript ? { src: gameScript.src, loaded: true } : { loaded: false };
      })()
    };
  });

  console.log('\n捕获的错误:', JSON.stringify(errors, null, 2));

  // 尝试解析 game.js 看是否有语法错误
  const syntaxCheck = await page.evaluate(() => {
    return new Promise((resolve) => {
      fetch('game.js')
        .then(r => r.text())
        .then(code => {
          try {
            // 尝试用 Function 构造器解析
            new Function(code);
            resolve({ valid: true });
          } catch (e) {
            resolve({ valid: false, error: e.message, line: e.lineNumber });
          }
        })
        .catch(e => resolve({ valid: false, error: e.message }));
    });
  });

  console.log('\n语法检查结果:', JSON.stringify(syntaxCheck, null, 2));

  await browser.close();
})();
