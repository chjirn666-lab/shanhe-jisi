import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const pages=['index.html','ai.html','long-scroll.html','poetry.html','quotes.html','photo-archive.html','footprints.html',...(await fs.readdir(dist)).filter(file=>/^footprint-\d{4}\.html$/.test(file))];
const problems=[];
const requireOk=(ok,message)=>{if(!ok)problems.push(message);};

// 1. HTML：唯一 id、按钮类型、本地资源、页内锚点。
for(const filename of pages){
  const html=await fs.readFile(path.join(dist,filename),'utf8');
  const ids=[...html.matchAll(/(?:^|\s)id="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'HTML id must be unique: '+filename);
  for(const [button] of html.matchAll(/<button\b[^>]*>/gi)){
    requireOk(/\stype\s*=\s*(?:"(?:button|submit|reset)"|'(?:button|submit|reset)'|(?:button|submit|reset)(?=[\s>]))/i.test(button),`按钮缺少有效 type：${filename} → ${button}`);
  }
  for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
    const ref=match[1];
    if(/^(https?:|data:|mailto:)/.test(ref))continue;
    const [fileQuery,anchor]=ref.split('#');
    const file=fileQuery.split('?')[0]||filename;
    const target=path.join(dist,file);
    let body;
    try{body=await fs.readFile(target,'utf8');}catch{problems.push(`缺失资源：${filename} -> ${ref}`);continue;}
    if(anchor&&file.endsWith('.html')){
      assert.ok(body.includes('id="'+anchor+'"'),'Missing anchor '+ref);
    }
  }
}

// 2. CSS：实际会被加载的字体与图片。
for(const name of (await fs.readdir(path.join(dist,'css'))).filter(f=>f.endsWith('.css'))){
  const css=await fs.readFile(path.join(dist,'css',name),'utf8');
  for(const m of css.matchAll(/url\(\s*['"]?(\.\.?\/[^'")?#]+)/g)){
    const ref=m[1];
    // 本项目只随附 woff2：.ttf 是字体回退格式，fa-v4compatibility 是 FA v4 兼容映射，当前页面未使用。
    if(ref.endsWith('.ttf')||ref.includes('fa-v4compatibility'))continue;
    const target=path.resolve(dist,'css',ref);
    try{await fs.access(target);}catch{problems.push(`缺失 CSS 资源：css/${name} -> ${ref}`);}
  }
}

// 3. JavaScript 语法。
const scripts=[
  'dist/js/ai-page.js','dist/js/study-core.js','tools/build-ai-page.mjs','tools/ai-page-check.mjs',
  'tools/edge-check.mjs',
  'dist/js/literature-links.js','tests/literature-links.test.mjs',
  'dist/js/assistant-ui.js','dist/js/footprint-detail.js','tools/assistant-markup.mjs',
  'dist/js/library.js','dist/js/home.js','dist/js/app.js','dist/js/knowledge.js','dist/js/guide-core.js',
  'dist/js/poetry-fulltext.js','tests/poetry-fulltext.test.mjs','tools/build-poetry-fulltext.mjs',
  'server.mjs','src/assistant.mjs','tests/core.test.mjs','tests/server.test.mjs',
  'tools/check.mjs','tools/update-collections.mjs','tools/browser-check.mjs','tools/home-check.mjs','tools/library-check.mjs',
  'tools/prepare-domestic.mjs','tools/check-links.mjs','tools/package-release.mjs','tools/build-footprints.mjs','dist/js/footprints.js','tools/footprints-check.mjs',
  'tools/build-photo-gallery.mjs','tools/download-photos.mjs','dist/js/archive.js','tools/photo-check.mjs',
  'tools/setup-local-ai.mjs','tools/run-local-ai.mjs','tools/stop-local-ai.mjs','tools/local-ai-browser-check.mjs'
];
for(const f of scripts){
  const r=spawnSync(process.execPath,['--check',path.join(root,f)],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
}

// 4. 资料库完整性与文档/页面中的数量文案一致。
await import(pathToFileURL(path.join(dist,'js','knowledge.js')).href);
const data=globalThis.SHANHE;
const entries=[...data.events,...data.poems,...data.quotes];
const articles=JSON.parse(await fs.readFile(path.join(root,'footprint-articles.json'),'utf8'));
requireOk(data.events.length===12&&data.events.length===articles.length,'12个历史节点应与本地正文清单一致');
requireOk(data.biographyPeriods?.length===10&&data.biographyPeriods.every(p=>p.paragraphs.length===2&&p.eventIds.every(id=>data.events.some(e=>e.id===id))),'十阶段生平正文与足迹节点对应不完整');
requireOk(data.events.every(e=>e.biographyIds?.length&&e.biographyIds.every(id=>data.biographyPeriods.some(p=>p.id===id))),'足迹缺少对应的生平阶段');
requireOk(data.events.every((e,i)=>!i||Number(data.events[i-1].year)<Number(e.year)),'足迹应按年份递增排列');
requireOk(data.poems.length===29,'诗词数量应为 29');
requireOk(data.quotes.length===30,'语录数量应为 30');
requireOk(new Set(entries.map(e=>e.id)).size===entries.length,'资料条目 id 重复');
requireOk(new Set(data.sources.map(s=>s.id)).size===data.sources.length,'来源 id 重复');
requireOk(entries.every(e=>Array.isArray(e.sources)&&e.sources.length&&Array.isArray(e.terms)&&e.terms.length),'存在缺少来源或检索词的条目');
requireOk(entries.every(e=>e.sources.every(id=>data.sources.some(s=>s.id===id))),'存在悬空的来源引用');
requireOk(data.events.every(e=>e.sections?.length>=3&&e.timeline?.length>=3&&e.photos?.length&&e.localUrl==='footprint-'+e.id+'.html'),'足迹图文正文、时间线、照片或独立详情页入口缺失');
for(const event of data.events)for(const photo of event.photos||[]){
  try{await fs.access(path.join(dist,photo.src));}catch{problems.push('足迹照片缺失：'+photo.src);}
  requireOk(Boolean(photo.year&&photo.context&&photo.archive),'足迹照片缺少年代或说明');
}
const photoCatalog=JSON.parse(await fs.readFile(path.join(root,'photo-catalog.json'),'utf8'));
requireOk(new Set(photoCatalog.map(p=>p.id)).size===photoCatalog.length,'图片清单ID重复');
requireOk(new Set(photoCatalog.map(p=>p.sha256)).size===photoCatalog.length,'图片清单有重复文件');
for(const photo of photoCatalog){
  requireOk(Boolean(photo.year&&photo.credit&&photo.license&&photo.sourceUrl&&photo.licenseUrl),'照片缺少年代、署名或许可：'+photo.id);
  const bytes=await fs.readFile(path.join(dist,photo.src));
  requireOk(bytes[0]===0xff&&bytes[1]===0xd8,'图片不是JPEG：'+photo.id);
  requireOk(createHash('sha256').update(bytes).digest('hex')===photo.sha256,'图片与清单校验不一致：'+photo.id);
}
const archiveHttpHosts=new Set(['dangshi.people.com.cn','theory.people.com.cn','culture.people.com.cn','www.cppcc.gov.cn']);
requireOk(data.sources.every(s=>{const u=new URL(s.url);return u.protocol==='https:'||(u.protocol==='http:'&&archiveHttpHosts.has(u.hostname));}),'存在未认可的来源协议或 HTTP 主机');

const readme=await fs.readFile(path.join(root,'README.md'),'utf8');
const declared=readme.match(/按关键词检索本站(\d+)条/);
requireOk(declared&&Number(declared[1])===entries.length,`README 资料条数与实际 ${entries.length} 条不一致`);
const scroll=await fs.readFile(path.join(dist,'long-scroll.html'),'utf8');
requireOk(!/三篇诗词资料|六个历史节点与三篇诗词/.test(scroll),'长卷问答提示中的收录数量已过时');

// 5. 诗词完整原文：条目、节选逐字对应、核对来源与文档说明。
await import(pathToFileURL(path.join(dist,'js','poetry-fulltext.js')).href);
const fullText=globalThis.SHANHE_POETRY_FULL;
const fullSource=JSON.parse(await fs.readFile(path.join(root,'poetry-fulltext.json'),'utf8'));
const plain=value=>String(value).replace(/[^\u4e00-\u9fff0-9a-zA-Z]/g,'');
requireOk(fullSource.poems.length===data.poems.length,'诗词全文源数据应为 29 首');
requireOk(Object.keys(fullText.poems).length===data.poems.length,'生成的全文数据应为 29 首');
for(const poem of data.poems){
  const row=fullSource.poems.find(p=>p.id===poem.id), built=fullText.poems[poem.id];
  requireOk(Boolean(row)&&row.title===poem.title,'全文篇名与资料库不一致：'+poem.id);
  requireOk(Boolean(row?.refs?.length)&&row.refs.every(id=>fullSource.references[id]),'核对来源引用无效：'+poem.id);
  requireOk(Boolean(built)&&plain(built.fullText).includes(plain(poem.quote)),'全篇未包含原有节选：'+poem.id);
  requireOk(Boolean(built?.sources?.length)&&built.references?.length>0,'全篇缺少出处或核对来源：'+poem.id);
  requireOk(built?.references.every(ref=>ref.url.startsWith('https://')),'核对来源不是 HTTPS：'+poem.id);
  requireOk(built?.fullText===row?.fullText,'生成数据与源文件不一致，请重新运行 build-poetry-fulltext.mjs：'+poem.id);
}
for(const ref of Object.values(fullSource.references))requireOk(/^https:\/\//.test(ref.url),'核对来源不是 HTTPS：'+ref.title);
requireOk(!/诗词只展示短句节选/.test(readme),'README 仍声明诗词只展示短句节选');
requireOk((await fs.readFile(path.join(dist,'poetry.html'),'utf8')).includes('js/poetry-fulltext.js'),'诗词馆未引入全文数据');
requireOk(scroll.includes('id="poem-fulltext"'),'数字长卷缺少全篇入口');

if(problems.length){
  console.error('检查未通过：\n - '+problems.join('\n - '));
  process.exitCode=1;
}else{
  console.log(`PASS: ${pages.length} 个页面的资源与锚点、CSS 字体资源、${scripts.length} 个脚本语法、${entries.length} 条资料与文档数量一致。`);
}
