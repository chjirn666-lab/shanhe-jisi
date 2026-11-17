const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function assistantEntry({id='home-ai',href='ai.html',heading='山河AI · 带着问题读历史',text='围绕足迹、诗词和语录提问，依据本站资料继续阅读。',label='进入AI问答 →'}={}){
  return '<section class="ai-entry-card" id="'+esc(id)+'"><div><span>LOCAL AI · 山河史料助手</span><h2>'+esc(heading)+'</h2><p>'+esc(text)+'</p></div><a href="'+esc(href)+'">'+esc(label)+'</a></section>';
}
export function assistantMarkup({id='home-ai',topic='',studies=[]}={}){
  const questions=topic?['请介绍'+topic,'这段经历有哪些重要时间节点？']:['毛泽东1954年在哪个城市主持起草宪法？','1945年重庆谈判有哪些重要经过？','《沁园春·长沙》的创作背景是什么？'];
  const labels=topic?['了解这一站','梳理时间线']:['杭州与宪法起草','重庆谈判的经过','读懂《沁园春·长沙》'];
  const studySection=studies.length?`<section class="ai-study" aria-labelledby="${esc(id)}-study"><h3 id="${esc(id)}-study">选题研读</h3><div class="ai-study-topics">${studies.map(study=>`<button type="button" data-study-topic="${esc(study.id)}"><strong>${esc(study.title)}</strong><span>${esc(study.question)}</span></button>`).join('')}</div></section>`:'';
  return `<section class="site-assistant" id="${esc(id)}" data-assistant data-topic="${esc(topic)}" aria-labelledby="${esc(id)}-title">
  <div class="ai-heading"><div><h2 id="${esc(id)}-title">山河AI · 带着问题读历史</h2><p>从一段经历、一首诗开始。依据本站资料回答，相关图文可直接在本地阅读。</p></div><div class="ai-connection"><span class="ai-badge" data-role="mode" role="status">正在检查AI状态…</span><button type="button" data-role="reconnect">重新连接</button></div></div>
  ${studySection}
  <div class="ai-suggestions" aria-label="试着提问">${questions.map((q,i)=>'<button type="button" data-ai-question="'+esc(q)+'">'+esc(labels[i])+' ↗</button>').join('')}</div>
  <div class="ai-conversation" data-role="conversation" role="log" aria-live="polite" aria-relevant="additions"></div>
  <form data-role="form"><label class="ai-question-label" for="${esc(id)}-question">想了解什么？</label><div class="ai-input-row"><textarea id="${esc(id)}-question" data-role="question" rows="2" maxlength="300" required placeholder="例如：毛泽东为什么到重庆谈判？"></textarea><button class="ai-send" data-role="send" type="submit">发送提问 →</button></div><div class="ai-options"><label for="${esc(id)}-answer-mode">回答方式 <select id="${esc(id)}-answer-mode" data-role="answer-mode"><option value="auto">AI辅助</option><option value="retrieval">只查本站资料</option></select></label><button class="ai-stop" data-role="stop" type="button" hidden>停止回答</button><p data-role="status" role="status">本地资料可用 · 无需登录</p></div></form>
  <noscript><p>启用 JavaScript 可使用问答；也可直接<a href="footprints.html">阅读本地足迹图文</a>。</p></noscript></section>`;
}
