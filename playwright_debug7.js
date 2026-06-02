const { chromium } = require('playwright');

(async () => {
  console.log('直接测试 game.js 在浏览器中的执行...\n');

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
  
  // 等待脚本加载
  await page.waitForTimeout(3000);

  // 尝试在页面上下文中直接执行 game.js 的代码来查看错误
  const result = await page.evaluate(async () => {
    try {
      // 获取 game.js 的内容
      const response = await fetch('game.js');
      const code = await response.text();
      
      // 尝试执行代码
      try {
        // 使用 eval 执行，这样可以捕获错误
        eval(code);
        return { success: true, message: 'Code executed successfully' };
      } catch (e) {
        return { 
          success: false, 
          message: e.message,
          stack: e.stack,
          // 尝试找到错误位置
          line: e.lineNumber,
          column: e.columnNumber
        };
      }
    } catch (e) {
      return { success: false, message: 'Failed to fetch game.js: ' + e.message };
    }
  });

  console.log('\n执行结果:', JSON.stringify(result, null, 2));

  // 检查执行后的状态
  const state = await page.evaluate(() => {
    return {
      hasG: typeof G !== 'undefined' && G !== null,
      hasStartGame: typeof startGame === 'function',
      hasLoop: typeof loop === 'function',
      hasInit: typeof init === 'function'
    };
  });

  console.log('\n执行后状态:', JSON.stringify(state, null, 2));

  await browser.close();
})();
