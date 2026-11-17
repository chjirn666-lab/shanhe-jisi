(function(){
  'use strict';
  const data=globalThis.SHANHE,core=globalThis.SHANHE_GUIDE,studyCore=globalThis.SHANHE_STUDY;
  if(!data||!core)return;
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  const localEntries=new Map([
    ...data.events.map(e=>[e.id,{title:e.title,url:e.localUrl}]),
    ...data.poems.map(e=>[e.id,{title:e.title,url:'poetry.html?entry='+encodeURIComponent(e.id)}]),
    ...data.quotes.map(e=>[e.id,{title:e.title,url:'quotes.html?entry='+encodeURIComponent(e.id)}])
  ]);
  const approvedSources=new Map(data.sources.map(s=>[s.id,s]));
  document.querySelectorAll('[data-assistant]').forEach(root=>{
    const $=role=>root.querySelector('[data-role="'+role+'"]');
    let provider=null,busy=false,timeout=100000,controller;
    async function connect(){
      provider=null;$('reconnect').disabled=true;
      try{
        if(location.protocol==='file:')throw new Error('file');
        const response=await fetch('api/status',{signal:AbortSignal.timeout(3000)});
        if(!response.ok)throw new Error('status');
        const status=await response.json();
        if(status.service==='shanhe-jisi'&&status.mode==='ai'){
          if(status.provider==='local'&&status.ready===true)provider='local';
          if(status.provider==='remote'&&status.ready!==false)provider='remote';
        }
        const defaultTimeout=provider==='remote'?18000:90000;
        timeout=Math.min(195000,Number(status.timeoutMs||defaultTimeout)+10000);
        if(provider==='remote'){
          $('mode').textContent='云端AI已配置';
          $('status').textContent='AI辅助模式会通过服务端把问题和相关资料发送给云端模型。';
        }else{
          $('mode').textContent=provider==='local'?'本地AI已就绪 · 通义千问 1.5B':'本站资料检索可用';
          $('status').textContent=provider==='local'?'模型在本机运行 · 回答附本地图文入口':'可先查本站资料；启动本地AI后点击“重新连接”。';
        }
      }catch{$('mode').textContent='本站资料检索可用';$('status').textContent='正文与检索均在本地，无需登录。';}
      finally{$('mode').classList.toggle('is-ready',Boolean(provider));$('reconnect').disabled=false;}
    }
    function message(role,text,label){
      const item=el('article',undefined,'ai-message ai-message-'+role);
      item.append(el('strong',label,'ai-message-label'),el('p',text));$('conversation').append(item);
      while($('conversation').children.length>16)$('conversation').firstElementChild.remove();
      return item;
    }
    function evidenceDetails(entry){
      const details=el('details',undefined,'ai-evidence');
      details.append(el('summary',entry.kind+' · '+entry.title));
      if(entry.image){
        const image=el('img');image.src=entry.image;image.alt=entry.title;image.loading='lazy';
        details.append(image);
      }
      const link=el('a','查看本地资料 →');link.href=entry.url;
      details.append(el('p',entry.excerpt),link);
      return details;
    }
    function renderStudy(item,result){
      const topic=studyCore.findTopic(result.study.topic);
      const points=result.study.points;
      if(!points){
        item.append(...topic.evidence.map(entry=>{
          const details=evidenceDetails(entry);
          details.open=true;
          return details;
        }));
        return;
      }
      const list=el('ol',undefined,'ai-study-points');
      const evidence=new Map(topic.evidence.map(entry=>[entry.id,entry]));
      for(const point of points){
        const li=el('li');
        li.append(el('strong',point.label),el('p',point.text),...point.refs.map(id=>evidenceDetails(evidence.get(id))));
        list.append(li);
      }
      const compare=el('button','同题只看资料','ai-compare');
      compare.type='button';compare.dataset.studyCompare=topic.id;
      compare.addEventListener('click',()=>ask(topic.question,{study:topic,retrievalOnly:true}));
      item.append(list,compare);
    }
    function render(result){
      const aiLabel=result.provider==='remote'?'山河 · 云端AI解读':'山河 · 本地AI解读';
      const item=message('assistant',result.answer,result.mode==='ai'?aiLabel:'山河 · 本地资料');
      if(result.study)renderStudy(item,result);
      const matches=[...new Set(result.matches||[])].map(id=>localEntries.get(id)).filter(Boolean);
      if(matches.length){
        const links=el('div',undefined,'ai-local-links');links.append(el('span','继续阅读本地图文'));
        matches.slice(0,6).forEach(entry=>{const a=el('a',entry.title+' →');a.href=entry.url;links.append(a);});
        item.append(links);
      }
      const sources=[...new Set((result.sources||[]).map(s=>s.id))].map(id=>approvedSources.get(id)).filter(Boolean);
      if(sources.length){const details=el('details',undefined,'ai-sources');details.append(el('summary','资料依据与原文核对（'+sources.length+'项）'));const list=el('ol');sources.forEach(source=>{const li=el('li'),a=el('a',source.title+' ↗');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);});details.append(list);item.append(details);}
      const conversation=$('conversation');
      if(result.study)conversation.scrollTop+=item.getBoundingClientRect().top-conversation.getBoundingClientRect().top;
      else conversation.scrollTop=conversation.scrollHeight;
    }
    async function ask(value,{study,retrievalOnly=false}={}){
      if(busy)return;
      const question=value.trim().slice(0,300);if(!question)return;
      const topic=root.dataset.topic;
      const submitted=(topic&&!study&&/这段|这一|本页|当时|此时/.test(question)?topic+'：'+question:question).slice(0,300);
      const requestProvider=!retrievalOnly&&$('answer-mode').value==='auto'?provider:null;
      const aiName=requestProvider==='remote'?'云端AI':'本地AI';
      const localAnswer=()=>study?studyCore.materials(study):core.answer(submitted);
      const inputs='[data-ai-question],[data-study-topic],[data-study-compare],textarea,select,[data-role="send"]';
      busy=true;controller=new AbortController();
      root.querySelectorAll(inputs).forEach(node=>node.disabled=true);
      $('stop').hidden=false;$('conversation').setAttribute('aria-busy','true');
      message('user',question,'我的提问');$('question').value='';
      $('status').textContent=requestProvider?aiName+'正在整理资料，请稍候…':'正在检索本站资料…';
      let result;
      try{
        if(requestProvider){
          const response=await fetch('api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:submitted,answerMode:'auto',studyTopic:study?.id}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(timeout)])});
          if(!response.ok)throw new Error('ask');
          result=await response.json();
          if(typeof result.answer!=='string'||(result.mode==='ai'&&result.provider!==requestProvider)||result.study?.topic!==study?.id)throw new Error('invalid');
        }else result=localAnswer();
        if(controller.signal.aborted)throw new Error('stopped');
        render(result);$('status').textContent=result.fallback?aiName+'暂不可用，已展示本站资料。':result.mode==='ai'?aiName+'回答完成 · 请结合所附资料核对':'本地资料整理完成 · 可打开图文继续阅读';
      }catch{
        if(controller.signal.aborted)$('status').textContent='已停止回答，可重新提问。';
        else{render(localAnswer());$('status').textContent=aiName+'暂不可用，已展示本站资料。';}
      }finally{
        busy=false;$('stop').hidden=true;$('conversation').removeAttribute('aria-busy');
        root.querySelectorAll(inputs).forEach(node=>node.disabled=false);
        $('question').focus({preventScroll:true});
      }
    }
    $('form').addEventListener('submit',event=>{event.preventDefault();ask($('question').value);});
    $('question').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();ask($('question').value);}});
    root.querySelectorAll('[data-ai-question]').forEach(button=>button.addEventListener('click',()=>ask(button.dataset.aiQuestion)));
    root.querySelectorAll('[data-study-topic]').forEach(button=>button.addEventListener('click',()=>{
      const study=studyCore.findTopic(button.dataset.studyTopic);
      ask(study.question,{study});
    }));
    $('stop').addEventListener('click',()=>controller?.abort());$('reconnect').addEventListener('click',connect);
    window.addEventListener('pagehide',()=>controller?.abort());
    connect();
  });
})();
