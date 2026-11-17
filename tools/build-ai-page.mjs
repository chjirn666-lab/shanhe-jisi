import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assistantMarkup} from './assistant-markup.mjs';
import '../dist/js/knowledge.js';
import '../dist/js/study-core.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="description" content="山河AI研读室：结合生平足迹、照片和诗词解读历史，每条研读要点都可以回到本地资料核对。"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'"><title>山河AI研读室 · 山河寄思</title><link rel="icon" href="assets/seal.svg"><link rel="stylesheet" href="css/portal-base.css"><link rel="stylesheet" href="css/footprints.css"><link rel="stylesheet" href="css/assistant-ui.css"><link rel="stylesheet" href="css/ai-page.css"><script defer src="js/knowledge.js"></script><script defer src="js/guide-core.js"></script><script defer src="js/study-core.js"></script><script defer src="js/footprints.js"></script><script defer src="js/ai-page.js"></script><script defer src="js/assistant-ui.js"></script></head>
<body class="footprints-page ai-page"><a class="reader-skip" href="#ai-chat-question">跳到提问</a><header class="reader-header"><a class="reader-brand" href="index.html"><img src="assets/seal.svg" width="36" height="36" alt=""><span>山河寄思<small>山河AI · 史料研读</small></span></a><nav aria-label="主导航"><a href="index.html">返回首页</a><a href="index.html#home-map">生平足迹</a><a href="poetry.html">诗词馆</a><a href="quotes.html">语录馆</a><button id="reader-theme" type="button" aria-pressed="false">深色</button></nav></header>
<main class="ai-page-main"><aside class="ai-page-intro"><h1>山河AI研读室</h1><p>从一个历史问题出发，对照时间线、档案照片和诗词背景。点开研读要点所引用的资料，可回到本站图文核对。</p><div class="ai-reading-context" id="ai-reading-context" hidden><span>当前阅读主题</span><h2 id="ai-context-title"></h2><p id="ai-context-place"></p><a id="ai-context-return" href="index.html#home-map">返回这篇足迹 →</a></div></aside><div class="ai-page-workspace">${assistantMarkup({id:'ai-chat',studies:globalThis.SHANHE_STUDY.topics})}</div></main><footer class="reader-footer"><a href="index.html">← 返回山河寄思首页</a><p>本地史料 · AI辅助问答 · 无需登录</p></footer></body></html>`;
fs.writeFileSync(path.join(root,'dist/ai.html'),html+'\n');
console.log('Generated standalone AI page: dist/ai.html');
