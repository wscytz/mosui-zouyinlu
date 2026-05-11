// visual_smoke_test.js — v4.33 Playwright 视觉冒烟
// 启动本地 HTTP 服务 → 无头 Chromium → 按流程走一遍核心路径
// 运行：node visual_smoke_test.js

var path=require('path');
var os=require('os');
// Default to user-local Playwright browser cache if no explicit path set.
if(!process.env.PLAYWRIGHT_BROWSERS_PATH){
  process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(os.homedir(),'AppData','Local','ms-playwright');
}

var http=require('http');
var fs=require('fs');
var {chromium}=require('playwright');

var PORT=52637;
var ROOT=process.cwd();

var MIME={
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.webp':'image/webp'
};

function serve(req,res){
  var url=req.url.split('?')[0];
  if(url==='/')url='/game.html';
  var filePath=path.join(ROOT,url);
  if(!filePath.startsWith(ROOT)){res.writeHead(403);res.end('forbidden');return}
  fs.readFile(filePath,function(err,data){
    if(err){res.writeHead(404);res.end('not found');return}
    var ext=path.extname(filePath).toLowerCase();
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream'});
    res.end(data);
  });
}

async function run(){
  var server=http.createServer(serve);
  await new Promise(function(resolve){server.listen(PORT,'127.0.0.1',resolve)});
  var errors=[];
  var browser;
  try{
    browser=await chromium.launch({headless:true});
    var ctx=await browser.newContext({viewport:{width:1024,height:720}});
    var page=await ctx.newPage();

    var consoleErrors=[];
    // Ignore known benign 404s (optional decorative calligraphy art, handled by onerror).
    var IGNORE_404=['title_calligraphy.png','subtitle_calligraphy.png'];
    function isIgnored(msg){return IGNORE_404.some(function(p){return String(msg||'').indexOf(p)>=0})}
    page.on('pageerror',function(err){if(!isIgnored(err.message))consoleErrors.push('pageerror: '+err.message)});
    page.on('console',function(msg){
      if(msg.type()!=='error')return;
      var loc=msg.location()||{};
      var combined=(msg.text()||'')+' '+(loc.url||'');
      if(isIgnored(combined))return;
      // Browser-generated "Failed to load resource" errors correlate with URL; handled by response listener.
      if(/Failed to load resource/.test(msg.text()||'')&&!loc.url)return;
      consoleErrors.push('console: '+msg.text());
    });
    page.on('response',function(res){
      if(res.status()>=400&&!isIgnored(res.url()))consoleErrors.push('http '+res.status()+' '+res.url());
    });

    // Test 1: Title screen loads
    await page.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#titleScreen',{state:'visible',timeout:5000});
    var startBtnVisible=await page.isVisible('#startBtn');
    if(!startBtnVisible)errors.push('title: startBtn not visible');
    var titleText=await page.textContent('#startBtn');
    if(!titleText||titleText.indexOf('进入')<0)errors.push('title: startBtn text wrong: '+titleText);

    // Test 2: Click start → weapon select visible
    await page.click('#startBtn');
    await page.waitForSelector('#weaponSelect',{state:'visible',timeout:5000});
    var weaponChoicesCount=await page.locator('#weaponChoices .weapon-pick').count();
    if(weaponChoicesCount<4)errors.push('weapon: choices count='+weaponChoicesCount+' (expected >=4)');

    // Test 3: Pick a weapon → canvas renders
    await page.locator('#weaponChoices .weapon-pick').first().click();
    await page.waitForTimeout(400);
    // Dismiss curse popup if it appears (weapon pick opens curse select before gameplay starts)
    var curseVisible=await page.isVisible('#cursePopup');
    if(curseVisible){
      var skipBtn=await page.$('#cursePopup .curse-skip');
      if(skipBtn){await skipBtn.click()}
      else{await page.locator('#curseChoices .relic-pick').first().click()}
      await page.waitForTimeout(500);
    }

    // Canvas should be visible and drawing
    await page.waitForSelector('#gameCanvas',{state:'visible',timeout:5000});
    await page.waitForTimeout(1500); // let game run ~1.5s
    var canvasSize=await page.evaluate(function(){
      var c=document.getElementById('gameCanvas');
      return c?{w:c.width,h:c.height,visible:c.offsetWidth>0&&c.offsetHeight>0}:null;
    });
    if(!canvasSize)errors.push('canvas: element missing');
    else{
      if(canvasSize.w<100||canvasSize.h<100)errors.push('canvas: too small '+JSON.stringify(canvasSize));
      if(!canvasSize.visible)errors.push('canvas: not visible');
    }

    // Test 4: Canvas has non-trivial content (pixel check)
    var nonEmpty=await page.evaluate(function(){
      var c=document.getElementById('gameCanvas');
      if(!c)return {ok:false,reason:'no canvas'};
      var g=c.getContext('2d');
      if(!g)return {ok:false,reason:'no ctx'};
      try{
        var img=g.getImageData(0,0,c.width,c.height).data;
        var distinctColors={},sample=0;
        for(var i=0;i<img.length;i+=4*1000){
          var key=img[i]+','+img[i+1]+','+img[i+2];
          distinctColors[key]=true;
          sample++;
        }
        return {ok:Object.keys(distinctColors).length>5,distinct:Object.keys(distinctColors).length,sample:sample};
      }catch(e){return {ok:false,reason:e.message}}
    });
    if(!nonEmpty.ok)errors.push('canvas: appears blank/uniform ('+(nonEmpty.reason||('distinct='+nonEmpty.distinct))+')');

    // Test 5: No console errors during gameplay
    if(consoleErrors.length){
      errors.push('page had '+consoleErrors.length+' console errors:');
      consoleErrors.slice(0,5).forEach(function(e){errors.push('  '+e.slice(0,120))});
    }

    // Test 6: Pause overlay toggles via Escape
    // Proxy-check game state by: gameContainer visible + titleScreen hidden + no relic popup
    var gameReady=await page.evaluate(function(){
      var gc=document.getElementById('gameContainer');
      var ts=document.getElementById('titleScreen');
      var rp=document.getElementById('relicPopup');
      var ws=document.getElementById('weaponSelect');
      return {
        container:gc&&gc.offsetWidth>0,
        titleHidden:!ts||ts.style.display==='none'||ts.offsetWidth===0,
        noRelic:!rp||rp.style.display==='none',
        noWeapon:!ws||ws.style.display==='none'
      };
    });
    if(!gameReady.container||!gameReady.titleHidden||!gameReady.noRelic||!gameReady.noWeapon){
      errors.push('pause: game not in playing state: '+JSON.stringify(gameReady)+'; skipping pause tests');
    }else{
      // Escape key via window event dispatch — matches the game.js window.addEventListener("keydown")
      await page.evaluate(function(){
        var ev=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,which:27,bubbles:true,cancelable:true});
        window.dispatchEvent(ev);
      });
      await page.waitForTimeout(500);
      var pauseVisible=await page.isVisible('#pauseOverlay');
      if(!pauseVisible)errors.push('pause: #pauseOverlay not visible after Escape keydown');
      var resumeBtnVisible=await page.isVisible('#resumeBtn');
      if(!resumeBtnVisible)errors.push('pause: #resumeBtn not visible');

      // Test 7: Resume restores gameplay (pauseOverlay hides)
      if(pauseVisible){
        await page.click('#resumeBtn');
        await page.waitForTimeout(400);
        var stillPaused=await page.isVisible('#pauseOverlay');
        if(stillPaused)errors.push('pause: #pauseOverlay still visible after resume click');
      }
    }

    await ctx.close();

    // ===== Mobile viewport smoke (375x812 portrait + 812x375 landscape) =====
    var mobileErrors=[];
    var mCtx=await browser.newContext({
      viewport:{width:375,height:812},
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      isMobile:true,
      hasTouch:true
    });
    var mPage=await mCtx.newPage();
    var mConsoleErrors=[];
    mPage.on('pageerror',function(err){if(!isIgnored(err.message))mConsoleErrors.push('pageerror: '+err.message)});
    mPage.on('console',function(msg){
      if(msg.type()!=='error')return;
      var combined=(msg.text()||'')+' '+((msg.location()||{}).url||'');
      if(isIgnored(combined))return;
      if(/Failed to load resource/.test(msg.text()||'')&&!((msg.location()||{}).url))return;
      mConsoleErrors.push('mobile console: '+msg.text());
    });
    mPage.on('response',function(res){
      if(res.status()>=400&&!isIgnored(res.url()))mConsoleErrors.push('mobile http '+res.status()+' '+res.url());
    });

    // Test 8: Title screen renders in portrait 375x812
    await mPage.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'domcontentloaded'});
    await mPage.waitForSelector('#titleScreen',{state:'visible',timeout:5000});
    var mStartVisible=await mPage.isVisible('#startBtn');
    if(!mStartVisible)mobileErrors.push('mobile portrait: startBtn not visible');

    // Test 9: Landscape rotation (812x375) — viewport resizes cleanly, title still usable
    await mPage.setViewportSize({width:812,height:375});
    await mPage.waitForTimeout(400);
    var mStartLandscape=await mPage.isVisible('#startBtn');
    if(!mStartLandscape)mobileErrors.push('mobile landscape: startBtn not visible after rotate');

    // Test 10: No new console errors on mobile
    if(mConsoleErrors.length){
      mobileErrors.push('mobile had '+mConsoleErrors.length+' console errors:');
      mConsoleErrors.slice(0,3).forEach(function(e){mobileErrors.push('  '+e.slice(0,120))});
    }

    errors=errors.concat(mobileErrors);
    await mCtx.close();

    // ===== Wiki page smoke (Test 11) =====
    var wikiCtx=await browser.newContext({viewport:{width:1024,height:720}});
    var wikiPage=await wikiCtx.newPage();
    var wikiErrors=[];
    wikiPage.on('pageerror',function(err){wikiErrors.push('wiki pageerror: '+err.message)});
    await wikiPage.goto('http://127.0.0.1:'+PORT+'/wiki.html',{waitUntil:'domcontentloaded'});
    await wikiPage.waitForTimeout(500);
    var wikiCheck=await wikiPage.evaluate(function(){
      var relicGrid=document.getElementById('relicGrid');
      var enemyGrid=document.getElementById('enemyGrid');
      var achGrid=document.getElementById('achGrid');
      return {
        relics:relicGrid?relicGrid.children.length:0,
        enemies:enemyGrid?enemyGrid.children.length:0,
        achievements:achGrid?achGrid.children.length:0
      };
    });
    if(wikiCheck.relics<100)wikiErrors.push('wiki: relicGrid only '+wikiCheck.relics+' cards (expected 100+)');
    if(wikiCheck.enemies<20)wikiErrors.push('wiki: enemyGrid only '+wikiCheck.enemies+' cards (expected 20+)');
    if(wikiCheck.achievements<20)wikiErrors.push('wiki: achGrid only '+wikiCheck.achievements+' cards (expected 20+)');
    errors=errors.concat(wikiErrors);
    await wikiCtx.close();

    // ===== Game Over DOM structure check (Test 12) =====
    var goCtx=await browser.newContext({viewport:{width:1024,height:720}});
    var goPage=await goCtx.newPage();
    await goPage.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'domcontentloaded'});
    var goCheck=await goPage.evaluate(function(){
      var go=document.getElementById('gameOver');
      var title=document.getElementById('endTitle');
      var stats=document.getElementById('endStats');
      var restart=document.getElementById('restartBtn');
      return {
        exists:!!go,
        hidden:go?go.style.display==='none':false,
        hasTitle:!!title,
        hasStats:!!stats,
        hasRestart:!!restart
      };
    });
    if(!goCheck.exists)errors.push('gameOver: #gameOver missing');
    else{
      if(!goCheck.hidden)errors.push('gameOver: should be display:none initially');
      if(!goCheck.hasTitle)errors.push('gameOver: #endTitle missing');
      if(!goCheck.hasStats)errors.push('gameOver: #endStats missing');
      if(!goCheck.hasRestart)errors.push('gameOver: #restartBtn missing');
    }
    await goCtx.close();
  }catch(e){
    errors.push('runner: '+e.message);
  }finally{
    if(browser)await browser.close();
    server.close();
  }

  console.log('=== v5.0-prep visual smoke ===');
  if(errors.length){
    console.log('FAIL ('+errors.length+'):');
    errors.forEach(function(e){console.log('  - '+e)});
    process.exit(1);
  }else{
    console.log('ALL VISUAL SMOKE TESTS PASSED');
    console.log('  1. Title screen loads, start button visible');
    console.log('  2. Weapon select shows >=4 weapons');
    console.log('  3. Canvas visible after weapon pick');
    console.log('  4. Canvas has varied non-blank content');
    console.log('  5. No console errors during gameplay');
    console.log('  6. Escape dispatches pause overlay');
    console.log('  7. Resume button hides pause overlay');
    console.log('  8. Mobile portrait 375x812 renders title');
    console.log('  9. Mobile landscape 812x375 keeps title usable');
    console.log(' 10. No mobile console errors');
    console.log(' 11. Wiki page renders relics/enemies/achievements');
    console.log(' 12. Game over DOM structure intact');
  }
}

run().catch(function(e){console.error('fatal:',e);process.exit(2)});
