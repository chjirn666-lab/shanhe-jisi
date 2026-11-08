import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const pages=['index.html','long-scroll.html','poetry.html','quotes.html','photo-archive.html'];
const problems=[];
const requireOk=(ok,message)=>{if(!ok)problems.push(message);};

// 1. HTML：唯一 id、本地资源、页内锚点。
for(const filename of pages){
  const html=await fs.readFile(path.join(dist,filename),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'HTML id must be unique: '+filename);
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
  'dist/js/library.js','dist/js/home.js','dist/js/app.js','dist/js/knowledge.js','dist/js/guide-core.js',
  'server.mjs','src/assistant.mjs','tests/core.test.mjs','tests/server.test.mjs',
  'tools/check.mjs','tools/update-collections.mjs','tools/browser-check.mjs','tools/home-check.mjs','tools/library-check.mjs',
  'tools/prepare-domestic.mjs','tools/check-links.mjs','tools/package-release.mjs'
];
for(const f of scripts){
  const r=spawnSync(process.execPath,['--check',path.join(root,f)],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
}

// 4. 资料库完整性与文档/页面中的数量文案一致。
await import(pathToFileURL(path.join(dist,'js','knowledge.js')).href);
const data=globalThis.SHANHE;
const entries=[...data.events,...data.poems,...data.quotes];
requireOk(data.events.length===6,'历史节点数量应为 6');
requireOk(data.poems.length===30,'诗词数量应为 30');
requireOk(data.quotes.length===30,'语录数量应为 30');
requireOk(new Set(entries.map(e=>e.id)).size===entries.length,'资料条目 id 重复');
requireOk(new Set(data.sources.map(s=>s.id)).size===data.sources.length,'来源 id 重复');
requireOk(entries.every(e=>Array.isArray(e.sources)&&e.sources.length&&Array.isArray(e.terms)&&e.terms.length),'存在缺少来源或检索词的条目');
requireOk(entries.every(e=>e.sources.every(id=>data.sources.some(s=>s.id===id))),'存在悬空的来源引用');
const archiveHttpHosts=new Set(['dangshi.people.com.cn','theory.people.com.cn','culture.people.com.cn','www.cppcc.gov.cn']);
requireOk(data.sources.every(s=>{const u=new URL(s.url);return u.protocol==='https:'||(u.protocol==='http:'&&archiveHttpHosts.has(u.hostname));}),'存在未认可的来源协议或 HTTP 主机');

const readme=await fs.readFile(path.join(root,'README.md'),'utf8');
const declared=readme.match(/按关键词检索本站(\d+)条/);
requireOk(declared&&Number(declared[1])===entries.length,`README 资料条数与实际 ${entries.length} 条不一致`);
const scroll=await fs.readFile(path.join(dist,'long-scroll.html'),'utf8');
requireOk(!/三篇诗词资料|六个历史节点与三篇诗词/.test(scroll),'长卷问答提示中的收录数量已过时');

if(problems.length){
  console.error('检查未通过：\n - '+problems.join('\n - '));
  process.exitCode=1;
}else{
  console.log(`PASS: ${pages.length} 个页面的资源与锚点、CSS 字体资源、${scripts.length} 个脚本语法、${entries.length} 条资料与文档数量一致。`);
}
