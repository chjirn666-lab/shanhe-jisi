import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const entries=['dist','src','server.mjs','package.json','.env.example','README.md','部署说明.md','修复验收.md','Dockerfile','.dockerignore','compose.yaml','deploy','打开网页.cmd','启动网站.cmd','tests','tools','poetry-additions.json','quotes-additions.json','domestic-sources.json','archive-links.json'];
const files=[];
async function inspect(relative){
  const absolute=path.join(root,relative),stat=await fs.lstat(absolute);
  if(stat.isSymbolicLink())throw new Error('部署包不接受符号链接：'+relative);
  if(stat.isDirectory()){for(const name of await fs.readdir(absolute))await inspect(path.join(relative,name));return;}
  if(!stat.isFile())throw new Error('只允许普通文件：'+relative);
  if(relative.split(path.sep).some(p=>['.env','.git','.runtime','.workbuddy','node_modules','preview'].includes(p)))throw new Error('敏感或本地文件不应打包：'+relative);
  files.push({path:relative.split(path.sep).join('/'),bytes:stat.size,sha256:createHash('sha256').update(await fs.readFile(absolute)).digest('hex')});
}
for(const entry of entries)await inspect(entry);
await fs.mkdir(path.join(root,'release'),{recursive:true});
const name='山河寄思-独立部署'+(process.platform==='win32'?'.zip':'.tar.gz');
const archive=path.join(root,'release',name);
execFileSync('tar',[process.platform==='win32'?'-a':'-z','-cf',archive,'-C',root,...entries],{stdio:'pipe'});
const contents=execFileSync('tar',['-tf',archive],{encoding:'utf8'});
if(/(?:^|\/)(?:\.env|\.git|\.runtime|\.workbuddy|node_modules|preview)(?:\/|$)/m.test(contents))throw new Error('压缩包发现不应包含的文件');
const sha256=createHash('sha256').update(await fs.readFile(archive)).digest('hex');
const manifest={archive:name,sha256,fileCount:files.length,files};
await fs.writeFile(path.join(root,'release/部署包清单.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({archive,sha256,fileCount:files.length,bytes:(await fs.stat(archive)).size}));
