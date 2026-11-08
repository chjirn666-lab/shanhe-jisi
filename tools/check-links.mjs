import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../dist/js/knowledge.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const urls=new Set(globalThis.SHANHE.sources.map(s=>s.url));
for(const name of (await fs.readdir(path.join(root,'dist'))).filter(n=>n.endsWith('.html'))){
  const html=await fs.readFile(path.join(root,'dist',name),'utf8');
  for(const m of html.matchAll(/href="(https?:[^"<>]+)"/g))urls.add(m[1].replaceAll('&amp;','&'));
}
const pending=[...urls],results=[];
async function probe(url){
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Mozilla/5.0 ShanheLinkCheck/1.0'}});
      const result={url,status:response.status,ok:response.ok,finalUrl:response.url};
      await response.body?.cancel();if(!result.ok&&attempt===0)continue;return result;
    }catch(error){if(attempt===1)return {url,status:null,ok:false,error:error.name,code:error.cause?.code||null};}
  }
}
await Promise.all(Array.from({length:6},async()=>{while(pending.length){const url=pending.shift();results.push(await probe(url));}}));
results.sort((a,b)=>a.url.localeCompare(b.url));
const report={checkedAt:new Date().toISOString(),scope:'当前执行位置的HTTP探测，非中国各地区网络保证',total:results.length,passed:results.filter(r=>r.ok).length,results};
await fs.mkdir(path.join(root,'preview'),{recursive:true});
await fs.writeFile(path.join(root,'preview/link-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:results.filter(r=>!r.ok)},null,2));
