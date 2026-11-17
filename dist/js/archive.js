(function(){
  'use strict';
  const cards=[...document.querySelectorAll('.archive-entry')],search=document.getElementById('photo-search'),sort=document.getElementById('photo-sort');
  const filters=[...document.querySelectorAll('[data-photo-filter]')];let category='';
  function render(){
    const query=search.value.trim().toLowerCase();let count=0;
    const ordered=[...cards].sort((a,b)=>{
      const ay=Number(a.dataset.year),by=Number(b.dataset.year);
      if(ay===9999||by===9999)return ay===by?0:ay===9999?1:-1;
      return (ay-by)*(sort.value==='oldest'?1:-1);
    });
    for(const card of ordered){const match=(!category||card.dataset.category===category)&&(!query||card.textContent.toLowerCase().includes(query));card.hidden=!match;if(match)count++;document.getElementById('archive-grid').append(card);}
    document.getElementById('photo-results').textContent='找到 '+count+' / '+cards.length+' 张图片';
    document.getElementById('photo-empty').hidden=count!==0;
    filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.photoFilter===category)));
  }
  filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.photoFilter;render();}));
  search.addEventListener('input',render);sort.addEventListener('change',render);
  function revealTarget(){
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    const target=document.getElementById(id);if(!target?.classList.contains('archive-entry'))return;
    category='';search.value='';render();requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant',block:'start'}));
  }
  window.addEventListener('hashchange',revealTarget);render();revealTarget();
  const button=document.getElementById('archive-theme');
  function apply(value){document.documentElement.dataset.theme=value;button.textContent=value==='dark'?'浅色':'深色';button.setAttribute('aria-pressed',String(value==='dark'));}
  let theme=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';try{const value=localStorage.getItem('shanheTheme');if(['light','dark'].includes(value))theme=value;}catch{}
  apply(theme);button.addEventListener('click',()=>{theme=document.documentElement.dataset.theme==='dark'?'light':'dark';apply(theme);try{localStorage.setItem('shanheTheme',theme);}catch{}});
})();
