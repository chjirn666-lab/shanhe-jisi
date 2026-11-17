import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import '../dist/js/knowledge.js';
// Resolve every input/output against the project root so the script is safe to run from any cwd.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromRoot = (...parts) => path.join(root, ...parts);
const data = globalThis.SHANHE;
const basePoems = ['changsha','loushan','march','snow','swimming','plum'];
const baseQuotes = ['investigate','learn','seek-truth','bethune-spirit','serve-people','stay-modest'];
const sources = data.sources.filter(s => !s.id.startsWith('collection-'));
function additions(file, kind) {
  const rows = JSON.parse(fs.readFileSync(fromRoot(file),'utf8'));
  assert.equal(rows.length, kind==='poem'?23:24, file+' 条目数');
  return rows.map(row => {
    for (const field of ['id','title','year','season','theme','quote','text','reading','sourceUrl']) assert.ok(row[field], field);
    assert.ok(Number.isFinite(Number(row.year)),row.year);
    assert.ok(/^https?:\/\//.test(row.sourceUrl));
    const sourceId='collection-'+kind+'-'+row.id;
    sources.push({id:sourceId,title:row.sourceTitle,publisher:row.publisher,url:row.sourceUrl});
    const {sourceTitle,sourceUrl,publisher,...item}=row;
    return {...item,label:row.theme,heading:row.title,sources:[sourceId],terms:[row.title,row.title.split('·').pop(),row.work||row.title,row.quote.replace(/[，。！？、\s]/g,''),row.year]};
  });
}
const poems=[...data.poems.filter(p=>basePoems.includes(p.id)),...additions('poetry-additions.json','poem')];
const quotes=[...data.quotes.filter(p=>baseQuotes.includes(p.id)),...additions('quotes-additions.json','quote')];
for(const [list,expected] of [[poems,29],[quotes,30]]) {assert.equal(list.length,expected);assert.equal(new Set(list.map(x=>x.id)).size,expected);assert.equal(new Set(list.map(x=>x.title)).size,expected);}
const next={sources,events:data.events,poems,quotes,updated:data.updated||'2026-11-09',biographyPeriods:data.biographyPeriods||[]};
fs.writeFileSync(fromRoot('dist/js/knowledge.js'),'/* 史料摘要与短句节选；来源随条目保存。 */\n(function(root){\n\'use strict\';\nroot.SHANHE=Object.freeze('+JSON.stringify(next,null,2)+');\n})(globalThis);\n');
for(const [file,items] of [['poetry',poems],['quotes',quotes]]) {
  let html=fs.readFileSync(fromRoot('dist/'+file+'.html'),'utf8');
  html=html.replaceAll('六首','29首').replaceAll('六则','30则').replaceAll('共 6 ','共 30 ').replaceAll('2026年11月7日','2026年11月8日');
  const fallback='<noscript><div class="library-note"><p>启用 JavaScript 可搜索、分类和收藏，也可直接阅读以下资料：</p><ul>'+items.map(item=>'<li><a href="'+sources.find(s=>s.id===item.sources[0]).url+'" target="_blank" rel="noopener noreferrer">'+item.title+' · '+item.season+'</a></li>').join('')+'</ul></div></noscript>';
  html=html.replace(/<noscript>[\s\S]*?<\/noscript>/,()=>fallback);
  fs.writeFileSync(fromRoot('dist/'+file+'.html'),html);
}
for(const file of ['dist/index.html','dist/long-scroll.html','README.md']) {
  let body=fs.readFileSync(fromRoot(file),'utf8');
  body=body.replaceAll('六首','29首').replaceAll('六则','30则').replaceAll('六篇','30篇').replaceAll('十八条','66条').replaceAll('2026年11月7日','2026年11月8日');
  fs.writeFileSync(fromRoot(file),body);
}
console.log(JSON.stringify({poems:poems.length,quotes:quotes.length,sources:sources.length}));
