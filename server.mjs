import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {answerQuestion,configured} from './src/assistant.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
// Small local .env loader; no secrets are printed or served.
try{const content=await fs.readFile(path.join(root,'.env'),'utf8');for(const line of content.split(/\r?\n/)){const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(match&&!Object.hasOwn(process.env,match[1]))process.env[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');}}catch(error){if(error.code!=='ENOENT')console.error('无法读取本地配置，使用环境变量。');}
const staticRoot=path.join(root,'dist');
const port=Number(process.env.PORT||8790),host=process.env.HOST||'127.0.0.1';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8'};
const limits=new Map();
function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/status'&&req.method==='GET'){json(res,200,{service:'shanhe-jisi',mode:configured(process.env)?'ai':'retrieval'});return;}
    if(url.pathname==='/api/ask'){
      if(req.method!=='POST'){json(res,405,{error:'请使用 POST 请求。'});return;}
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){json(res,403,{error:'不支持跨来源请求。'});return;}
      if(!String(req.headers['content-type']).startsWith('application/json')){json(res,415,{error:'请提交 JSON。'});return;}
      const key=req.socket.remoteAddress||'local',now=Date.now();
      for(const [k,v]of limits)if(now-v.start>60000)limits.delete(k);
      const rate=limits.get(key)||{start:now,count:0};rate.count++;limits.set(key,rate);
      if(rate.count>20){json(res,429,{error:'请求较多，请稍后再试。'});return;}
      let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>4096){json(res,413,{error:'请求过长。'});return;}body+=chunk;}
      let payload;try{payload=JSON.parse(body);}catch{json(res,400,{error:'JSON 格式不正确。'});return;}
      if(typeof payload?.question!=='string'||!payload.question.trim()||payload.question.length>300){json(res,400,{error:'问题须为 1 至 300 个字符。'});return;}
      json(res,200,await answerQuestion(payload.question.trim(),process.env));return;
    }
    if(url.pathname.startsWith('/api/')){json(res,404,{error:'接口不存在。'});return;}
    if(req.method!=='GET'&&req.method!=='HEAD'){json(res,405,{error:'不支持此方法。'});return;}
    let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{json(res,400,{error:'路径无效。'});return;}
    if(decoded.includes('\0')||decoded.includes('\\')){json(res,400,{error:'路径无效。'});return;}
    const file=path.resolve(staticRoot,'.'+(decoded==='/'?'/index.html':decoded));
    if(!file.startsWith(staticRoot+path.sep)){json(res,403,{error:'路径无效。'});return;}
    try{const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);}catch{json(res,404,{error:'页面不存在。'});}
  }catch{if(!res.headersSent)json(res,500,{error:'服务暂时不可用。'});else res.end();}
});
server.requestTimeout=30000;
server.listen(port,host,()=>console.log(`山河寄思: http://${host}:${port}\n史料助手: ${configured(process.env)?'AI 辅助解读':'资料检索模式（未配置模型）'}`));
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'端口已占用，请设置其他 PORT。':'服务启动失败。');process.exitCode=1;});
