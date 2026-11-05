import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion,configured} from '../src/assistant.mjs';

test('出生地问题匹配有来源的历史节点',()=>{const r=globalThis.SHANHE_GUIDE.answer('毛泽东出生在哪里？');assert.equal(r.matches[0],'1893');assert.match(r.answer,/韶山/);assert.ok(r.sources.every(s=>s.url.startsWith('https://')));});
test('诗词问题不会因重名而丢失创作背景',()=>{const r=globalThis.SHANHE_GUIDE.answer('《沁园春·长沙》的创作背景是什么？');assert.equal(r.matches[0],'changsha');assert.match(r.answer,/1925/);});
test('资料库外问题明确说明不足',async()=>{let called=false;const r=await answerQuestion('今天的天气怎么样？',{AI_BASE_URL:'https://example.com/v1',AI_MODEL:'test',AI_API_KEY:'test'},()=>{called=true;});assert.equal(r.sources.length,0);assert.match(r.answer,/没有收录/);assert.equal(called,false);});
test('无模型配置时不冒充 AI',async()=>{assert.equal(configured({}),false);const r=await answerQuestion('遵义会议');assert.equal(r.mode,'retrieval');assert.ok(r.sources.length);});
test('模型成功返回时附上本地白名单来源',async()=>{let submitted;const r=await answerQuestion('遵义会议',{AI_BASE_URL:'https://example.com/v1',AI_MODEL:'test',AI_API_KEY:'test'},async(url,options)=>{submitted=JSON.parse(options.body);assert.equal(url,'https://example.com/v1/chat/completions');return new Response(JSON.stringify({choices:[{message:{content:'1935年1月的遵义会议是长征途中的重要节点。'}}]}));});assert.equal(r.mode,'ai');assert.ok(r.sources.some(s=>s.id==='bio'));assert.match(submitted.messages[1].content,/verifiedContext/);});
test('模型故障回退到可核对的资料摘要',async()=>{const r=await answerQuestion('七律长征',{AI_BASE_URL:'https://example.com/v1',AI_MODEL:'test',AI_API_KEY:'test'},async()=>new Response('error',{status:503}));assert.equal(r.mode,'retrieval');assert.equal(r.fallback,true);assert.ok(r.sources.length);});
test('资料引用无悬空项',()=>{const data=globalThis.SHANHE;for(const e of [...data.events,...data.poems])for(const id of e.sources)assert.ok(data.sources.some(s=>s.id===id),id);});
