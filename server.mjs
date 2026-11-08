import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {isIP} from 'node:net';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {answerQuestion,configured} from './src/assistant.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.json':'application/json; charset=utf-8'};
const normalizeIP=value=>String(value||'').replace(/^::ffff:/,'');
const positiveInt=(value,fallback)=>/^\d+$/.test(String(value))&&Number(value)>0?Number(value):fallback;

export async function loadEnvironment(env=process.env){
  try{
    const content=await fs.readFile(path.join(root,'.env'),'utf8');
    for(const line of content.split(/\r?\n/)){
      const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if(match&&!Object.hasOwn(env,match[1]))env[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');
    }
  }catch(error){if(error.code!=='ENOENT')throw new Error('无法读取本地配置。');}
  return env;
}
function appOrigin(value){
  if(!value?.trim())return null;
  const url=new URL(value.trim());
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('APP_ORIGIN 必须是完整的网站来源，例如 https://example.cn。');
  return url;
}
function clientIP(req,trusted){
  const remote=normalizeIP(req.socket.remoteAddress);
  if(!trusted.has(remote))return remote;
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',').map(v=>normalizeIP(v.trim()));
  if(forwarded.length>20||forwarded.some(ip=>!isIP(ip)))return remote;
  const chain=[...forwarded,remote];let i=chain.length-1;
  while(i>0&&trusted.has(chain[i]))i--;
  return chain[i];
}

// Importing this module never binds a port or loads .env.
export function createServer({env=process.env,answer=answerQuestion,logger=event=>console.error(JSON.stringify(event)),now=Date.now}={}){
  const origin=appOrigin(env.APP_ORIGIN);
  const trusted=new Set(String(env.TRUSTED_PROXY_IPS||'').split(',').map(v=>normalizeIP(v.trim())).filter(Boolean));
  if([...trusted].some(ip=>!isIP(ip)))throw new Error('TRUSTED_PROXY_IPS 只能包含可信代理的 IP 地址。');
  const staticRoot=path.join(root,'dist'),limits=new Map();
  const maxRequests=positiveInt(env.RATE_LIMIT_PER_MINUTE,20),maxConcurrent=positiveInt(env.AI_MAX_CONCURRENCY,4);
  let active=0,lastSweep=0;
  const log=event=>{try{logger(event);}catch{}};
  const server=http.createServer(async(req,res)=>{
    const requestId=randomUUID(),started=now();
    res.setHeader('X-Request-Id',requestId);
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    const json=(status,payload,headers={})=>{
      if(res.destroyed||res.writableEnded)return;
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(payload));
    };
    try{
      const url=new URL(req.url,'http://localhost'),port=req.socket.localPort;
      // Never derive allowed origins from untrusted Host or forwarded headers.
      const localHosts=['localhost:'+port,'127.0.0.1:'+port,'[::1]:'+port];
      const allowedHosts=new Set([...localHosts,...(origin?[origin.host]:[])]);
      if(!allowedHosts.has(String(req.headers.host||'').toLowerCase())){json(403,{error:'访问域名未配置，请设置 APP_ORIGIN。'});return;}
      if(url.pathname==='/api/status'){
        if(req.method!=='GET'){json(405,{error:'请使用 GET 请求。'},{Allow:'GET'});return;}
        json(200,{service:'shanhe-jisi',mode:configured(env)?'ai':'retrieval'});return;
      }
      if(url.pathname==='/api/ask'){
        if(req.method!=='POST'){json(405,{error:'请使用 POST 请求。'},{Allow:'POST'});return;}
        const allowedOrigins=new Set(localHosts.map(h=>'http://'+h));if(origin)allowedOrigins.add(origin.origin);
        if(req.headers.origin&&!allowedOrigins.has(req.headers.origin)){json(403,{error:'不支持跨来源请求。'});return;}
        const mediaType=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
        if(mediaType!=='application/json'){json(415,{error:'请提交 JSON。'});return;}
        const key=clientIP(req,trusted),time=now();
        if(time-lastSweep>60000){for(const [k,v]of limits)if(time-v.start>=60000)limits.delete(k);lastSweep=time;}
        const previous=limits.get(key),rate=previous&&time-previous.start<60000?previous:{start:time,count:0};
        if(!limits.has(key)&&limits.size>=10000){json(503,{error:'服务繁忙，请稍后再试。'},{'Retry-After':'60'});return;}
        rate.count++;limits.set(key,rate);
        if(rate.count>maxRequests){json(429,{error:'请求较多，请稍后再试。'},{'Retry-After':String(Math.max(1,Math.ceil((60000-(time-rate.start))/1000)))});return;}
        if(Number(req.headers['content-length'])>4096){req.resume();json(413,{error:'请求过长。'});return;}
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>4096){json(413,{error:'请求过长。'});return;}chunks.push(chunk);}
        let payload;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{json(400,{error:'JSON 格式不正确。'});return;}
        if(typeof payload?.question!=='string'||!payload.question.trim()||payload.question.length>300){json(400,{error:'问题须为 1 至 300 个字符。'});return;}
        if(active>=maxConcurrent){json(503,{error:'正在处理其他问题，请稍后重试。'},{'Retry-After':'3'});return;}
        const controller=new AbortController();
        const disconnected=()=>{if(!res.writableFinished)controller.abort();};
        res.on('close',disconnected);active++;
        try{json(200,await answer(payload.question.trim(),env,fetch,{signal:controller.signal,logger:log,requestId}));}
        finally{active--;res.off('close',disconnected);log({event:'ask_complete',requestId,status:res.statusCode,durationMs:now()-started});}
        return;
      }
      if(url.pathname.startsWith('/api/')){json(404,{error:'接口不存在。'});return;}
      if(req.method!=='GET'&&req.method!=='HEAD'){json(405,{error:'不支持此方法。'},{Allow:'GET, HEAD'});return;}
      let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{json(400,{error:'路径无效。'});return;}
      if(decoded.includes('\0')||decoded.includes('\\')){json(400,{error:'路径无效。'});return;}
      if(decoded!=='/'&&!path.extname(decoded))decoded+='.html';
      const file=path.resolve(staticRoot,'.'+(decoded==='/'?'/index.html':decoded));
      if(!file.startsWith(staticRoot+path.sep)){json(403,{error:'路径无效。'});return;}
      try{const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);}
      catch(error){if(['ENOENT','EISDIR','ENOTDIR'].includes(error.code))json(404,{error:'页面不存在。'});else throw error;}
    }catch{
      if(req.aborted||res.destroyed)return;
      log({event:'request_failed',requestId,code:'INTERNAL_ERROR',durationMs:now()-started});
      if(!res.headersSent)json(500,{error:'服务暂时不可用。',requestId});else res.end();
    }
  });
  server.requestTimeout=30000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
  return server;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    await loadEnvironment();
    const port=Number(process.env.PORT||8790),host=process.env.HOST||'127.0.0.1';
    if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT 必须是 0 至 65535 的整数。');
    const server=createServer();
    server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'端口已占用，请设置其他 PORT。':'服务启动失败。');process.exitCode=1;});
    server.listen(port,host,()=>console.log('山河寄思: http://'+host+':'+server.address().port+'\n史料助手: '+(configured(process.env)?'AI 辅助解读':'资料检索模式（未配置模型）')));
    for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.close();server.closeIdleConnections();const timer=setTimeout(()=>server.closeAllConnections(),20000);timer.unref();});
  }catch(error){console.error(error.message);process.exitCode=1;}
}
