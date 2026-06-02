const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('调试游戏页面加载...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // 收集控制台消息
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // 加载页面
  console.log('加载游戏页面...');
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // 等待一段时间让脚本加载
  await page.waitForTimeout(5000);

  // 检查关键变量
  const state = await page.evaluate(() => {
    return {
      hasWEAPONS: typeof WEAPONS !== 'undefined',
      hasRELICS: typeof RELICS !== 'undefined',
      hasTUNING: typeof TUNING !== 'undefined',
      hasStartGame: typeof startGame === 'function',
      hasInit: typeof init === 'function',
      hasG: typeof G !== 'undefined',
      hasGameJS: typeof loop === 'function',
      documentReady: document.readyState,
      scripts: Array.from(document.scripts).map(s => s.src),
      loadLog: window._loadLog ? '存在' : '不存在'
    };
  });

  console.log('\n页面状态:', JSON.stringify(state, null, 2));

  // 截图
  await page.screenshot({ path: 'game_debug.png', fullPage: true });
  console.log('\n截图已保存到 game_debug.png');

  // 检查是否有加载诊断信息
  const diagText = await page.evaluate(() => {
    const diag = document.getElementById('loadDiag');
    return diag ? diag.textContent : '无诊断信息';
  });
  console.log('加载诊断:', diagText);

  await browser.close();
})();
