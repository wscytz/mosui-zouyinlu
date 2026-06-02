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

    // 等待游戏初始化完成
    console.log('等待游戏初始化...');
    await page.waitForFunction(() => {
      return window._gameInitialized === true;
    }, { timeout: 15000 });
    console.log('游戏已初始化');

    // 点击开始按钮
    console.log('点击开始按钮...');
    await page.click('#startBtn');
    await page.waitForTimeout(1500);

    // 等待武器选择界面
    console.log('等待武器选择界面...');
    await page.waitForFunction(() => {
      const ws = document.getElementById('weaponSelect');
      return ws && ws.style.display !== 'none';
    }, { timeout: 10000 });
    
    // 选择铃铛武器
    console.log('选择铃铛武器...');
    await page.evaluate(() => {
      const weapons = document.querySelectorAll('.weapon-pick');
      for (let w of weapons) {
        if (w.dataset.weapon === 'ling') {
          w.click();
          return;
        }
      }
      if (weapons.length >= 3) weapons[2].click();
    });
    await page.waitForTimeout(2000);

    // 等待诅咒选择界面
    console.log('等待诅咒选择...');
    await page.waitForFunction(() => {
      const cp = document.getElementById('cursePopup');
      return cp && cp.style.display !== 'none';
    }, { timeout: 10000 });
    
    // 跳过诅咒选择
    console.log('跳过诅咒选择...');
    await page.evaluate(() => {
      const skipBtn = document.querySelector('.curse-skip');
      if (skipBtn) skipBtn.click();
    });
    await page.waitForTimeout(2000);

    // 等待游戏容器可见
    console.log('等待游戏开始...');
    await page.waitForFunction(() => {
      const gc = document.getElementById('gameContainer');
      return gc && gc.style.display !== 'none';
    }, { timeout: 10000 });
    console.log('游戏已开始！');
    await page.waitForTimeout(1000);

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
          const hpText = document.getElementById('hpText')?.textContent;
          const waveInfo = document.getElementById('waveInfo')?.textContent;
          const killCount = document.getElementById('killCount')?.textContent;
          
          return {
            hp: hpText,
            wave: waveInfo,
            kills: killCount
          };
        }).catch(() => null);

        if (state) {
          console.log(`  [${(elapsed/1000).toFixed(1)}s] HP:${state.hp} 波次:${state.wave} 击杀:${state.kills}`);
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

  console.log(`\n控制台消息: ${consoleLogs.length} 条`);
  const errors = consoleLogs.filter(l => l.type === 'error');
  const warnings = consoleLogs.filter(l => l.type === 'warning');

  if (errors.length > 0) {
    console.log(`\n错误消息 (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e.text}`));
  } else {
    console.log('\n✓ 未发现控制台错误');
  }

  if (warnings.length > 0) {
    console.log(`\n警告消息 (${warnings.length}):`);
    warnings.forEach(w => console.log(`  - ${w.text}`));
  }

  if (pageErrors.length > 0) {
    console.log(`\n页面错误 (${pageErrors.length}):`);
    pageErrors.forEach(e => console.log(`  - ${e.message}`));
  } else {
    console.log('\n✓ 未发现页面错误');
  }

  if (networkErrors.length > 0) {
    console.log(`\n网络错误 (${networkErrors.length}):`);
    networkErrors.forEach(e => console.log(`  - ${e.url}: ${e.failure}`));
  } else {
    console.log('\n✓ 未发现网络错误');
  }

  // 保存详细日志
  const logData = {
    timestamp: new Date().toISOString(),
    consoleLogs,
    pageErrors,
    networkErrors
  };
  fs.writeFileSync('bell_test_logs.json', JSON.stringify(logData, null, 2));
  console.log('\n详细日志已保存到 bell_test_logs.json');

  await browser.close();
  console.log('\n测试完成');
})();
