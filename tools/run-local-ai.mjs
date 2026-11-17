import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer,loadEnvironment} from '../server.mjs';
import {setupLocalAI,root,runtime,config,enginePath,engineDir,modelPath} from './setup-local-ai.mjs';

const env=await loadEnvironment({...process.env});
const port=Number(env.PORT||8790);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('网站端口无效。');
const base='http://127.0.0.1:'+port,modelBase='http://127.0.0.1:'+config.modelPort;
const noOpen=process.argv.includes('--no-open');
function openBrowser(){if(!noOpen)spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Start-Process -FilePath '"+base+"/ai.html'"],{windowsHide:true,stdio:'ignore'}).unref();}
async function probe(url){try{const r=await fetch(url,{signal:AbortSignal.timeout(2000)});if(r.ok)return await r.json();}catch{}return null;}
const existing=await probe(base+'/api/status');
if(existing){
  if(existing.service==='shanhe-jisi'&&existing.provider==='local'&&existing.model===config.modelId&&existing.ready){console.log('本地AI网站已运行：'+base+'/ai.html');openBrowser();process.exit(0);}
  throw new Error('网站端口已有其他服务，请先关闭旧网站或修改 PORT。');
}
await setupLocalAI();
let engine,web,closing=false;
const stateFile=path.join(runtime,'run-state.json');
async function close(){
  if(closing)return;closing=true;
  if(engine&&!engine.killed)engine.kill();
  if(web){web.close();web.closeIdleConnections();const timer=setTimeout(()=>web.closeAllConnections(),3000);timer.unref();}
  try{const current=JSON.parse(await fs.readFile(stateFile,'utf8'));if(current.launcherPid===process.pid)await fs.unlink(stateFile);}catch{}
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{close().catch(()=>{});});
try{
  const models=await probe(modelBase+'/v1/models');
  if(models){if(!models.data?.some(m=>m.id===config.modelId))throw new Error('模型端口已有其他服务，请调整 local-ai.config.json 的 modelPort。');}
  else{
    const log=await fs.open(path.join(runtime,'engine.log'),'a');
    engine=spawn(enginePath,['--model',modelPath,'--alias',config.modelId,'--host','127.0.0.1','--port',String(config.modelPort),'--ctx-size',String(config.contextSize),'--threads',String(config.threads),'--parallel','1','--n-gpu-layers','0','--batch-size','512','--ubatch-size','128','--no-webui'],{cwd:engineDir,windowsHide:true,stdio:['ignore',log.fd,log.fd]});
    let bootError;engine.once('error',error=>{bootError=error;});await log.close();
    const deadline=Date.now()+90000;let ready=false,last=0;
    while(Date.now()<deadline&&!closing){
      if(bootError)throw bootError;
      if(engine.exitCode!==null)throw new Error('本地模型启动失败，请查看 .runtime/local-ai/engine.log。');
      const result=await probe(modelBase+'/v1/models');
      if(result?.data?.some(m=>m.id===config.modelId)){ready=true;break;}
      if(Date.now()-last>5000){console.log('正在载入通义千问轻量模型……');last=Date.now();}
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    if(!ready)throw new Error('模型启动超时，请检查本地运行日志。');
  }
  if(closing)throw new Error('启动已取消。');
  Object.assign(env,{AI_PROVIDER:'local',HOST:'127.0.0.1',APP_ORIGIN:'',LOCAL_AI_BASE_URL:modelBase+'/v1',LOCAL_AI_MODEL:config.modelId,LOCAL_AI_TIMEOUT_MS:'90000',AI_MAX_CONCURRENCY:'1'});
  web=createServer({env});web.listen(port,'127.0.0.1');await once(web,'listening');
  web.on('error',error=>{console.error(error.message);close().catch(()=>{});});
  await fs.writeFile(stateFile,JSON.stringify({launcherPid:process.pid,launcherStartedMs:Date.now()-process.uptime()*1000,enginePid:engine?.pid||null,launcherPath:path.join(root,'tools/run-local-ai.mjs'),enginePath,website:base,model:modelBase,startedAt:new Date().toISOString()},null,2));
  console.log('本地AI已就绪：'+config.name+'\n网站：'+base+'/ai.html\n推理只在本机进行，不需要API密钥。关闭本窗口或运行“3-停止本地AI.cmd”即可停止。');
  if(engine)engine.once('exit',()=>{if(!closing)console.error('本地模型已停止，问答将回退到本站资料检索。');});
  openBrowser();
}catch(error){console.error(error.message);await close();process.exitCode=1;}
