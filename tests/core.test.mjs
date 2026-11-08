import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion,configured} from '../src/assistant.mjs';

test('出生地问题匹配有来源的历史节点',()=>{const r=globalThis.SHANHE_GUIDE.answer('毛泽东出生在哪里？');assert.equal(r.matches[0],'1893');assert.match(r.answer,/韶山/);assert.ok(r.sources.every(s=>/^https?:\/\//.test(s.url)));});
test('诗词问题不会因重名而丢失创作背景',()=>{const r=globalThis.SHANHE_GUIDE.answer('《沁园春·长沙》的创作背景是什么？');assert.equal(r.matches[0],'changsha');assert.match(r.answer,/1925/);});
test('资料库外问题明确说明不足',async()=>{let called=false;const r=await answerQuestion('今天的天气怎么样？',{AI_BASE_URL:'https://example.com/v1',AI_MODEL:'test',AI_API_KEY:'test'},()=>{called=true;});assert.equal(r.sources.length,0);assert.match(r.answer,/没有收录/);assert.equal(called,false);});
test('无模型配置时不冒充 AI',async()=>{assert.equal(configured({}),false);const r=await answerQuestion('遵义会议');assert.equal(r.mode,'retrieval');assert.ok(r.sources.length);});
test('模型成功返回时附上本地白名单来源',async()=>{let submitted;const r=await answerQuestion('遵义会议',{AI_BASE_URL:'https://example.com/v1',AI_MODEL:'test',AI_API_KEY:'test'},async(url,options)=>{submitted=JSON.parse(options.body);assert.equal(url,'https://example.com/v1/chat/completions');return new Response(JSON.stringify({choices:[{message:{content:'1935年1月的遵义会议是长征途中的重要节点。'}}]}));});assert.equal(r.mode,'ai');assert.ok(r.sources.some(s=>s.id==='bio'));assert.match(submitted.messages[1].content,/verifiedContext/);});
test('模型故障回退到可核对的资料摘要',async()=>{const r=await answerQuestion('七律长征',{AI_BASE_URL:'https://example.com/v1',AI_MODEL:'test',AI_API_KEY:'test'},async()=>new Response('error',{status:503}));assert.equal(r.mode,'retrieval');assert.equal(r.fallback,true);assert.ok(r.sources.length);});
test('资料引用无悬空项',()=>{const data=globalThis.SHANHE;for(const e of [...data.events,...data.poems,...data.quotes])for(const id of e.sources)assert.ok(data.sources.some(s=>s.id===id),id);});

test('语录问题返回原句、篇名与对应来源',()=>{const r=globalThis.SHANHE_GUIDE.answer('没有调查，没有发言权出自哪里？');assert.equal(r.matches[0],'investigate');assert.match(r.answer,/反对本本主义/);assert.ok(r.sources.some(s=>s.id==='investigation'));});

test('生平总览与两馆目录覆盖本站已有条目',()=>{
  const core=globalThis.SHANHE_GUIDE;
  assert.equal(core.answer('介绍一下毛泽东的一生').matches.length,6);
  assert.equal(core.answer('毛主席诗词有哪些').matches.length,30);
  assert.equal(core.answer('列出毛主席语录').matches.length,30);
  assert.deepEqual(core.answer('沁园春雪的创作背景').matches,['snow']);
});
const mockEnv={AI_BASE_URL:'https://example.com/v1',AI_MODEL:'test',AI_API_KEY:'never-log-this'};
test('模型收到节选、时间、解读及来源，目录问题无需调用模型',async()=>{
  let payload,called=0;
  const fetcher=async(_url,options)=>{called++;payload=JSON.parse(JSON.parse(options.body).messages[1].content);return new Response(JSON.stringify({choices:[{message:{content:'测试解读'}}]}));};
  await answerQuestion('菩萨蛮黄鹤楼的名句',mockEnv,fetcher);
  assert.equal(payload.verifiedContext[0].quote,'茫茫九派流中国');
  assert.ok(payload.verifiedContext[0].season);assert.ok(payload.verifiedContext[0].reading);assert.ok(payload.verifiedContext[0].sourceIds.length);
  await answerQuestion('毛主席诗词有哪些',mockEnv,fetcher);assert.equal(called,1);
});
test('上游错误分类与日志不泄露密钥',async()=>{
  for(const [status,code]of [[401,'UPSTREAM_AUTH'],[429,'UPSTREAM_RATE_LIMIT'],[503,'UPSTREAM_HTTP']]){
    const logs=[];const r=await answerQuestion('遵义会议',mockEnv,async()=>new Response('error',{status}),{logger:e=>logs.push(e)});
    assert.equal(r.fallback,true);assert.equal(logs[0].code,code);assert.ok(!JSON.stringify(logs).includes(mockEnv.AI_API_KEY));
  }
});
test('模型超时、异常JSON和超大响应安全回退',async()=>{
  const logs=[];
  const timed=await answerQuestion('遵义会议',mockEnv,(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true})),{timeoutMs:10,logger:e=>logs.push(e)});
  assert.equal(timed.fallback,true);assert.equal(logs[0].code,'TIMEOUT');
  for(const content of ['not JSON','x'.repeat(65537)]){
    const r=await answerQuestion('遵义会议',mockEnv,async()=>new Response(content));assert.equal(r.fallback,true);
  }
});
