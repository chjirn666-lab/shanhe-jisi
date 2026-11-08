import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createServer} from '../server.mjs';

async function fixture(t,options={}){
  const server=createServer({env:{},logger:()=>{},...options});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  return {server,port:server.address().port,base:'http://127.0.0.1:'+server.address().port};
}
const body=JSON.stringify({question:'韶山'});
function raw(port,{data=body,headers={},split}={}){
  const buffer=Buffer.from(data);
  return new Promise((resolve,reject)=>{
    const request=http.request({host:'127.0.0.1',port,path:'/api/ask',method:'POST',headers:{'content-type':'application/json','content-length':buffer.length,...headers}},res=>{
      let text='';res.setEncoding('utf8');res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(text)}));
    });request.on('error',reject);
    if(split){request.write(buffer.subarray(0,split));setTimeout(()=>request.end(buffer.subarray(split)),10);}else request.end(buffer);
  });
}

test('UTF-8 在中文字符的每个内部字节边界分包仍能命中',async t=>{
  const {port}=await fixture(t);
  for(const split of [14,15,17,18]){const r=await raw(port,{split});assert.equal(r.status,200);assert.equal(r.data.matches[0],'1893');}
});
test('明确配置的 HTTPS 来源通过；任意Host及伪造转发来源拒绝',async t=>{
  const {port}=await fixture(t,{env:{APP_ORIGIN:'https://demo.example'}});
  assert.equal((await raw(port,{headers:{Host:'demo.example',Origin:'https://demo.example'}})).status,200);
  assert.equal((await raw(port,{headers:{Host:'evil.example',Origin:'http://evil.example'}})).status,403);
  assert.equal((await raw(port,{headers:{Origin:'https://evil.example','X-Forwarded-Proto':'https','X-Forwarded-Host':'evil.example'}})).status,403);
});
test('方法、媒体类型、JSON与长度边界',async t=>{
  const {port,base}=await fixture(t);
  const status=await fetch(base+'/api/status',{method:'POST'});assert.equal(status.status,405);assert.equal(status.headers.get('allow'),'GET');
  const method=await fetch(base+'/api/ask');assert.equal(method.status,405);assert.equal(method.headers.get('allow'),'POST');
  assert.equal((await raw(port,{headers:{'content-type':'Application/JSON; charset=utf-8'}})).status,200);
  assert.equal((await raw(port,{headers:{'content-type':'application/jsonp'}})).status,415);
  for(const data of ['{','null','[]','{}','{"question":1}','{"question":" "}',JSON.stringify({question:'中'.repeat(301)})])assert.equal((await raw(port,{data})).status,400);
  assert.equal((await raw(port,{data:JSON.stringify({question:'中'.repeat(300)})})).status,200);
  assert.equal((await raw(port,{data:JSON.stringify({question:'x'.repeat(5000)})})).status,413);
});
test('静态页面、无扩展名路由和根目录隔离',async t=>{
  const {base}=await fixture(t);
  assert.equal((await fetch(base+'/poetry')).status,200);
  const head=await fetch(base+'/quotes.html',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  for(const path of ['/.env','/package.json'])assert.equal((await fetch(base+path)).status,404);
  assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,403);
});
test('限流返回 Retry-After，并在窗口结束后恢复',async t=>{
  let time=100000;const {port}=await fixture(t,{env:{RATE_LIMIT_PER_MINUTE:'2'},now:()=>time});
  assert.equal((await raw(port)).status,200);assert.equal((await raw(port)).status,200);
  const limited=await raw(port);assert.equal(limited.status,429);assert.equal(limited.headers['retry-after'],'60');
  time+=60000;assert.equal((await raw(port)).status,200);
});
test('不信任客户端伪造的 X-Forwarded-For',async t=>{
  const {port}=await fixture(t,{env:{RATE_LIMIT_PER_MINUTE:'1'}});
  assert.equal((await raw(port,{headers:{'X-Forwarded-For':'192.0.2.1'}})).status,200);
  assert.equal((await raw(port,{headers:{'X-Forwarded-For':'192.0.2.2'}})).status,429);
});
test('仅在可信代理后按真实客户端分别限流',async t=>{
  const {port}=await fixture(t,{env:{RATE_LIMIT_PER_MINUTE:'1',TRUSTED_PROXY_IPS:'127.0.0.1'}});
  assert.equal((await raw(port,{headers:{'X-Forwarded-For':'192.0.2.1'}})).status,200);
  assert.equal((await raw(port,{headers:{'X-Forwarded-For':'192.0.2.2'}})).status,200);
  assert.equal((await raw(port,{headers:{'X-Forwarded-For':'192.0.2.1'}})).status,429);
});
test('并发上限及客户端断开后的取消',async t=>{
  let enter;const entered=new Promise(resolve=>enter=resolve);let release;
  const answer=(_q,_env,_fetch,{signal})=>new Promise(resolve=>{release=resolve;signal.addEventListener('abort',()=>resolve({mode:'retrieval',answer:'cancelled',sources:[],matches:[]}));enter(signal);});
  const {port,base}=await fixture(t,{env:{AI_MAX_CONCURRENCY:'1'},answer});
  const client=http.request(base+'/api/ask',{method:'POST',headers:{'content-type':'application/json'}},res=>res.resume());client.on('error',()=>{});client.end(body);
  const signal=await entered;assert.equal((await raw(port)).status,503);
  client.destroy();await new Promise(resolve=>signal.aborted?resolve():signal.addEventListener('abort',resolve,{once:true}));
  assert.equal(signal.aborted,true);release({answer:'done'});
});
