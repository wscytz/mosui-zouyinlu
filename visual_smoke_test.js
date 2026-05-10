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
    // Click confirm / start button inside weaponSelect if present
    var confirmBtn=await page.$('#weaponSelect button.button:visible, #startGameBtn, button[data-action="start"]');
    if(confirmBtn){await confirmBtn.click()}

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

    await ctx.close();
  }catch(e){
    errors.push('runner: '+e.message);
  }finally{
    if(browser)await browser.close();
    server.close();
  }

  console.log('=== v4.33 visual smoke ===');
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
  }
}

run().catch(function(e){console.error('fatal:',e);process.exit(2)});
