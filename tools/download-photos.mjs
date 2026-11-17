import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'photo-catalog.json'),photos=JSON.parse(await fs.readFile(file,'utf8'));
const allowed=new Set(['upload.wikimedia.org','thumb.wikimedia.org']);
async function download(photo){
  if(!/^assets\/photos\/[a-z0-9-]+\.jpg$/.test(photo.src))throw new Error('图片保存路径不合法');
  const target=path.join(root,'dist',photo.src);let bytes;
  try{bytes=await fs.readFile(target);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!bytes){
    const url=new URL(photo.downloadUrl);if(url.protocol!=='https:'||!allowed.has(url.hostname))throw new Error('仅接受已核对的图片存储来源');
    let response;
    for(let attempt=0;attempt<2;attempt++){
      response=await fetch(url,{headers:{'User-Agent':'LocalHistoricalReading/1.0'},signal:AbortSignal.timeout(60000)});
      if(response.status!==429||attempt===1)break;
      const delay=Number(response.headers.get('retry-after')||30);await response.body?.cancel();
      if(!Number.isFinite(delay)||delay>60)throw new Error('图片源要求较长等待，请稍后再次运行。');
      console.log('图片源限速，按要求等待 '+delay+' 秒后重试。');await new Promise(resolve=>setTimeout(resolve,Math.max(1,delay)*1000));
    }
    if(!response.ok)throw new Error(photo.id+': HTTP '+response.status);
    if(!response.headers.get('content-type')?.startsWith('image/'))throw new Error(photo.id+': 返回内容不是图片');
    bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length>16000000||bytes[0]!==0xff||bytes[1]!==0xd8)throw new Error(photo.id+': JPEG校验失败');
    await fs.writeFile(target,bytes);
    console.log('已下载 '+photo.id+' '+Math.round(bytes.length/1024)+' KB');
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  if(bytes[0]!==0xff||bytes[1]!==0xd8)throw new Error('已存文件不是JPEG：'+photo.id);
  photo.bytes=bytes.length;photo.sha256=createHash('sha256').update(bytes).digest('hex');
}
// Keep downloads sequential to respect the archive's request limits.
for(const photo of photos)await download(photo);
if(new Set(photos.map(p=>p.sha256)).size!==photos.length)throw new Error('相册包含重复图片文件');
await fs.writeFile(file,JSON.stringify(photos,null,2)+'\n');
console.log(JSON.stringify({photos:photos.length,bytes:photos.reduce((n,p)=>n+p.bytes,0)}));
