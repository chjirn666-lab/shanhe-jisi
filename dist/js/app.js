/* 山河寄思：零依赖交互。动态内容只以 textContent 写入。 */
(function () {
  'use strict';
  const data=globalThis.SHANHE, core=globalThis.SHANHE_GUIDE;
  const $=id=>document.getElementById(id);
  const storeKey='shanhe-jisi-v1';
  let state={bookmarks:[],message:'',name:'',created:''},storageAvailable=true;
  function sanitize(saved){
    if(!saved||typeof saved!=='object'||Array.isArray(saved))return null;
    return {
      bookmarks:Array.isArray(saved.bookmarks)?[...new Set(saved.bookmarks.filter(id=>data.events.some(e=>e.id===id)))]:[],
      message:typeof saved.message==='string'?saved.message.slice(0,100):'',
      name:typeof saved.name==='string'?saved.name.slice(0,12):'',
      created:typeof saved.created==='string'?saved.created.slice(0,30):''
    };
  }
  try{const parsed=sanitize(JSON.parse(localStorage.getItem(storeKey)||'null'));if(parsed)state=parsed;}catch{storageAvailable=false;}
  function persist(){
    try{
      // 首页与长卷共用同一个存储键，写入前保留其它页面新增的字段，避免覆盖寄语或收藏。
      const latest=sanitize(JSON.parse(localStorage.getItem(storeKey)||'null'));
      if(latest)for(const key of Object.keys(latest))if(!Object.hasOwn(state,key))state[key]=latest[key];
      localStorage.setItem(storeKey,JSON.stringify(state));return true;
    }catch{storageAvailable=false;return false;}
  }
  window.addEventListener('storage',event=>{
    if(event.key!==storeKey)return;
    try{const latest=sanitize(JSON.parse(localStorage.getItem(storeKey)||'null'));if(latest)state.bookmarks=latest.bookmarks;}catch{}
    renderBookmarkButton();renderNotebook();
  });
  let toastTimer;
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
  function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
  function sourceById(id){return data.sources.find(s=>s.id===id);}
  function animate(el){el.classList.remove('reveal');void el.offsetWidth;el.classList.add('reveal');}
  $('menu-toggle').addEventListener('click',()=>{const open=$('menu-toggle').getAttribute('aria-expanded')!=='true';$('menu-toggle').setAttribute('aria-expanded',String(open));$('main-nav').classList.toggle('open',open);});
  $('main-nav').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{$('menu-toggle').setAttribute('aria-expanded','false');$('main-nav').classList.remove('open');}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('menu-toggle').setAttribute('aria-expanded','false');$('main-nav').classList.remove('open');}});
  const dialog=$('sources-dialog');
  document.querySelectorAll('[data-open-sources]').forEach(button=>button.addEventListener('click',()=>dialog.showModal()));
  $('close-sources').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  data.sources.forEach(source=>{const li=node('li');const a=node('a',source.title+' ↗');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';li.append(a,node('small',source.publisher));$('source-list').append(li);});
  let activeEvent=0,activePoem=0;
  data.events.forEach((event,index)=>{const button=node('button');button.type='button';button.id='year-'+event.id;button.setAttribute('role','tab');button.setAttribute('aria-controls','journey-panel');button.append(node('strong',event.year),node('span',event.label));button.addEventListener('click',()=>renderEvent(index));$('timeline-tabs').append(button);});
  function renderEvent(index){
    activeEvent=(index+data.events.length)%data.events.length;
    const event=data.events[activeEvent];
    Array.from($('timeline-tabs').children).forEach((b,i)=>{b.setAttribute('aria-selected',String(i===activeEvent));b.tabIndex=i===activeEvent?0:-1;});
    $('journey-panel').setAttribute('aria-labelledby','year-'+event.id);
    ['year','place','kicker','title','text','note'].forEach(key=>$('journey-'+key).textContent=event[key]);
    $('journey-source').href=sourceById(event.sources[0]).url;
    $('journey-position').textContent=String(activeEvent+1).padStart(2,'0')+' / '+String(data.events.length).padStart(2,'0');
    renderBookmarkButton();animate($('journey-panel'));
  }
  function renderBookmarkButton(){const saved=state.bookmarks.includes(data.events[activeEvent].id);$('bookmark').setAttribute('aria-pressed',String(saved));$('bookmark').textContent=saved?'✓ 已加入手记':'＋ 加入阅读手记';}
  $('previous-year').addEventListener('click',()=>renderEvent(activeEvent-1));
  $('next-year').addEventListener('click',()=>renderEvent(activeEvent+1));
  function keyboardTabs(container,getIndex,select,length,vertical=false){container.addEventListener('keydown',e=>{let index=getIndex();if(e.key===(vertical?'ArrowDown':'ArrowRight'))index++;else if(e.key===(vertical?'ArrowUp':'ArrowLeft'))index--;else if(e.key==='Home')index=0;else if(e.key==='End')index=length-1;else return;e.preventDefault();index=(index+length)%length;select(index);container.children[index].focus();});}
  keyboardTabs($('timeline-tabs'),()=>activeEvent,renderEvent,data.events.length);
  $('bookmark').addEventListener('click',()=>{const id=data.events[activeEvent].id;const has=state.bookmarks.includes(id);state.bookmarks=has?state.bookmarks.filter(x=>x!==id):[...state.bookmarks,id];const saved=persist();renderBookmarkButton();renderNotebook();toast(saved?(has?'已从阅读手记移除':'已加入你的阅读手记'):'浏览器存储不可用，手记仅保留在本次页面中');});
  function renderNotebook(){const list=$('bookmark-list');list.replaceChildren();$('bookmark-count').textContent=String(state.bookmarks.length).padStart(2,'0');if(!state.bookmarks.length){list.append(node('p','在足迹长卷中收藏一个节点，让阅读留下足迹。'));return;}data.events.filter(e=>state.bookmarks.includes(e.id)).forEach(e=>{const b=node('button',e.year+' · '+e.label);b.addEventListener('click',()=>{renderEvent(data.events.indexOf(e));$('journey').scrollIntoView({behavior:'smooth'});$('year-'+e.id).focus({preventScroll:true});});list.append(b);});}
  data.poems.forEach((poem,index)=>{const button=node('button');button.type='button';button.id='poem-tab-'+poem.id;button.setAttribute('role','tab');button.setAttribute('aria-controls','poem-panel');button.append(node('span',String(index+1).padStart(2,'0')));const label=node('div');label.append(node('strong',poem.title),node('small',poem.label));button.append(label);button.addEventListener('click',()=>renderPoem(index));$('poem-tabs').append(button);});
  let speaking=false;
  function stopSpeech(){if('speechSynthesis'in window)window.speechSynthesis.cancel();speaking=false;$('read-poem').textContent='▷ 设备朗读';$('read-poem').setAttribute('aria-pressed','false');}
  function renderPoem(index){stopSpeech();activePoem=index;const p=data.poems[index];Array.from($('poem-tabs').children).forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});$('poem-panel').setAttribute('aria-labelledby','poem-tab-'+p.id);$('poem-panel').dataset.poem=p.id;$('poem-year').textContent=p.season;$('poem-quote').replaceChildren();p.quote.split('\n').forEach((line,i)=>{if(i)$('poem-quote').append(document.createElement('br'));$('poem-quote').append(document.createTextNode(line));});$('poem-credit').textContent='毛泽东《'+p.title+'》节选';$('poem-context-title').textContent=p.heading;$('poem-context-text').textContent=p.text;$('poem-source').href=sourceById(p.sources[0]).url;animate($('poem-panel'));}
  keyboardTabs($('poem-tabs'),()=>activePoem,renderPoem,data.poems.length,true);
  $('read-poem').addEventListener('click',()=>{if(!('speechSynthesis'in window)){toast('当前浏览器不支持设备朗读，请阅读文字。');return;}if(speaking){stopSpeech();return;}const p=data.poems[activePoem];const utterance=new SpeechSynthesisUtterance(p.title+'。'+p.quote);utterance.lang='zh-CN';utterance.rate=.8;utterance.onend=stopSpeech;utterance.onerror=e=>{stopSpeech();if(e.error!=='canceled'&&e.error!=='interrupted')toast('朗读不可用，请检查设备中文语音支持。');};speaking=true;$('read-poem').textContent='□ 停止朗读';$('read-poem').setAttribute('aria-pressed','true');window.speechSynthesis.speak(utterance);});
  window.addEventListener('pagehide',stopSpeech);
  let apiReady=false,apiMode='retrieval',busy=false;
  async function checkApi(){if(location.protocol==='file:')return;try{const response=await fetch('api/status',{signal:AbortSignal.timeout(2500)});if(!response.ok)return;const result=await response.json();if(result.service!=='shanhe-jisi')return;apiReady=true;apiMode=result.mode==='ai'?'ai':'retrieval';$('guide-mode').textContent=apiMode==='ai'?'AI 辅助解读':'资料检索模式';if(apiMode==='ai')$('guide-status').textContent='AI 根据已收录资料解读 · 可能有误，请结合原文核对';}catch{/* Static hosting keeps local retrieval available. */}}
  function appendMessage(role,text,label){const div=node('div',undefined,'message '+role);div.append(node('span',label,'message-label'),node('p',text));$('conversation').append(div);while($('conversation').children.length>21)$('conversation').firstElementChild.remove();$('conversation').scrollTop=$('conversation').scrollHeight;return div;}
  function renderAnswer(result){const msg=appendMessage('assistant',result.answer,result.mode==='ai'?'山河 · AI 辅助解读':'山河 · 资料检索');const approved=new Map(data.sources.map(s=>[s.id,s]));const sources=(result.sources||[]).map(s=>approved.get(s.id)).filter(Boolean);if(sources.length){const list=node('div',undefined,'answer-sources');sources.forEach((s,i)=>{const a=node('a',(i+1)+'. '+s.title+' ↗');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';list.append(a);});msg.append(list);}$('conversation').scrollTop=$('conversation').scrollHeight;}
  async function ask(question){if(busy)return;question=question.trim().slice(0,300);if(!question)return;busy=true;$('send-question').disabled=true;$('question').disabled=true;document.querySelectorAll('[data-question]').forEach(b=>b.disabled=true);$('question').value='';appendMessage('user',question,'你的问题');$('guide-status').textContent='正在查找相关资料……';$('conversation').setAttribute('aria-busy','true');let result,fallback=false;try{if(apiReady){const response=await fetch('api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error('Service unavailable');result=await response.json();if(typeof result.answer!=='string')throw new Error('Invalid answer');fallback=Boolean(result.fallback);}else result=core.answer(question);}catch{result=core.answer(question);fallback=true;}finally{$('conversation').removeAttribute('aria-busy');}renderAnswer(result);$('guide-status').textContent=fallback?'AI 服务暂不可用，已展示本站资料检索结果。':result.mode==='ai'?'AI 辅助解读 · 请结合所附原文核对':'资料检索完成 · 展示本站摘要，不是模型生成回答';busy=false;$('send-question').disabled=false;$('question').disabled=false;document.querySelectorAll('[data-question]').forEach(b=>b.disabled=false);$('question').focus({preventScroll:true});}
  $('question-form').addEventListener('submit',e=>{e.preventDefault();ask($('question').value);});
  document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.question)));
  const canvas=$('memory-canvas'),ctx=canvas.getContext('2d');let renderedCard=null;
  function wrapText(text,maxWidth,font){ctx.font=font;const lines=[];let line='';for(const char of Array.from(text)){if(char==='\n'){lines.push(line);line='';continue;}if(ctx.measureText(line+char).width>maxWidth&&line){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);return lines;}
  function paintCard(message,name,date){
    if(!ctx)return;
    ctx.clearRect(0,0,900,1200);ctx.fillStyle='#f7f3e8';ctx.fillRect(0,0,900,1200);ctx.strokeStyle='#c7c9b8';ctx.lineWidth=2;ctx.strokeRect(38,38,824,1124);ctx.strokeRect(47,47,806,1106);
    ctx.fillStyle='#b7513e';ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(680,815,66,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    const mountain=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,1200);points.forEach(([x,y])=>ctx.lineTo(x,y));ctx.lineTo(900,1200);ctx.closePath();ctx.fill();};
    mountain([[0,986],[110,893],[185,928],[300,804],[360,857],[435,785],[500,865],[580,821],[645,913],[748,848],[825,911],[900,882]],'#d0d6c7');
    mountain([[0,1070],[115,1006],[200,1040],[310,958],[400,998],[518,917],[590,953],[680,905],[790,1002],[900,942]],'#a9b7a3');
    mountain([[0,1145],[100,1096],[230,1130],[340,1052],[445,1106],[560,1020],[671,1064],[770,1014],[900,1090]],'#6e866f');
    ctx.textAlign='center';ctx.fillStyle='#7b826f';ctx.font='19px "Microsoft YaHei",sans-serif';ctx.fillText('一 卷 山 河  ·  一 份 怀 念',450,135);
    ctx.fillStyle='#2b4032';ctx.font='86px "KaiTi","STKaiti",serif';ctx.fillText('山河寄思',450,270);ctx.font='25px "SimSun",serif';ctx.fillText('纪念毛泽东同志',450,332);ctx.strokeStyle='#b8beaa';ctx.beginPath();ctx.moveTo(350,380);ctx.lineTo(550,380);ctx.stroke();
    const cleanMessage=message?message.replace(/\s+/g,' '):'循着足迹，读一段历史。\n留一份怀念，给今天的山河。';
    const lines=wrapText(cleanMessage,650,'29px "SimSun",serif');ctx.fillStyle='#475541';ctx.font='29px "SimSun",serif';let lineHeight=lines.length>7?36:43;let startY=442;lines.forEach((line,i)=>ctx.fillText(line,450,startY+i*lineHeight));
    ctx.fillStyle='#6c7761';ctx.font='22px "SimSun",serif';ctx.fillText('—— '+(name||'一位读者'),450,Math.max(760,startY+lines.length*lineHeight+40));ctx.font='18px Georgia,serif';ctx.fillText(date||'写 下 属 于 你 的 回 响',450,Math.max(805,startY+lines.length*lineHeight+80));
    ctx.fillStyle='#a1382c';ctx.fillRect(702,1055,62,62);ctx.strokeStyle='#eee8d8';ctx.lineWidth=1;ctx.strokeRect(708,1061,50,50);ctx.fillStyle='#fff7e9';ctx.font='24px "KaiTi",serif';ctx.fillText('寄思',733,1094);ctx.textAlign='left';ctx.fillStyle='#f7f3e8';ctx.font='17px "SimSun",serif';ctx.fillText('山 河 有 忆 · 来 路 有 光',97,1102);
    canvas.setAttribute('aria-label','纪念卡：'+cleanMessage+'。落款：'+(name||'一位读者'));
  }
  function localDate(){const d=new Date();return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');}
  function memoryChanged(){const len=$('memory-message').value.length;$('message-count').textContent=len+' / 100';$('download-card').disabled=true;renderedCard=null;$('memory-status').textContent='内容已修改，生成纪念卡后即可下载。';}
  $('memory-message').addEventListener('input',memoryChanged);$('memory-name').addEventListener('input',memoryChanged);
  $('memory-form').addEventListener('submit',e=>{e.preventDefault();const message=$('memory-message').value.trim();if(!message){toast('请先写下一句寄语。');$('memory-message').focus();return;}if(!ctx){toast('当前浏览器不支持图片绘制，请更换浏览器。');return;}state.message=message;state.name=$('memory-name').value.trim();state.created=localDate();const saved=persist();paintCard(state.message,state.name,state.created);renderedCard={message:state.message,name:state.name,date:state.created};$('download-card').disabled=false;$('memory-status').textContent=saved?'纪念卡已生成，寄语已保存在当前浏览器。':'纪念卡已生成，浏览器存储不可用，请下载保存。';toast('你的纪念卡已生成');});
  $('download-card').addEventListener('click',()=>{if(!renderedCard)return;canvas.toBlob(blob=>{if(!blob){toast('图片生成失败，请重试。');return;}const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download='山河寄思-我的纪念卡.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('纪念卡图片已准备下载');},'image/png');});
  $('memory-message').value=state.message;$('memory-name').value=state.name;$('message-count').textContent=state.message.length+' / 100';paintCard(state.message,state.name,state.created);if(state.message&&ctx){renderedCard={message:state.message,name:state.name,date:state.created};$('download-card').disabled=false;$('memory-status').textContent='已恢复此浏览器上次保存的寄语。';}else if(!storageAvailable)$('memory-status').textContent='浏览器存储不可用，生成后请下载纪念卡保存。';
  const pageParams=new URLSearchParams(location.search);
  const eventIndex=data.events.findIndex(e=>e.id===pageParams.get('event'));
  const poemIndex=data.poems.findIndex(p=>p.id===pageParams.get('poem'));
  renderEvent(eventIndex<0?0:eventIndex);renderPoem(poemIndex<0?0:poemIndex);renderNotebook();checkApi();
})();
