import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const entries=['dist','src','server.mjs','package.json','.env.example','README.md','部署说明.md','修复验收.md','诗词全文补全验收.md','本地AI使用说明.md','local-ai.config.json','Dockerfile','.dockerignore','compose.yaml','deploy','0-打开网页.cmd','1-启动网站.cmd','2-启动本地AI.cmd','3-停止本地AI.cmd','tests','tools','poetry-additions.json','quotes-additions.json','domestic-sources.json','archive-links.json','footprint-articles.json','photo-catalog.json','poetry-fulltext.json'];
entries.push('biography-periods.json');
const withLocalAI=process.argv.includes('--with-local-ai'),runtimeEntries=[];
if(withLocalAI){
  const config=JSON.parse(await fs.readFile(path.join(root,'local-ai.config.json'),'utf8'));
  if(!/^b\d+$/.test(config.engineVersion)||!/^[-_a-z0-9.]+\.gguf$/.test(config.modelFile))throw new Error('本地模型路径配置无效');
  runtimeEntries.push('.runtime/local-ai/bin-'+config.engineVersion,'.runtime/local-ai/models/'+config.modelFile,'.runtime/local-ai/downloads/llama-'+config.engineVersion+'.zip','.runtime/local-ai/licenses/Qwen-APACHE-2.0.txt','.runtime/local-ai/licenses/llama.cpp-MIT.txt');
  entries.push(...runtimeEntries);
}
async function digest(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
const files=[];
async function inspect(relative){
  const absolute=path.join(root,relative),stat=await fs.lstat(absolute);
  if(stat.isSymbolicLink())throw new Error('部署包不接受符号链接：'+relative);
  if(stat.isDirectory()){for(const name of await fs.readdir(absolute))await inspect(path.join(relative,name));return;}
  if(!stat.isFile())throw new Error('只允许普通文件：'+relative);
  const normalized=relative.split(path.sep).join('/');
  const allowedRuntime=withLocalAI&&runtimeEntries.some(p=>normalized===p||normalized.startsWith(p+'/'));
  if(relative.split(path.sep).some(p=>['.env','.git','.workbuddy','node_modules','preview'].includes(p))||(relative.split(path.sep).includes('.runtime')&&!allowedRuntime))throw new Error('敏感或本地文件不应打包：'+relative);
  files.push({path:normalized,bytes:stat.size,sha256:await digest(absolute)});
}
for(const entry of entries)await inspect(entry);
await fs.mkdir(path.join(root,'release'),{recursive:true});
const name=(withLocalAI?'山河寄思-本地AI离线版':'山河寄思-独立部署')+(process.platform==='win32'?'.zip':'.tar.gz');
const archive=path.join(root,'release',name);
// Windows 自带的 bsdtar 会把 "D:\..." 里的盘符当成远程主机（Cannot connect to D:），
// 因此 tar 一律用相对路径并在项目根目录执行，GNU tar 与 bsdtar 都能正常工作。
const archiveArg='release/'+name;
const tarOptions={stdio:'pipe',cwd:root};
// Windows bsdtar otherwise writes Chinese names in the local code page without marking their encoding.
const compression=process.platform==='win32'?['--options','zip:hdrcharset=UTF-8','-a']:['-z'];
execFileSync('tar',[...compression,'-cf',archiveArg,'-C','.',...entries],tarOptions);
const contents=execFileSync('tar',['-tf',archiveArg],{...tarOptions,encoding:'utf8'});
if(/(?:^|\/)(?:\.env|\.git|\.workbuddy|node_modules|preview)(?:\/|$)/m.test(contents)||(!withLocalAI&&/(?:^|\/)\.runtime(?:\/|$)/m.test(contents)))throw new Error('压缩包发现不应包含的文件');
if(withLocalAI&&contents.split(/\r?\n/).filter(n=>n.startsWith('.runtime/')&&!n.endsWith('/')).some(n=>!runtimeEntries.some(p=>n===p||n.startsWith(p+'/'))))throw new Error('压缩包包含额外的运行状态文件');
const sha256=await digest(archive);
const manifest={archive:name,sha256,fileCount:files.length,files};
await fs.writeFile(path.join(root,withLocalAI?'release/本地AI部署包清单.json':'release/部署包清单.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({archive,sha256,fileCount:files.length,bytes:(await fs.stat(archive)).size}));
