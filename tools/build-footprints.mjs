import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../dist/js/knowledge.js';
import '../dist/js/literature-links.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const write=(file,body)=>fs.writeFileSync(path.join(root,file),body);
const data={...globalThis.SHANHE};
const articles=JSON.parse(read('footprint-articles.json'));
data.biographyPeriods=JSON.parse(read('biography-periods.json'));
const photoCatalog=JSON.parse(read('photo-catalog.json'));
if(!articles.length||new Set(articles.map(a=>a.id)).size!==articles.length)throw new Error('足迹正文不能为空或有重复ID');
for(const article of articles){
  if((!data.events.some(e=>e.id===article.id)&&!article.event)||!article.lead||article.sections.length<3||article.timeline.length<3)throw new Error('图文资料结构不完整：'+article.id);
  for(const source of article.extraSources||[]){if(!data.sources.some(s=>s.id===source.id))data.sources=[...data.sources,source];}
}
data.events=articles.map(article=>{
  const event={...data.events.find(e=>e.id===article.id),...article.event,id:article.id};
  const periods=data.biographyPeriods.filter(p=>p.eventIds.includes(event.id));
  if(!event.title||!event.year||!event.terms?.length)throw new Error('足迹元数据缺失：'+article.id);
  const sources=[...new Set([...(event.sources||[]),...article.sourceIds,...(article.extraSources||[]).map(s=>s.id),...periods.flatMap(p=>p.sources)])];
  if(sources.some(id=>!data.sources.some(s=>s.id===id)))throw new Error('资料出处不存在：'+event.id);
  const photos=photoCatalog.filter(p=>p.chapters.includes(event.id)).sort((a,b)=>a.chapterOrder[event.id]-b.chapterOrder[event.id]).map(p=>({...p,context:p.chapterContexts?.[event.id]||p.context,archive:'photo-archive.html#'+p.id}));
  if(!photos.length)throw new Error('足迹配图缺失：'+event.id);
  const text=[...article.sections.map(s=>s.heading+'\n'+s.text),...periods.map(p=>p.range+' · '+p.title+'\n'+p.paragraphs.join('\n'))].join('\n\n');
  return {...event,year:String(event.year),biographyIds:periods.map(p=>p.id),lead:article.lead,sections:article.sections,timeline:article.timeline,photos,text,sources,localUrl:'footprint-'+event.id+'.html'};
}).sort((a,b)=>Number(a.year)-Number(b.year));
if(data.biographyPeriods.length!==10||data.biographyPeriods.some(p=>!p.paragraphs.length||!p.eventIds.length||p.eventIds.some(id=>!data.events.some(e=>e.id===id))))throw new Error('生平阶段与足迹对应不完整');
data.updated='2026-11-09';
write('dist/js/knowledge.js','/* 本地史料选读、原创介绍及短句节选；来源随条目保存。 */\n(function(root){\n\'use strict\';\nroot.SHANHE=Object.freeze('+JSON.stringify(data,null,2)+');\n})(globalThis);\n');
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const link=(url,label,cls='')=>'<a'+(cls?' class="'+cls+'"':'')+' href="'+esc(url)+'">'+esc(label)+'</a>';
const figure=photo=>'<figure class="footprint-photo"><a href="'+photo.src+'" target="_blank" rel="noopener"><img src="'+photo.src+'" alt="'+esc(photo.title+'；'+photo.context)+'" loading="lazy" width="600" height="640"></a><figcaption><span>'+esc(photo.year)+' · '+esc(photo.title)+'</span><p>'+esc(photo.context)+'</p><small class="photo-credit">'+esc(photo.credit)+' · '+esc(photo.license)+'</small>'+link(photo.archive,'本地大图与档案说明 →')+'</figcaption></figure>';
const referenceHtml=globalThis.SHANHE_REFERENCES.html;
const chapterBlocks=data.events.map((event,i)=>{
  const sourceList=event.sources.map(id=>{const source=data.sources.find(s=>s.id===id);return '<li><a href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer">'+esc(source.title)+' ↗</a><small>'+esc(source.publisher)+'</small></li>';}).join('');
  const periods=data.biographyPeriods.filter(p=>event.biographyIds.includes(p.id));
  const periodReading='<details class="chapter-periods"><summary>这一站的生平阶段 <span>'+periods.map(p=>esc(p.range+' · '+p.label)).join(' / ')+'</span></summary>'+periods.map(p=>'<section><small>'+esc(p.range+' · '+p.label)+'</small><h3>'+esc(p.title)+'</h3>'+p.paragraphs.map(text=>'<p>'+referenceHtml(text)+'</p>').join('')+'</section>').join('')+'</details>';
  const body=event.sections.map((section,j)=>'<section class="footprint-section"><span class="section-number">'+String(j+1).padStart(2,'0')+'</span><h3>'+referenceHtml(section.heading)+'</h3><p>'+referenceHtml(section.text)+'</p></section>').join('')+periodReading;
  const timeline=event.timeline.map(row=>'<li><time>'+esc(row.date)+'</time><p>'+referenceHtml(row.text)+'</p></li>').join('');
  const related=articles.find(a=>a.id===event.id).relatedPoems||({'1893':['changsha'],'1921':['changsha'],'1927':['loushan','march'],'1935':['march','snow'],'1949':['swimming'],'1976':['plum']})[event.id]||[];
  const poemLinks=related.map(id=>data.poems.find(p=>p.id===id)).filter(Boolean).map(p=>link('poetry.html?entry='+p.id,p.title+' · 本地诗词阅读','related-poem')).join('');
  return '<article class="footprint-chapter" id="'+event.id+'" aria-labelledby="title-'+event.id+'"><header class="chapter-heading"><span class="chapter-year">'+event.year+'</span><div><p>第 '+String(i+1).padStart(2,'0')+' 站 · '+esc(event.place)+'</p><h2 id="title-'+event.id+'">'+esc(event.title)+'</h2></div></header><p class="chapter-lead">'+referenceHtml(event.lead)+'</p><div class="chapter-layout"><div class="chapter-prose">'+body+'<section class="footprint-section timeline-section"><h3>把时间串起来</h3><ol class="chapter-timeline">'+timeline+'</ol></section></div><aside class="chapter-images" aria-label="'+esc(event.title)+'相关历史照片">'+event.photos.map(figure).join('')+'</aside></div><div class="chapter-reading"><span>沿着文字继续阅读</span><div>'+poemLinks+link('long-scroll.html?event='+event.id+'#journey','在长卷中阅读与收藏 →')+'</div></div><details class="chapter-sources"><summary>资料依据与原文核对 <span>'+event.sources.length+' 项</span></summary><p>以上正文为本站根据资料自行整理的图文选读，已保存在网站中。以下为外部原文与出处，供需要时核对：</p><ol>'+sourceList+'</ol></details></article>';
});
const chapters=chapterBlocks.join('\n');
const nav=data.events.map(e=>link('#'+e.id,e.year+' · '+e.label)).join('');
write('dist/footprints.html','<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="description" content="六个足迹节点的本地图文阅读：正文、时间线、历史照片与资料说明。"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\'; object-src \'none\'; base-uri \'none\'"><title>足迹图文档案 · 山河寄思</title><link rel="icon" href="assets/seal.svg"><link rel="stylesheet" href="css/portal-base.css"><link rel="stylesheet" href="css/footprints.css"><link rel="stylesheet" href="css/literature-links.css"><script defer src="js/footprints.js"></script></head><body class="footprints-page"><a class="reader-skip" href="#reader-content">跳到图文正文</a><header class="reader-header"><a href="index.html" class="reader-brand"><img src="assets/seal.svg" width="36" height="36" alt=""><span>山河寄思<small>生平足迹 · 本地图文档案</small></span></a><nav aria-label="主导航">'+link('index.html#home-map','返回足迹图')+link('photo-archive.html','历史照片')+link('poetry.html','诗词馆')+link('ai.html','山河AI')+'<button id="reader-theme" type="button" aria-pressed="false">深色</button></nav></header><main class="reader-main" id="reader-content"><section class="reader-intro"><p class="reader-eyebrow">A LIFE IN PICTURES · 循着足迹读历史</p><h1>让足迹，有故事；<br>让影像，有来处。</h1><p>从韶山的求学岁月，到北京的历史回响。六个节点，串起正文、时间线与历史影像，在同一页慢慢读。</p><div class="reader-badges"><span>6 篇本地介绍</span><span>6 张历史照片</span><span>正文与图片可离线阅读</span></div></section><div class="reader-layout"><aside class="reader-sidebar"><p>沿着时间阅读</p><nav aria-label="足迹章节目录">'+nav+'</nav><p class="reader-tip">照片有各自的拍摄年代。不是当年现场的影像，会在图注中注明。</p></aside><div class="reader-chapters">'+chapters+'</div></div></main><footer class="reader-footer">'+link('index.html','← 返回山河寄思首页')+'<p>历史选读 · 非完整传记　|　资料整理日期：2026年11月9日</p></footer></body></html>\n');
const characters=articles.reduce((sum,a)=>sum+a.sections.reduce((n,s)=>n+s.text.length,0),0);
write('dist/footprints.html',read('dist/footprints.html')
  .replaceAll('六个',data.events.length+'个')
  .replace('6 篇本地介绍',data.events.length+' 篇本地介绍')
  .replace('<span>6 张历史照片</span>','<span>'+data.biographyPeriods.length+' 个生平阶段</span><span>6 张历史照片</span>')
  .replace('6 张历史照片',photoCatalog.length+' 张照片与场景')
  .replace('正文与图片可离线阅读','约'+Math.round(characters/100)*100+'字正文 · 可离线阅读'));
