import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),stateFile=path.join(root,'.runtime/local-ai/run-state.json');
let state;
try{state=JSON.parse(await fs.readFile(stateFile,'utf8'));}catch(error){if(error.code==='ENOENT'){console.log('当前没有本项目管理的本地AI进程。');process.exit(0);}throw error;}
if(process.platform!=='win32')throw new Error('请在启动终端使用 Ctrl+C 停止。');
for(const [pid,expected,launcher]of [[state.enginePid,state.enginePath,false],[state.launcherPid,state.launcherPath,true]]){
  if(!Number.isInteger(pid)||pid<=0)continue;
  const script='[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); Get-CimInstance Win32_Process -Filter "ProcessId = '+pid+'" | Select-Object ExecutablePath,CommandLine,@{Name="CreatedMs";Expression={([DateTimeOffset]$_.CreationDate).ToUnixTimeMilliseconds()}} | ConvertTo-Json -Compress';
  const raw=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',windowsHide:true}).trim();
  if(!raw)continue;
  const info=JSON.parse(raw);
  const command=String(info.CommandLine||'').toLowerCase();
  const absolute=command.includes(expected.toLowerCase());
  const relative=(command.includes('tools/run-local-ai.mjs')||command.includes('tools\\run-local-ai.mjs'))&&String(info.ExecutablePath||'').toLowerCase()===process.execPath.toLowerCase()&&Math.abs(Number(info.CreatedMs)-Number(state.launcherStartedMs))<5000;
  const matches=launcher?(absolute||relative):String(info.ExecutablePath||'').toLowerCase()===expected.toLowerCase();
  if(!matches)throw new Error('进程已变化，未停止不属于本项目的程序。');
  try{process.kill(pid);}catch(error){if(error.code!=='ESRCH')throw error;}
}
await fs.unlink(stateFile).catch(error=>{if(error.code!=='ENOENT')throw error;});
console.log('本地AI与本项目网站已停止。');
