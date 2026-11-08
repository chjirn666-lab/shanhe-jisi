import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../dist/js/knowledge.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const write=(file,body)=>fs.writeFileSync(path.join(root,file),body);
const replacements=[...JSON.parse(read('domestic-sources.json')),...JSON.parse(read('archive-links.json'))];
const byUrl=new Map(replacements.map(row=>[row.oldUrl,row]));
const data={...globalThis.SHANHE};
data.sources=data.sources.map(source=>{const row=byUrl.get(source.url);return row?{...source,url:row.url,title:row.title,publisher:row.publisher}:source;});
write('dist/js/knowledge.js','/* 史料摘要与短句节选；来源随条目保存。 */\n(function(root){\n\'use strict\';\nroot.SHANHE=Object.freeze('+JSON.stringify(data,null,2)+');\n})(globalThis);\n');
for(const file of ['quotes-additions.json','poetry-additions.json']){
  const rows=JSON.parse(read(file)).map(item=>{const row=byUrl.get(item.sourceUrl);return row?{...item,sourceUrl:row.url,sourceTitle:row.title,publisher:row.publisher}:item;});
  write(file,JSON.stringify(rows,null,2)+'\n');
}
const visiting='https://cpc.people.com.cn/GB/33837/2534919.html';
const communique='https://www.fmprc.gov.cn/web/ziliao_674904/zt_674979/dnzt_674981/qtzt/zmlhgb/202206/t20220606_10699039.shtml';
const photoLinks=[
  ['https://commons.wikimedia.org/wiki/File:Mao1931.jpg','mao-1931'],
  ['https://commons.wikimedia.org/wiki/File:Mao_Zedong_1937.jpg','mao-1937'],
  ['https://commons.wikimedia.org/wiki/File:Photograph_of_Mao_Zedong_with_Evans_Carlson_circa_1937_Trim.jpg','mao-carlson'],
  ['https://commons.wikimedia.org/wiki/File:Mao_Tse_Tung.jpg','mao-1950'],
  ['https://commons.wikimedia.org/wiki/File:President_Richard_Nixon_and_Mao_Zedong.jpg#filehistory','mao-nixon-1972'],
  ['https://commons.wikimedia.org/wiki/File:Mao_Zedong_Anefo.jpg','mao-anefo']
];
for(const file of fs.readdirSync(path.join(root,'dist')).filter(f=>f.endsWith('.html'))){
  if(file==='photo-archive.html')continue;
  let html=read('dist/'+file);
  for(const row of replacements)html=html.split(row.oldUrl).join(row.url);
  html=html.split('https://history.state.gov/historicaldocuments/frus1969-76v17/d203').join(communique);
  html=html.split('https://history.state.gov/milestones/1969-1976/rapprochement-china').join(visiting);
  for(const [url,id]of photoLinks)html=html.split(url).join('photo-archive.html#'+id);
  html=html.split('https://commons.wikimedia.org/wiki/Category:Mao_Zedong').join('photo-archive.html');
  html=html.replaceAll('查看更多档案 ↗','查看照片资料 →').replaceAll('查阅《上海公报》档案 ↗','阅读《上海公报》摘录 ↗');
  html=html.replaceAll('查看原图与公有领域说明 ↗','查看大图与来源 →').replaceAll('查看原图与 CC0 说明 ↗','查看大图与来源 →').replaceAll('查看档案与公有领域说明 ↗','查看大图与来源 →').replaceAll('查看原图与使用说明 ↗','查看大图与来源 →').replaceAll('查看档案版本与使用说明 ↗','查看大图与来源 →');
  write('dist/'+file,html);
}
const index=read('dist/index.html');
const figures=[...index.matchAll(/<figure class="history-photo(?: [^"]*)?">([\s\S]*?)<\/figure>/g)];
if(figures.length!==6)throw new Error('Expected six archived photos');
const cards=figures.map((match,i)=>{
  const [,id]=photoLinks[i];
  const image=match[1].match(/<img[^>]+>/)[0];
  const caption=match[1].match(/<figcaption>([\s\S]*?)<\/figcaption>/)[1].replace(/<a\b[\s\S]*?<\/a>/g,'');
  const original=photoLinks[i][0];
  return '<article class="archive-entry" id="'+id+'"><a class="archive-image" href="assets/photos/'+id+'.jpg" target="_blank" rel="noopener">'+image+'</a><div>'+caption+'<p><a href="assets/photos/'+id+'.jpg" target="_blank" rel="noopener">查看本地大图 ↗</a></p><details><summary>来源与使用说明</summary><p>原档案记录地址：</p><code>'+original+'</code><p>摄影者、年代与使用说明以原档案记录为准。本站保留原图说明；年份不确定处已在图注注明。</p></details></div></article>';
}).join('\n');
write('dist/photo-archive.html','<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; img-src \'self\'; style-src \'self\'; object-src \'none\'; base-uri \'none\'"><title>历史照片资料 · 山河寄思</title><link rel="icon" href="assets/seal.svg"><link rel="stylesheet" href="css/portal-base.css"><link rel="stylesheet" href="css/portal.css"><link rel="stylesheet" href="css/archive.css"></head><body class="home-page memorial-home"><header class="archive-header"><a href="index.html">山河寄思 · 返回首页</a><a href="poetry.html">诗词馆</a><a href="quotes.html">语录馆</a></header><main class="archive-main"><p class="archive-eyebrow">PHOTO ARCHIVE · 影像里的岁月</p><h1>毛泽东历史照片资料</h1><p class="archive-lead">六张历史影像，循着面容与场景，阅读时间留下的记录。点击照片可查看大图，展开图注可查阅原档案信息。</p>'+cards+'<p class="archive-foot"><a href="'+visiting+'" target="_blank" rel="noopener noreferrer">延伸阅读：尼克松访华 · 中国共产党新闻网 ↗</a></p><a class="archive-back" href="index.html#history-photos">← 返回首页照片栏</a></main></body></html>\n');
console.log('国内来源替换完成；6张照片的大图和资料说明在本站查看。');
