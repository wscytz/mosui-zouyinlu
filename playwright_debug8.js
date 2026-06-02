const { chromium } = require('playwright');

(async () => {
  console.log('调试游戏启动流程...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // 加载页面
  await page.goto('http://localhost:8080/game.html', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 检查初始状态
  const initialState = await page.evaluate(() => {
    return {
      titleScreen: document.getElementById('titleScreen')?.style.display,
      weaponSelect: document.getElementById('weaponSelect')?.style.display,
      gameContainer: document.getElementById('gameContainer')?.style.display,
      cursePopup: document.getElementById('cursePopup')?.style.display
    };
  });
  console.log('初始状态:', initialState);

  // 点击开始按钮
  console.log('\n点击开始按钮...');
  await page.click('#startBtn');
  await page.waitForTimeout(1500);

  // 检查武器选择界面
  const weaponState = await page.evaluate(() => {
    return {
      titleScreen: document.getElementById('titleScreen')?.style.display,
      weaponSelect: document.getElementById('weaponSelect')?.style.display,
      gameContainer: document.getElementById('gameContainer')?.style.display,
      weaponChoices: document.querySelectorAll('.weapon-pick').length
    };
  });
  console.log('武器选择状态:', weaponState);

  // 选择铃铛武器
  console.log('\n选择铃铛武器...');
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

  // 检查诅咒选择界面
  const curseState = await page.evaluate(() => {
    return {
      weaponSelect: document.getElementById('weaponSelect')?.style.display,
      gameContainer: document.getElementById('gameContainer')?.style.display,
      cursePopup: document.getElementById('cursePopup')?.style.display,
      curseChoices: document.querySelectorAll('.curse-card').length
    };
  });
  console.log('诅咒选择状态:', curseState);

  // 跳过诅咒选择
  if (curseState.cursePopup === '') {
    console.log('\n跳过诅咒选择...');
    await page.evaluate(() => {
      const skipBtn = document.querySelector('.curse-skip');
      if (skipBtn) skipBtn.click();
    });
    await page.waitForTimeout(2000);
  }

  // 检查最终状态
  const finalState = await page.evaluate(() => {
    return {
      weaponSelect: document.getElementById('weaponSelect')?.style.display,
      gameContainer: document.getElementById('gameContainer')?.style.display,
      cursePopup: document.getElementById('cursePopup')?.style.display,
      gameCanvas: document.getElementById('gameCanvas')?.style.display,
      bodyClass: document.body.className
    };
  });
  console.log('最终状态:', finalState);

  await browser.close();
})();
