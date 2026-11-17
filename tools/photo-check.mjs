import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.env.PUPPETEER_MODULE||!process.env.BROWSER_PATH)throw new Error('Set PUPPETEER_MODULE and BROWSER_PATH.');
const {default:puppeteer}=await import(pathToFileURL(process.env.PUPPETEER_MODULE).href);
const photos=JSON.parse(await fs.readFile(path.join(root,'photo-catalog.json'),'utf8'));
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_PATH,headless:true});
const base='http://127.0.0.1:8790/',checks=[],errors=[];
try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:1440,height:1000});await page.goto(base+'photo-archive.html',{waitUntil:'networkidle0'});
  assert.equal(await page.$$eval('.archive-entry',els=>els.length),photos.length);
  await page.$$eval('.archive-image img',images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode();})));
  await page.screenshot({path:path.join(root,'preview/photos-desktop.png')});
  for(const category of ['人物肖像','历史活动','足迹场景']){
    await page.click('[data-photo-filter="'+category+'"]');
    assert.equal(await page.$$eval('.archive-entry:not([hidden])',els=>els.length),photos.filter(p=>p.category===category).length);
  }
  await page.click('[data-photo-filter=""]');await page.type('#photo-search','1949');
  assert.equal(await page.$$eval('.archive-entry:not([hidden])',els=>els.length),1);
  await page.type('#photo-search','不存在');assert.equal(await page.$eval('#photo-empty',el=>el.hidden),false);
  await page.$eval('#photo-search',el=>{el.value='';el.dispatchEvent(new Event('input'));});
  await page.select('#photo-sort','newest');
  const years=await page.$$eval('.archive-entry',els=>els.map(el=>Number(el.dataset.year)));
  assert.equal(years.at(-1),9999);assert.deepEqual(years.slice(0,-1),[...years.slice(0,-1)].sort((a,b)=>b-a));
  checks.push('16张照片加载、三类筛选、关键词检索、空结果与年代排序');
  await page.click('[data-photo-filter="人物肖像"]');
  await page.evaluate(()=>{location.hash='zunyi-site';});
  await page.waitForFunction(()=>!document.getElementById('zunyi-site').hidden);
  assert.match(await page.$eval('#zunyi-site .archive-credit',el=>el.textContent),/N509FZ/);
  assert.match(await page.$eval('#zunyi-site .archive-license',el=>el.textContent),/CC BY-SA 4.0/);
  await page.click('#archive-theme');assert.equal(await page.$eval('html',el=>el.dataset.theme),'dark');await page.click('#archive-theme');
  checks.push('图片深链接自动显示，署名许可齐全与深色模式');
  for(const width of [390,320]){
    await page.setViewport({width,height:900});await page.goto(base+'photo-archive.html',{waitUntil:'networkidle0'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(root,'preview/photos-mobile-'+width+'.png')});
  }
  checks.push('390px和320px相册布局无横向溢出');
  const offline=await browser.newPage(),external=[];
  await offline.setOfflineMode(true);await offline.setJavaScriptEnabled(false);
  offline.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await offline.goto(pathToFileURL(path.join(root,'dist/photo-archive.html')).href,{waitUntil:'load'});
  assert.equal(await offline.$$eval('.archive-entry',els=>els.length),photos.length);
  await offline.$$eval('.archive-image img',images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode();})));
  assert.deepEqual(external,[]);checks.push('关闭网络和JavaScript仍可浏览16张图片及图注，没有远程图片请求');
  assert.deepEqual(errors,[]);
  const result={passed:checks.length,checks,errors};await fs.writeFile(path.join(root,'preview/photo-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
