(function(root){
  'use strict';
  const data=root.SHANHE;
  if(!data)return;
  const entries=new Map();
  const key=text=>String(text).replace(/\s+/g,'');
  const esc=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const add=(text,url,title,kind)=>{if(text&&key(text).length>=4&&!entries.has(key(text)))entries.set(key(text),{text,url,title,kind});};
  for(const poem of data.poems){
    const url='poetry.html?entry='+encodeURIComponent(poem.id),title='在诗词馆阅读《'+poem.title+'》';
    add('《'+poem.title+'》',url,title,'poetry');
    add(poem.quote,url,title,'poetry');add(poem.quote?.replace(/[。！？]+$/,''),url,title,'poetry');
  }
  const works=new Map();
  for(const quote of data.quotes){
    if(!works.has(quote.work))works.set(quote.work,[]);works.get(quote.work).push(quote);
    const url='quotes.html?entry='+encodeURIComponent(quote.id),title='在语录馆查看这句节选与出处';
    add(quote.quote,url,title,'quotes');add(quote.quote?.replace(/[。！？]+$/,''),url,title,'quotes');
  }
  for(const [work,quotes]of works){
    const url=quotes.length===1?'quotes.html?entry='+encodeURIComponent(quotes[0].id):'quotes.html?work='+encodeURIComponent(work)+'#library-grid';
    add(work,url,'在语录馆阅读'+work+'的收录节选','quotes');
  }
  const escapeRegex=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=[...entries.values()].sort((a,b)=>b.text.length-a.text.length).map(entry=>entry.text.split(/\s+/).map(escapeRegex).join('\\s*')).join('|');
  function segments(value){
    const text=String(value??''),parts=[];let position=0;
    if(!pattern)return [{text}];
    for(const match of text.matchAll(new RegExp(pattern,'gu'))){
      if(match.index>position)parts.push({text:text.slice(position,match.index)});
      parts.push({...entries.get(key(match[0])),text:match[0]});position=match.index+match[0].length;
    }
    if(position<text.length)parts.push({text:text.slice(position)});
    return parts;
  }
  function html(text){return segments(text).map(part=>part.url?'<a class="literature-reference" data-reference-kind="'+part.kind+'" href="'+esc(part.url)+'" title="'+esc(part.title)+'">'+esc(part.text)+'</a>':esc(part.text)).join('');}
  function fragment(text){
    const fragment=document.createDocumentFragment();
    for(const part of segments(text)){
      if(!part.url){fragment.append(document.createTextNode(part.text));continue;}
      const a=document.createElement('a');a.className='literature-reference';a.dataset.referenceKind=part.kind;a.href=part.url;a.title=part.title;a.textContent=part.text;fragment.append(a);
    }
    return fragment;
  }
  root.SHANHE_REFERENCES=Object.freeze({html,fragment,segments});
})(globalThis);
