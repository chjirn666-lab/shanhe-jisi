(function(){
  'use strict';
  const id=document.body.dataset.footprintId;
  if(!globalThis.SHANHE?.events.some(e=>e.id===id))return;
  const favorite=document.getElementById('detail-bookmark'),readButton=document.getElementById('detail-mark-read'),status=document.getElementById('detail-save-status');
  const valid=new Set(SHANHE.events.map(e=>e.id));
  function storedJSON(key,fallback){const value=localStorage.getItem(key);try{return value?JSON.parse(value):fallback;}catch{return fallback;}}
  function load(){
    const saved=storedJSON('shanhe-jisi-v1',{});
    const state=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
    const records=storedJSON('shanhe-reading-v1',[]);
    state.bookmarks=Array.isArray(state.bookmarks)?[...new Set(state.bookmarks.filter(x=>valid.has(x)))]:[];
    return {state,read:Array.isArray(records)?[...new Set(records.filter(x=>valid.has(x)))]:[]};
  }
  function refresh(){try{const {state,read}=load();favorite.setAttribute('aria-pressed',String(state.bookmarks.includes(id)));favorite.textContent=state.bookmarks.includes(id)?'已收藏 · 取消收藏':'收藏这一站';readButton.textContent=read.includes(id)?'已读 ✓':'标记已读';readButton.disabled=read.includes(id);}catch{status.textContent='浏览器未允许保存记录，正文仍可正常阅读。';}}
  favorite.disabled=false;readButton.disabled=false;refresh();
  favorite.addEventListener('click',()=>{try{const {state}=load();state.bookmarks=state.bookmarks.includes(id)?state.bookmarks.filter(x=>x!==id):[...state.bookmarks,id];localStorage.setItem('shanhe-jisi-v1',JSON.stringify(state));refresh();status.textContent='收藏已保存，与首页“我的阅读”同步。';}catch{status.textContent='当前浏览器无法保存收藏。';}});
  readButton.addEventListener('click',()=>{try{const {read}=load();localStorage.setItem('shanhe-reading-v1',JSON.stringify([...new Set([...read,id])]));refresh();status.textContent='已标记阅读，可在首页查看进度。';}catch{status.textContent='当前浏览器无法保存阅读记录。';}});
  window.addEventListener('storage',refresh);window.addEventListener('pageshow',refresh);
})();
