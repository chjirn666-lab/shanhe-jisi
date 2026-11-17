import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion,configured,modelStatus} from '../src/assistant.mjs';

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
  assert.deepEqual(core.answer('介绍一下毛泽东的一生').matches,globalThis.SHANHE.events.map(e=>e.id));
  assert.equal(core.answer('毛主席诗词有哪些').matches.length,29);
  assert.equal(core.answer('列出毛主席语录').matches.length,30);
  assert.deepEqual(core.answer('沁园春雪的创作背景').matches,['snow']);
});
test('新增足迹可按经历检索，不把诗词条目当作事件正文',()=>{
  const core=globalThis.SHANHE_GUIDE;
  assert.deepEqual(core.answer('毛泽东1954年在哪个城市主持起草宪法？').matches,['1954']);
  for(const [question,id,word]of [['1918年新民学会','1918','长沙'],['1945年重庆谈判','1945','双十协定'],['1954年在杭州起草宪法','1954','宪法'],['1959年重返韶山','1959','韶山'],['1972年会见尼克松','1972','尼克松']]){
    const result=core.answer(question);assert.ok(result.matches.includes(id),question);assert.match(result.answer,new RegExp(word));assert.ok(result.sources.length);
  }
});
test('足迹的时间线问题直接展示已收录日期和事件', async () => {
  const question = '1921年中共一大：这段经历有哪些重要时间节点？';
  let modelCalled = false;
  const result = await answerQuestion(question, {AI_PROVIDER: 'local'}, () => {
    modelCalled = true;
    throw new Error('unexpected model call');
  });
  assert.equal(modelCalled, false);
  assert.equal(result.intent, 'timeline');
  assert.deepEqual(result.matches, ['1921']);
  assert.match(result.answer, /1919年7月 · 主编《湘江评论》。/);
  assert.match(result.answer, /1921年7月 · 与何叔衡作为长沙代表参加中共一大。/);
  assert.ok(result.sources.length);
});
const mockEnv={AI_BASE_URL:'https://example.com/v1',AI_MODEL:'test',AI_API_KEY:'never-log-this'};
test('研读题为原有资料建立可回看的跨类型证据',()=>{
  const {topics}=globalThis.SHANHE_STUDY;
  assert.equal(topics.length,2);
  for(const topic of topics){
    assert.deepEqual(topic.evidence.map(entry=>entry.id),['E1','E2','E3']);
    assert.ok(topic.evidence.every(entry=>entry.excerpt&&/^(footprint-|photo-archive|poetry\.html)/.test(entry.url)));
    assert.ok(topic.evidence.some(entry=>entry.kind==='档案照片'&&entry.image));
  }
  assert.match(topics[0].evidence[2].excerpt,/1919年11月16日.*并非1918年/);
  assert.match(topics[1].evidence[0].excerpt,/1936年2月/);
  assert.match(topics[1].evidence[1].excerpt,/1945年11月14日/);
});
test('研读生成与同题对照使用同一组本站证据',async()=>{
  const topic=globalThis.SHANHE_STUDY.findTopic('chongqing');
  const summary='《沁园春·雪》1936年写成，1945年首次公开发表。';
  const result=await answerQuestion(topic.question,mockEnv,async(_url,options)=>{
    const request=JSON.parse(JSON.parse(options.body).messages[1].content);
    assert.deepEqual(request.evidence.map(entry=>entry.id),['E1','E2']);
    assert.ok(request.evidence.every(entry=>!entry.url&&!entry.image));
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({summary,refs:['E9']})}}]}));
  },{studyTopic:topic.id});
  assert.equal(result.mode,'ai');
  assert.equal(result.study.points[0].text,summary);
  assert.deepEqual(result.study.points.map(point=>point.refs),[['E1','E2'],['E3']]);
  assert.equal(result.study.points[1].text,topic.evidence[2].excerpt);
  const baseline=await answerQuestion(topic.question,mockEnv,()=>assert.fail('纯资料模式不应调用模型'),{studyTopic:topic.id,retrievalOnly:true});
  assert.equal(baseline.mode,'retrieval');
  assert.deepEqual(baseline.study.evidence,result.study.evidence);
  assert.equal(baseline.study.points,undefined);
});
test('研读归纳缺少年份、添加未收录年份或格式无效时回退到本站资料',async()=>{
  for(const content of ['无效格式',JSON.stringify({summary:'只有1918年的事件。'}),JSON.stringify({summary:'1918年、1921年和1930年的事件。'})]){
    const result=await answerQuestion('研读题',mockEnv,async()=>new Response(JSON.stringify({choices:[{message:{content}}]})),{studyTopic:'youth'});
    assert.equal(result.mode,'retrieval');
    assert.equal(result.fallback,true);
    assert.equal(result.study.points,undefined);
  }
});
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

