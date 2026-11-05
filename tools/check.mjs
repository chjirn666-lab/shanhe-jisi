import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const filename of ['index.html','long-scroll.html']){
 const html=await fs.readFile(path.join(root,'dist',filename),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'HTML id must be unique: '+filename);
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const ref=match[1];if(/^(https?:|data:)/.test(ref))continue;
  const [fileQuery,anchor]=ref.split('#');const file=fileQuery.split('?')[0]||filename;
  const target=path.join(root,'dist',file);await fs.access(target);
  if(anchor&&file.endsWith('.html')){const body=await fs.readFile(target,'utf8');assert.ok(body.includes('id="'+anchor+'"'),'Missing anchor '+ref);}
 }
}
for(const f of ['dist/js/home.js','dist/js/app.js','dist/js/knowledge.js','dist/js/guide-core.js','server.mjs','src/assistant.mjs']){const r=spawnSync(process.execPath,['--check',path.join(root,f)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
console.log('PASS: 本地资源、页面锚点、唯一 ID 与 JavaScript 语法。');
