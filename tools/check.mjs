import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=await fs.readFile(path.join(root,'dist/index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const ref=match[1];if(/^(https?:|#|data:)/.test(ref))continue;await fs.access(path.join(root,'dist',ref));}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'HTML id must be unique');
for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(match[1]),'Missing anchor '+match[1]);
for(const f of ['dist/js/app.js','dist/js/knowledge.js','dist/js/guide-core.js','server.mjs','src/assistant.mjs']){const r=spawnSync(process.execPath,['--check',path.join(root,f)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
console.log('PASS: 本地资源、页面锚点、唯一 ID 与 JavaScript 语法。');
