import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import '../dist/js/knowledge.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {default:puppeteer}=await import(pathToFileURL(process.env.PUPPETEER_MODULE).href);
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_PATH,headless:true});
const base='http://127.0.0.1:8790/',errors=[],checks=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1440,height:1000});
 for(const event of SHANHE.events){
  const response=await page.goto(base+event.localUrl,{waitUntil:'networkidle0'});
  assert.equal(response.status(),200);assert.equal(await page.$$eval('h1',els=>els.length),1);
  assert.ok(await page.$eval('h1',el=>el.getBoundingClientRect().height<110),'桌面标题不应被挤成窄列');
  assert.equal(await page.$$eval('.footprint-chapter',els=>els.length),1);
  assert.equal(await page.$$eval('.chapter-prose>.footprint-section:not(.timeline-section)',els=>els.length),3);
  assert.equal(await page.$$eval('.chapter-timeline li',els=>els.length),4);
  assert.ok(await page.$eval('.chapter-prose',el=>el.textContent.length>500));
  await page.$$eval('.footprint-photo img',images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode();})));
  assert.equal(await page.$$eval('#story-dialog',els=>els.length),0);
  assert.equal(await page.$eval('#detail-ai a',el=>el.getAttribute('href')),'ai.html?event='+event.id);
 }
 checks.push('12个独立详情页均有完整正文、时间线、照片和独立AI页入口');
 await page.goto(base+'footprint-1921.html',{waitUntil:'networkidle0'});
 await page.click('#reader-theme');assert.equal(await page.$eval('html',el=>el.dataset.theme),'dark');
 await page.click('#reader-theme');
 for(const width of [390,320]){
  await page.setViewport({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 await page.screenshot({path:path.join(root,'preview/detail-page-mobile.png')});
 checks.push('独立页面深色模式和手机布局正常');
 const offline=await browser.newPage();await offline.setJavaScriptEnabled(false);await offline.setOfflineMode(true);
 await offline.goto(pathToFileURL(path.join(root,'dist/footprints.html')).href,{waitUntil:'load'});
 const text=await offline.$eval('body',el=>el.textContent);
 const periods=JSON.parse(await fs.readFile(path.join(root,'biography-periods.json'),'utf8'));
 for(const period of periods)for(const paragraph of period.paragraphs)assert.ok(text.includes(paragraph));
 await offline.goto(pathToFileURL(path.join(root,'dist/footprint-1921.html')).href,{waitUntil:'load'});
 assert.ok(await offline.$eval('body',el=>el.textContent.includes('新民学会')));
 await offline.$$eval('.footprint-photo img',images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode();})));
 checks.push('断网禁用JS仍可阅读全部生平资料与独立详情照片');
 assert.deepEqual(errors,[]);
 const result={passed:checks.length,checks,errors};
 await fs.writeFile(path.join(root,'preview/footprints-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
