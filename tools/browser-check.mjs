// Optional browser QA: set PUPPETEER_MODULE and BROWSER_PATH for your host.
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.env.PUPPETEER_MODULE||!process.env.BROWSER_PATH)throw new Error('Set PUPPETEER_MODULE and BROWSER_PATH');
const {default:puppeteer}=await import(pathToFileURL(process.env.PUPPETEER_MODULE).href);
const out=path.join(root,'preview');await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_PATH,headless:true,args:['--disable-gpu']});
const checks=[],errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('404'))errors.push(message.text());});
 await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:8790/long-scroll.html',{waitUntil:'networkidle0'});
 await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 assert.equal(await page.title(),'山河寄思 · 纪念毛泽东同志');checks.push('desktop loaded');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push('desktop has no horizontal overflow');
 await page.click('#year-1935');assert.equal(await page.$eval('#journey-year',e=>e.textContent),'1935');checks.push('timeline selection');
 await page.focus('#year-1935');await page.keyboard.press('ArrowRight');assert.equal(await page.$eval('#journey-year',e=>e.textContent),'1949');checks.push('keyboard timeline');
 await page.click('#bookmark');assert.equal(await page.$eval('#bookmark-count',e=>e.textContent),'01');
 await page.reload({waitUntil:'networkidle0'});assert.equal(await page.$eval('#bookmark-count',e=>e.textContent),'01');checks.push('bookmark persists');
 await page.click('#poem-tab-loushan');assert.match(await page.$eval('#poem-quote',e=>e.textContent),/苍山如海/);checks.push('poem switches');
 await page.click('[data-question="毛泽东出生在哪里？"]');await page.waitForFunction(()=>document.querySelectorAll('.answer-sources a').length>0);assert.match(await page.$eval('#conversation',e=>e.textContent),/韶山/);checks.push('question and citations');
 await page.type('#question','今天的天气怎么样？');await page.click('#send-question');await page.waitForFunction(()=>document.querySelector('#conversation').textContent.includes('没有收录'));checks.push('unsupported question');
 await page.type('#memory-message','读过这些历史，我愿带着勇气与责任，认真走好自己的路。');await page.type('#memory-name','山河读者');await page.click('#memory-form button[type=submit]');assert.equal(await page.$eval('#download-card',e=>e.disabled),false);assert.match(await page.$eval('#memory-canvas',e=>e.getAttribute('aria-label')),/山河读者/);checks.push('custom card generated');
 const client=await page.createCDPSession();await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:out});await page.click('#download-card');
 let downloaded=false;for(let i=0;i<20;i++){if((await fs.readdir(out)).some(f=>f.endsWith('.png')&&f.startsWith('山河寄思-'))){downloaded=true;break;}await new Promise(r=>setTimeout(r,150));}assert.ok(downloaded);checks.push('PNG downloaded');
 await page.reload({waitUntil:'networkidle0'});assert.match(await page.$eval('#memory-message',e=>e.value),/勇气与责任/);checks.push('card text persists');
 await page.click('[data-open-sources]');assert.equal(await page.$eval('#sources-dialog',e=>e.open),true);await page.keyboard.press('Escape');assert.equal(await page.$eval('#sources-dialog',e=>e.open),false);checks.push('sources dialog and escape');
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});await page.goto('http://127.0.0.1:8790/long-scroll.html',{waitUntil:'networkidle0'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});checks.push('390px responsive');
 await page.click('#menu-toggle');assert.equal(await page.$eval('#menu-toggle',e=>e.getAttribute('aria-expanded')),'true');await page.click('#main-nav a[href="#memory"]');assert.equal(await page.$eval('#menu-toggle',e=>e.getAttribute('aria-expanded')),'false');checks.push('mobile menu');
 await page.setViewport({width:320,height:700,deviceScaleFactor:1});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push('320px has no overflow');
 const offline=await browser.newPage();offline.on('pageerror',e=>errors.push(e.message));await offline.goto(pathToFileURL(path.join(root,'dist/long-scroll.html')).href,{waitUntil:'load'});await offline.click('[data-question="毛泽东出生在哪里？"]');await offline.waitForFunction(()=>document.querySelectorAll('.answer-sources a').length>0);checks.push('file mode retrieval');
 assert.deepEqual(errors,[]);checks.push('no JavaScript or CSP errors');
 await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify({passed:checks.length,checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,checks,errors},null,2));
}finally{await browser.close();}
