import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {default:puppeteer}=await import(pathToFileURL(process.env.PUPPETEER_MODULE).href);
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_PATH,headless:true});
const base='http://127.0.0.1:8790/',checks=[],errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1440,height:1000});await page.goto(base,{waitUntil:'networkidle0'});
 assert.equal(await page.$$eval('.map-result',els=>els.length),12);
 assert.equal(await page.$$eval('[data-assistant],#story-dialog,.spot-card',els=>els.length),0);
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('#home-ai>a')]);assert.match(page.url(),/ai.html$/);
 assert.equal(await page.$$eval('[data-assistant]',els=>els.length),1);
 checks.push('首页仅保留AI入口，点击进入独立问答页');
 await page.goto(base,{waitUntil:'networkidle0'});await page.select('#map-period','period-03');
 assert.equal(await page.$$eval('.map-result',els=>els.length),1);
 assert.match(await page.$eval('#map-period-copy',el=>el.textContent),/农民运动讲习所/);await page.click('#map-reset');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('[data-event="1921"]')]);
 assert.match(page.url(),/footprint-1921\.html$/);assert.equal(await page.$$eval('[data-assistant]',els=>els.length),0);
 await page.click('#detail-bookmark');await page.click('#detail-mark-read');
 await page.goto(base,{waitUntil:'networkidle0'});
 assert.equal(await page.$eval('#favorite-count',el=>el.textContent),'1');assert.equal(await page.$eval('#read-count',el=>el.textContent),'1');
 checks.push('足迹与阶段筛选正常，详情页收藏和已读同步');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('.step-spot-link')]);assert.match(page.url(),/footprint-1893\.html$/);
 checks.push('主题研读进入对应足迹');
 for(const width of [390,320]){
  await page.setViewport({width,height:900});
  for(const file of ['index.html','ai.html','footprint-1921.html','footprints.html','photo-archive.html']){
   await page.goto(base+file,{waitUntil:'networkidle0'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
 }
 await page.goto(base,{waitUntil:'networkidle0'});await page.click('#mobile-menu-btn');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('#nav-links a[href="ai.html"]')]);assert.match(page.url(),/ai.html$/);
 checks.push('手机菜单能打开AI页，首页、问答和足迹320/390px无溢出');
 const offline=await browser.newPage();await offline.goto(pathToFileURL(path.join(root,'dist/index.html')).href,{waitUntil:'load'});
 await Promise.all([offline.waitForNavigation({waitUntil:'load'}),offline.click('#home-ai>a')]);
 await offline.select('#ai-chat-answer-mode','retrieval');await offline.type('#ai-chat-question','毛泽东出生在哪里？');await offline.click('[data-role="send"]');
 await offline.waitForFunction(()=>document.querySelector('.ai-message-assistant')?.textContent.includes('韶山'));
 checks.push('本地HTML可以进入独立AI页并检索资料');
 assert.deepEqual(errors,[]);const result={passed:checks.length,checks,errors};
 await fs.writeFile(path.join(root,'preview/homepage-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