test('本地模式只允许回环地址，不要求密钥且不发送云端密钥',async()=>{
  assert.equal(configured({AI_PROVIDER:'local'}),true);
  for(const base of ['http://192.168.1.2:8080/v1','https://example.com/v1','http://127.0.0.1.evil.example/v1'])assert.equal(configured({AI_PROVIDER:'local',LOCAL_AI_BASE_URL:base}),false);
  const r=await answerQuestion('遵义会议',{AI_PROVIDER:'local',AI_API_KEY:'cloud-secret'},async(url,options)=>{
    assert.equal(url,'http://127.0.0.1:18081/v1/chat/completions');
    assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
    assert.equal(JSON.parse(options.body).max_tokens,384);
    return new Response(JSON.stringify({choices:[{message:{content:'1935年1月在遵义召开。'}}]}));
  });
  assert.equal(r.mode,'ai');assert.equal(r.provider,'local');
});
test('本地状态核对真实模型ID，离线或错误模型不会标为就绪',async()=>{
  const env={AI_PROVIDER:'local'};
  const ready=await modelStatus(env,async url=>{assert.match(url,/\/v1\/models$/);return new Response(JSON.stringify({data:[{id:'shanhe-qwen-1.5b'}]}));});
  assert.equal(ready.ready,true);assert.equal(ready.provider,'local');
  const wrong=await modelStatus(env,async()=>new Response(JSON.stringify({data:[{id:'another-model'}]})));assert.equal(wrong.ready,false);assert.equal(wrong.mode,'retrieval');
  const offline=await modelStatus(env,async()=>{throw new Error('offline');});assert.equal(offline.ready,false);
});
test('只查资料选项和未收录问题不调用本地模型',async()=>{
  let called=0;const fetcher=async()=>{called++;throw new Error('must not call');};
  const result=await answerQuestion('遵义会议',{AI_PROVIDER:'local'},fetcher,{retrievalOnly:true});
  assert.equal(result.mode,'retrieval');
  await answerQuestion('今天的天气怎么样',{AI_PROVIDER:'local'},fetcher);assert.equal(called,0);
});
test('本地生平总览按完整时间线展示，避免小模型遗漏后期经历',async()=>{
  let called=false;
  const r=await answerQuestion('介绍一下毛泽东的一生',{AI_PROVIDER:'local'},async()=>{called=true;throw new Error('Overview must use local entries');});
  assert.equal(called,false);assert.equal(r.mode,'retrieval');assert.deepEqual(r.matches,globalThis.SHANHE.events.map(e=>e.id));assert.match(r.answer,/1893/);assert.match(r.answer,/1976/);assert.equal(r.provider,'local');
});
test('模型达到输出上限时回退正文，不展示未完成的回答',async()=>{
  const logs=[];
  const r=await answerQuestion('1954年起草宪法',{AI_PROVIDER:'local'},async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'未完成的反复生成'}}]})),{logger:e=>logs.push(e)});
  assert.equal(r.mode,'retrieval');assert.equal(r.fallback,true);assert.match(r.answer,/杭州/);assert.equal(logs[0].code,'INCOMPLETE_ANSWER');
});
