import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const config=JSON.parse(await fs.readFile(path.join(root,'local-ai.config.json'),'utf8'));
export const runtime=path.join(root,'.runtime/local-ai');
export const modelPath=path.join(runtime,'models',config.modelFile);
export const engineDir=path.join(runtime,'bin-'+config.engineVersion);
export const enginePath=path.join(engineDir,'llama-server.exe');
async function sha256(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function download(url,target,expectedHash,expectedBytes){
  await fs.mkdir(path.dirname(target),{recursive:true});
  try{const stat=await fs.stat(target);if((!expectedBytes||stat.size===expectedBytes)&&(!expectedHash||await sha256(target)===expectedHash)){console.log('已校验 '+path.basename(target));return;}}catch(error){if(error.code!=='ENOENT')throw error;}
  const partial=target+'.part';let offset=0;
  try{offset=(await fs.stat(partial)).size;}catch(error){if(error.code!=='ENOENT')throw error;}
  if(expectedBytes&&offset>expectedBytes)throw new Error('下载缓存大小异常：'+partial);
  if(!expectedBytes||offset!==expectedBytes){
    const response=await fetch(url,{headers:offset?{Range:'bytes='+offset+'-'}:{},signal:AbortSignal.timeout(1200000)});
    if(!response.ok)throw new Error('下载失败 HTTP '+response.status+'：'+new URL(url).hostname);
    const resumed=offset>0&&response.status===206;
    if(resumed&&!response.headers.get('content-range')?.startsWith('bytes '+offset+'-'))throw new Error('断点续传范围不一致');
    if(!resumed)offset=0;
    const file=await fs.open(partial,resumed?'a':'w'),reader=response.body.getReader();let size=offset,last=Date.now();
    console.log('正在下载 '+path.basename(target)+'，'+(offset?'从 '+Math.round(offset/1048576)+' MB 继续':'开始'));
    try{
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(expectedBytes&&size>expectedBytes)throw new Error('下载大小超过预期');let written=0;while(written<value.byteLength){const result=await file.write(value,written,value.byteLength-written);if(!result.bytesWritten)throw new Error('下载文件写入失败');written+=result.bytesWritten;}if(Date.now()-last>5000){console.log(path.basename(target)+'：'+Math.round(size/1048576)+' / '+Math.round((expectedBytes||size)/1048576)+' MB');last=Date.now();}}
    }finally{await reader.cancel().catch(()=>{});await file.close();reader.releaseLock();}
    if(expectedBytes&&size!==expectedBytes)throw new Error('下载尚未完成，可再次运行继续：'+path.basename(target));
  }
  const digest=await sha256(partial);
  if(expectedHash&&digest!==expectedHash)throw new Error('SHA256校验失败，请检查缓存：'+path.basename(target));
  await fs.rename(partial,target);console.log('下载并校验完成 '+path.basename(target));
}
export async function setupLocalAI(){
  if(process.platform!=='win32'||process.arch!=='x64')throw new Error('便携自动安装目前适用于Windows x64；其他系统可自行部署兼容的本地模型接口。');
  const archive=path.join(runtime,'downloads/llama-'+config.engineVersion+'.zip');
  await download(config.engineUrl,archive,config.engineSha256,config.engineBytes);
  await fs.mkdir(engineDir,{recursive:true});
  const names=execFileSync('tar',['-tf',archive],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  if(names.some(name=>path.win32.isAbsolute(name)||name.split(/[\\/]/).includes('..')))throw new Error('推理器压缩包包含不安全路径');
  let missing=false;
  for(const name of names.filter(n=>!n.endsWith('/'))){try{const stat=await fs.lstat(path.join(engineDir,name));if(!stat.isFile()||stat.isSymbolicLink())throw new Error('推理器路径包含非普通文件');}catch(error){if(error.code==='ENOENT')missing=true;else throw error;}}
  if(missing)execFileSync('tar',['-xf',archive,'-C',engineDir]);
  await fs.access(enginePath);
  await download(config.modelUrl,modelPath,config.modelSha256,config.modelBytes);
  await download(config.modelLicenseUrl,path.join(runtime,'licenses/Qwen-APACHE-2.0.txt'),config.modelLicenseSha256,11343);
  await download(config.engineLicenseUrl,path.join(runtime,'licenses/llama.cpp-MIT.txt'));
  await fs.writeFile(path.join(runtime,'installed.json'),JSON.stringify({modelId:config.modelId,modelSha256:config.modelSha256,engineVersion:config.engineVersion,installedAt:new Date().toISOString()},null,2));
  console.log('本地AI准备完成：'+config.name+'。无需云端密钥。');
  return {modelPath,enginePath};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))setupLocalAI().catch(error=>{console.error(error.message);process.exitCode=1;});
