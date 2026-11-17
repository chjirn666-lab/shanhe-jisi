(function(){
  'use strict';
  const button=document.getElementById('reader-theme');
  function apply(theme){document.documentElement.dataset.theme=theme;button.textContent=theme==='dark'?'浅色':'深色';button.setAttribute('aria-pressed',String(theme==='dark'));}
  let theme=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  try{const saved=localStorage.getItem('shanheTheme');if(['light','dark'].includes(saved))theme=saved;}catch{}
  apply(theme);
  button.addEventListener('click',()=>{theme=document.documentElement.dataset.theme==='dark'?'light':'dark';apply(theme);try{localStorage.setItem('shanheTheme',theme);}catch{}});
  const links=[...document.querySelectorAll('.reader-sidebar nav a')];
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
    if(!visible)return;
    links.forEach(link=>{if(link.hash==='#'+visible.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  },{rootMargin:'-85px 0px -55% 0px'});
  document.querySelectorAll('.footprint-chapter').forEach(article=>observer.observe(article));
})();
