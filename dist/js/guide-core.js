(function (root) {
  'use strict';
  const data = root.SHANHE;
  const normalize = value => String(value).toLowerCase().replace(/[\s《》·，。？?、！!：:“”"'‘’]/g,'');
  const history=data.events.map(e=>({...e,type:'历史节点'}));
  const poems=data.poems.map(p=>({...p,type:'诗词背景'}));
  const quotes=data.quotes.map(q=>({...q,type:'语录出处',background:q.text,text:q.quote+'\n出处：'+q.work+'（'+q.season+'）。\n'+q.text}));
  const entries=[...history,...poems,...quotes];
  function intent(question) {
    const q=normalize(question);
    if(/(诗词|诗歌).*(有哪些|目录|列表|多少|几首|作品)|(有哪些|列出|列举|多少).*(诗词|诗歌)/.test(q))return 'poetry-catalog';
    if(/(语录|名言).*(有哪些|目录|列表|多少|几则)|(有哪些|列出|列举|多少).*(语录|名言)/.test(q))return 'quotes-catalog';
    if(/(毛泽东|毛主席).*(一生|生平|人生经历|主要经历)|^(介绍|介绍一下|讲讲)(毛泽东|毛主席)$/.test(q))return 'biography';
    return 'detail';
  }
  function retrieve(question) {
    const q=normalize(question),kind=intent(question);
    if(!q)return [];
    if(kind==='biography')return history;
    if(kind==='poetry-catalog')return poems;
    if(kind==='quotes-catalog')return quotes;
    const ranked=entries.map(entry=>{
      let score=entry.terms.reduce((total,term)=>total+(normalize(term)&&q.includes(normalize(term))?Math.min(term.length,6):0),0);
      if(q.includes(normalize(entry.title)))score+=12;
      return {...entry,score};
    }).filter(e=>e.score>0).sort((a,b)=>b.score-a.score);
    const threshold=ranked.length?Math.max(1,ranked[0].score*.65):1;
    return ranked.filter(e=>e.score>=threshold).slice(0,3);
  }
  function citedSources(matches) {
    const ids=new Set(matches.flatMap(e=>e.sources));
    return data.sources.filter(s=>ids.has(s.id));
  }
  function answer(question) {
    const matches=retrieve(question),kind=intent(question);
    if(!matches.length)return {mode:'retrieval',answer:'本站目前没有收录足够资料来回答这个问题。你可以尝试询问“毛泽东出生在哪里”“遵义会议”或“《沁园春·长沙》的创作背景”，也可以打开史料索引继续查阅。',sources:[],matches:[]};
    if(kind.endsWith('-catalog')){
      const noun=kind==='poetry-catalog'?'诗词':'语录';
      return {mode:'retrieval',intent:kind,answer:'本站收录'+matches.length+(noun==='诗词'?'首':'则')+noun+'，以下是目录：\n\n'+matches.map((e,i)=>(i+1)+'. '+e.title+'（'+e.season+'）').join('\n')+'\n\n可在导航中的“毛主席'+noun+'”查看节选、背景和逐条来源。',sources:citedSources(matches.slice(0,3)),matches:matches.map(e=>e.id)};
    }
    const selected=matches.slice(0,kind==='biography'?6:2);
    return {mode:'retrieval',intent:kind,answer:(kind==='biography'?'以下为本站精选生平节点，按时间梳理，更多经历可阅读首页生平专题：':'检索到以下相关资料摘要，供你对照问题阅读：')+'\n\n'+selected.map(e=>e.title+'\n'+(e.type==='诗词背景'?e.quote+'\n':'')+e.text).join('\n\n'),sources:citedSources(selected),matches:selected.map(e=>e.id)};
  }
  root.SHANHE_GUIDE=Object.freeze({retrieve,citedSources,answer});
})(globalThis);
