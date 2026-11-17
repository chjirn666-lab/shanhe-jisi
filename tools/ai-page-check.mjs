import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {default:puppeteer}=await import(pathToFileURL(process.env.PUPPETEER_MODULE).href);
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_PATH,headless:true});
const base='http://127.0.0.1:8790/',checks=[],errors=[],external=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
 page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(base)){external.push(request.url());request.abort();}else request.continue();});
 await page.setViewport({width:1440,height:1000});await page.goto(base+'ai.html',{waitUntil:'networkidle0'});
 assert.equal(await page.$$eval('h1',els=>els.length),1);
 await page.waitForFunction(()=>document.querySelector('[data-role="mode"]').textContent.includes('已就绪'));
 const response=page.waitForResponse(r=>r.url().endsWith('/api/ask'));
 await page.type('#ai-chat-question','毛泽东1954年在哪个城市主持起草宪法？');await page.click('[data-role="send"]');
 const payload=await (await response).json();assert.equal(payload.mode,'ai');assert.equal(payload.provider,'local');assert.match(payload.answer,/杭州/);
 await page.waitForSelector('.ai-local-links a[href="footprint-1954.html"]');
 await page.waitForFunction(()=>!document.getElementById('ai-chat-question').disabled);
 await page.screenshot({path:path.join(root,'preview/ai-page-desktop.png')});
 checks.push('独立AI页实际调用本地千问，回答附本地图文入口');
 const studyResponse=page.waitForResponse(r=>r.url().endsWith('/api/ask'));
 await page.click('[data-study-topic="chongqing"]');
 const study=await (await studyResponse).json();
 assert.equal(study.mode,'ai');
 assert.match(study.study.points[0].text,/1936年2月.*1945年8月28日.*1945年11月14日/);
 assert.match(study.study.points[1].text,/重庆机场合影.*并非《双十协定》签字现场/);
 await page.waitForSelector('[data-study-compare="chongqing"]:enabled');
 assert.equal(await page.$$eval('.ai-study-points a[href="poetry.html?entry=snow"]',els=>els.length),1);
 await page.click('.ai-study-points li:last-child .ai-evidence summary');
 await page.waitForFunction(()=>document.querySelector('.ai-study-points img')?.naturalWidth>0);
 assert.match(await page.$eval('.ai-study-points li:last-child .ai-evidence a',a=>a.getAttribute('href')),/^photo-archive\.html#/);
 await page.click('[data-study-compare="chongqing"]');
 await page.waitForFunction(()=>document.querySelectorAll('.ai-message-assistant:last-child .ai-evidence[open]').length===3);
 assert.equal(await page.$$eval('.ai-message-assistant:last-child .ai-study-points',els=>els.length),0);
 checks.push('真实模型研读区分三项日期，照片出处可展开，同题对照直接展示相同资料');
 await page.goto(base+'footprint-1921.html',{waitUntil:'networkidle0'});
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('.detail-actions a')]);
 assert.equal(new URL(page.url()).searchParams.get('event'),'1921');
 assert.equal(await page.$eval('#ai-reading-context',el=>el.hidden),false);
 assert.equal(await page.$eval('#ai-context-return',el=>el.getAttribute('href')),'footprint-1921.html');
 await page.select('#ai-chat-answer-mode','retrieval');await page.click('[data-ai-question]');
 await page.waitForFunction(()=>document.querySelector('.ai-message-assistant')?.textContent.includes('中共一大'));
 assert.equal(await page.$eval('.ai-local-links a',el=>el.getAttribute('href')),'footprint-1921.html');
 checks.push('足迹主题随入口传入，提问和返回原文均对应1921节点');
 await page.select('#ai-chat-answer-mode','auto');
 await page.click('[data-ai-question]:nth-child(2)');
 await page.waitForFunction(()=>!document.getElementById('ai-chat-question').disabled);
 const timeline=await page.$eval('.ai-message-assistant:last-child>p',el=>el.textContent);
 assert.match(timeline,/1919年7月 · 主编《湘江评论》。/);
 assert.match(timeline,/1921年7月 · 与何叔衡作为长沙代表参加中共一大。/);
 checks.push('“梳理时间线”列出足迹记录中的具体日期和事件');
 await page.goto(base+'ai.html?event=%3Cscript%3E',{waitUntil:'networkidle0'});
 assert.equal(await page.$eval('#ai-reading-context',el=>el.hidden),true);
 checks.push('未知或异常主题参数安全退回通用问答');
 for(const width of [768,390,320]){
  await page.setViewport({width,height:900});await page.goto(base+'ai.html?event=1921',{waitUntil:'networkidle0'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 await page.screenshot({path:path.join(root,'preview/ai-page-mobile.png')});
 await page.click('#reader-theme');assert.equal(await page.$eval('html',el=>el.dataset.theme),'dark');await page.click('#reader-theme');
 checks.push('独立页深色模式及768/390/320px布局正常');
 const remotePage=await browser.newPage(),remoteRequests=[];
 remotePage.on('pageerror',e=>errors.push(e.message));
 await remotePage.setRequestInterception(true);
 remotePage.on('request',request=>{
  if(request.url()===base+'api/status'){
   return request.respond({status:200,contentType:'application/json',body:JSON.stringify({service:'shanhe-jisi',mode:'ai',provider:'remote',ready:null,model:'remote-test'})});
  }
  if(request.url()===base+'api/ask'){
   remoteRequests.push({method:request.method(),data:JSON.parse(request.postData())});
   const payload={mode:'ai',provider:'remote',answer:'云端模型测试回答。',matches:['1893'],sources:[]};
   return request.respond({status:remoteRequests.length===1?200:503,contentType:'application/json',body:JSON.stringify(payload)});
  }
  return request.continue();
 });
 await remotePage.goto(base+'ai.html',{waitUntil:'networkidle0'});
 assert.equal(await remotePage.$eval('[data-role="mode"]',el=>el.textContent),'云端AI已配置');
 await remotePage.type('#ai-chat-question','毛泽东出生在哪里？');
 await remotePage.click('[data-role="send"]');
 await remotePage.waitForFunction(()=>document.querySelector('.ai-message-assistant')?.textContent.includes('云端AI解读'));
 assert.deepEqual(remoteRequests,[{method:'POST',data:{question:'毛泽东出生在哪里？',answerMode:'auto'}}]);
 await remotePage.click('[data-ai-question]');
 await remotePage.waitForFunction(()=>document.querySelector('[data-role="status"]').textContent.includes('云端AI暂不可用'));
 assert.equal(remoteRequests.length,2);
 assert.match(await remotePage.$eval('.ai-message-assistant:last-child',el=>el.textContent),/本地资料.*杭州/s);
 await remotePage.select('#ai-chat-answer-mode','retrieval');
 await remotePage.click('[data-ai-question]');
 await remotePage.waitForFunction(()=>document.querySelectorAll('.ai-message-assistant').length===3);
 assert.equal(remoteRequests.length,2);
 await remotePage.close();
 checks.push('云端模式请求后端并标明来源，接口失败回退，纯资料模式跳过请求');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const result={passed:checks.length,checks,realLocalAnswer:payload.answer,errors,externalRequests:external};
 await fs.writeFile(path.join(root,'preview/ai-page-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
