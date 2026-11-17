// 由 poetry-fulltext.json 生成前端可直接引用的全文数据。
// 校验：篇目与 knowledge.js 一一对应、节选逐字出自全文、核对来源有效。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromRoot = (...parts) => path.join(root, ...parts);
const raw = JSON.parse(fs.readFileSync(fromRoot('poetry-fulltext.json'), 'utf8'));
await import(pathToFileURL(fromRoot('dist/js/knowledge.js')).href);
const data = globalThis.SHANHE;
const plain = value => String(value).replace(/[^\u4e00-\u9fff0-9a-zA-Z]/g, '');

assert.ok(raw.updated && raw.note, '缺少整理日期或核对说明');
assert.equal(raw.poems.length, data.poems.length, `全文应为 ${data.poems.length} 首`);
assert.equal(new Set(raw.poems.map(p => p.id)).size, raw.poems.length, '全文条目 id 重复');
for (const ref of Object.values(raw.references)) {
  assert.ok(ref.title && /^https:\/\//.test(ref.url), '核对来源格式不正确：' + JSON.stringify(ref));
}

const poems = {};
for (const poem of data.poems) {
  const row = raw.poems.find(p => p.id === poem.id);
  assert.ok(row, '缺少全文：' + poem.id);
  assert.equal(row.title, poem.title, '篇名与资料库不一致：' + poem.id);
  assert.ok(row.fullText && plain(row.fullText).length >= 28, '全文内容过短：' + poem.id);
  assert.ok(plain(row.fullText).includes(plain(poem.quote)), '节选不是全文中的原句：' + poem.id);
  assert.ok(!/[<>]/.test(row.fullText), '全文不应包含 HTML 标记：' + poem.id);
  assert.ok(Array.isArray(row.refs) && row.refs.length && row.refs.every(id => raw.references[id]), '核对来源无效：' + poem.id);
  poems[poem.id] = {
    title: poem.title,
    quote: poem.quote,
    fullText: row.fullText,
    sources: poem.sources.map(id => data.sources.find(s => s.id === id)).filter(Boolean).map(s => ({title: s.title, url: s.url})),
    references: row.refs.map(id => ({title: raw.references[id].title, url: raw.references[id].url}))
  };
  assert.ok(poems[poem.id].sources.length, '资料库出处缺失：' + poem.id);
}

const output = {updated: raw.updated, note: raw.note, poems};
fs.writeFileSync(
  fromRoot('dist/js/poetry-fulltext.js'),
  '/* 29首诗词完整原文；节选与核对来源随条目保存。 */\n(function(root){\n\'use strict\';\nroot.SHANHE_POETRY_FULL=Object.freeze(' + JSON.stringify(output, null, 2) + ');\n})(globalThis);\n'
);
console.log(`PASS: ${Object.keys(poems).length} 首诗词全文与节选、篇名、来源核对一致。`);
