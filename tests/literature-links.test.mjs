import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../dist/js/knowledge.js';
import '../dist/js/literature-links.js';
const refs=globalThis.SHANHE_REFERENCES;
test('完整诗名跳转到对应作品，不把地点名称误认为诗词',()=>{
  assert.match(refs.html('1945年传播《沁园春·雪》。'),/href="poetry.html\?entry=snow"/);
  assert.equal(refs.html('从长沙到韶山。'),'从长沙到韶山。');
});
test('准确的语录和诗句直接对应到收录条目',()=>{
  assert.match(refs.html('没有调查，没有发言权。'),/quotes.html\?entry=investigate/);
  assert.match(refs.html('独立寒秋，湘江北去，橘子洲头。'),/poetry.html\?entry=changsha/);
});
test('同一著作的多则语录一起定位，单则著作直接阅读',()=>{
  const matches=refs.segments('《实践论》《矛盾论》《为人民服务》').filter(p=>p.url);
  assert.equal(matches.length,3);
  const work=new URL(matches[0].url,'https://local.invalid');
  assert.equal(work.pathname,'/quotes.html');assert.equal(work.searchParams.get('work'),'《实践论》');
  assert.equal(matches[2].url,'quotes.html?entry=serve-people');
});
test('插入链接保留原文且不会把输入作为HTML执行',()=>{
  const text='<img src=x onerror=alert(1)>《七律·长征》与《七律·到韶山》';
  assert.equal(refs.segments(text).map(p=>p.text).join(''),text);
  const html=refs.html(text);assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
  assert.equal((html.match(/class="literature-reference"/g)||[]).length,2);
});
test('足迹中出现的已收录诗名与著作都能正确定位',()=>{
  const text=SHANHE.events.flatMap(e=>[e.lead,...e.sections.flatMap(s=>[s.heading,s.text]),...e.timeline.map(t=>t.text)]).join('\n');
  for(const poem of SHANHE.poems){const name='《'+poem.title+'》';if(text.includes(name))assert.ok(refs.segments(text).some(p=>p.text===name&&p.url==='poetry.html?entry='+poem.id),name);}
  for(const work of new Set(SHANHE.quotes.map(q=>q.work)))if(text.includes(work))assert.ok(refs.segments(text).some(p=>p.text===work&&p.kind==='quotes'),work);
});
