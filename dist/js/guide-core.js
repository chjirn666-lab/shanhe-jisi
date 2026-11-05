(function (root) {
  'use strict';
  const data = root.SHANHE;
  function normalize(value) { return String(value).toLowerCase().replace(/[\s《》·，。？?、！!：:]/g,''); }
  const entries = [...data.events.map(e=>({...e,type:'历史节点'})),...data.poems.map(p=>({...p,type:'诗词背景'}))];
  function retrieve(question) {
    const q = normalize(question);
    if (!q) return [];
    return entries.map(entry=>{
      let score=entry.terms.reduce((total,term)=>total+(q.includes(normalize(term)) ? Math.min(term.length,6) : 0),0);
      if(q.includes(normalize(entry.title))) score+=12;
      return {...entry,score};
    }).filter(e=>e.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  }
  function citedSources(matches) {
    const ids = new Set(matches.flatMap(e=>e.sources));
    return data.sources.filter(s=>ids.has(s.id));
  }
  function answer(question) {
    const matches=retrieve(question);
    if(!matches.length) return {mode:'retrieval',answer:'本站目前没有收录足够资料来回答这个问题。你可以尝试询问“毛泽东出生在哪里”“遵义会议”或“《沁园春·长沙》的创作背景”，也可以打开史料索引继续查阅。',sources:[],matches:[]};
    const selected=matches.slice(0,2);
    return {mode:'retrieval',answer:'检索到以下相关资料摘要，供你对照问题阅读：\n\n'+selected.map(e=>e.title+'\n'+e.text).join('\n\n'),sources:citedSources(selected),matches:selected.map(e=>e.id)};
  }
  root.SHANHE_GUIDE = Object.freeze({retrieve,citedSources,answer});
})(globalThis);