console.log(JSON.stringify({chapters:data.events.length,characters:articles.reduce((sum,a)=>sum+a.sections.reduce((n,s)=>n+s.text.length,0),0),photos:photoCatalog.length}));

const bookHead=read('dist/footprints.html').split('<body')[0];
for(const [index,event]of data.events.entries()){
  const head=bookHead.replace(/<title>.*?<\/title>/,'<title>'+esc(event.title)+' · 山河寄思</title>')
    .replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+esc(event.summary)+'">')
    .replace('</head>','<link rel="stylesheet" href="css/footprint-detail.css"><link rel="stylesheet" href="css/ai-entry.css"><script defer src="js/knowledge.js"></script><script defer src="js/footprint-detail.js"></script></head>');
  let content=chapterBlocks[index].replace(/<header class="chapter-heading">[\s\S]*?<\/header><p class="chapter-lead">[\s\S]*?<\/p>/,'');
  let section=0;
  content=content.replaceAll('<section class="footprint-section">',()=>'<section class="footprint-section" id="detail-section-'+(++section)+'">')
    .replace('class="footprint-section timeline-section"','class="footprint-section timeline-section" id="detail-timeline"')
    .replace('class="chapter-images"','class="chapter-images" id="detail-photos"');
  const previous=data.events[index-1],next=data.events[index+1];
  const paging='<nav class="detail-paging" aria-label="前后足迹">'+(previous?'<a href="'+previous.localUrl+'"><small>← 上一站 · '+previous.year+'</small>'+esc(previous.title)+'</a>':'<a href="index.html#home-map"><small>← 回到起点</small>查看全部生平足迹</a>')+(next?'<a href="'+next.localUrl+'"><small>下一站 · '+next.year+' →</small>'+esc(next.title)+'</a>':'<a href="footprints.html"><small>继续阅读 →</small>浏览完整图文档案</a>')+'</nav>';
  const contents='<nav class="detail-contents" aria-label="本页目录">'+event.sections.map((s,i)=>link('#detail-section-'+(i+1),s.heading)).join('')+link('#detail-timeline','时间线')+link('#detail-photos','历史照片')+link('ai.html?event='+event.id,'向AI提问')+'</nav>';
  const body='<body class="footprints-page footprint-detail-page" data-footprint-id="'+event.id+'"><a class="reader-skip" href="#reader-content">跳到正文</a><header class="reader-header"><a href="index.html" class="reader-brand"><img src="assets/seal.svg" width="36" height="36" alt=""><span>山河寄思<small>生平足迹 · 图文详读</small></span></a><nav aria-label="主导航">'+link('index.html#home-map','返回首页足迹')+link('footprints.html','完整图文档案')+link('ai.html?event='+event.id,'山河AI')+'<button id="reader-theme" type="button" aria-pressed="false">深色</button></nav></header><main class="reader-main" id="reader-content"><nav class="detail-breadcrumb" aria-label="当前位置">'+link('index.html','首页')+'<span>／</span>'+link('index.html#home-map','生平足迹')+'<span>／ '+event.year+' · '+esc(event.city||event.label)+'</span></nav><section class="detail-hero"><div class="detail-hero-top"><span class="detail-year">'+event.year+'</span><div><p>'+esc(event.place)+' · '+esc(event.kicker)+'</p><h1 id="title-'+event.id+'">'+esc(event.title)+'</h1></div></div><p class="detail-lead">'+referenceHtml(event.lead)+'</p><div class="detail-actions"><button id="detail-bookmark" type="button" aria-pressed="false" disabled>收藏这一站</button><button id="detail-mark-read" type="button" disabled>标记已读</button>'+link('ai.html?event='+event.id,'问问这一站 →')+'</div><p id="detail-save-status" class="detail-save-status" role="status">收藏与阅读进度保存在当前浏览器。</p></section>'+contents+content+paging+'<p class="detail-ai-entry" id="detail-ai">带着这一站的疑问，继续查阅。'+link('ai.html?event='+event.id,'进入山河AI →')+'</p>'+'<p class="detail-footer-note">照片以图注中的拍摄年代为准。正文、时间线及照片均已保存在本站，资料出处可展开核对。</p></main><footer class="reader-footer">'+link('index.html#home-map','← 返回首页足迹')+'<p>山河寄思 · 生平图文选读</p></footer></body></html>';
  write('dist/'+event.localUrl,head+body+'\n');
}
console.log('Generated '+data.events.length+' standalone footprint pages.');
