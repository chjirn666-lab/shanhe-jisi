(function(){
  'use strict';
  const eventId=new URLSearchParams(location.search).get('event');
  const event=globalThis.SHANHE?.events.find(entry=>entry.id===eventId);
  if(!event)return;
  const context=document.getElementById('ai-reading-context'),assistant=document.querySelector('[data-assistant]');
  context.hidden=false;
  document.getElementById('ai-context-title').textContent=event.year+' · '+event.title;
  document.getElementById('ai-context-place').textContent=event.place;
  document.getElementById('ai-context-return').href=event.localUrl;
  assistant.dataset.topic=event.year+'年 · '+event.title;
  const suggestions=[['了解这一站','请介绍'+event.year+'年 · '+event.title],['梳理时间线','这段经历有哪些重要时间节点？'],['回看生平全貌','介绍一下毛泽东的一生']];
  assistant.querySelectorAll('[data-ai-question]').forEach((button,index)=>{button.textContent=suggestions[index][0]+' ↗';button.dataset.aiQuestion=suggestions[index][1];});
  document.getElementById('ai-chat-question').placeholder='围绕这一站提问，或输入其他史料问题…';
})();
