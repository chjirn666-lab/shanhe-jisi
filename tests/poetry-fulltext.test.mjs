import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../dist/js/knowledge.js';
import '../dist/js/poetry-fulltext.js';

const data = globalThis.SHANHE;
const full = globalThis.SHANHE_POETRY_FULL;
const plain = value => String(value).replace(/[^\u4e00-\u9fff0-9a-zA-Z]/g, '');

test('29首诗词都有完整原文', () => {
  assert.equal(Object.keys(full.poems).length, data.poems.length);
  for (const poem of data.poems) {
    const entry = full.poems[poem.id];
    assert.ok(entry, '缺少全篇：' + poem.id);
    assert.equal(entry.title, poem.title);
    assert.ok(plain(entry.fullText).length >= 28, '全篇过短：' + poem.id);
  }
});

test('每首的短句节选逐字出自全篇', () => {
  for (const poem of data.poems) {
    assert.ok(plain(full.poems[poem.id].fullText).includes(plain(poem.quote)), '节选与全篇不符：' + poem.id);
  }
});

test('全篇附本站出处与核对来源', () => {
  for (const entry of Object.values(full.poems)) {
    assert.ok(entry.sources.length, '缺少本站出处：' + entry.title);
    assert.ok(entry.references.length, '缺少核对来源：' + entry.title);
    // 本站出处沿用资料库既有约定（部分人民网旧链接为 HTTP）；新增的核对来源统一要求 HTTPS。
    for (const source of entry.sources) assert.ok(/^https?:\/\//.test(source.url), '本站出处格式不正确：' + source.url);
    for (const ref of entry.references) assert.ok(ref.url.startsWith('https://'), '核对来源不是 HTTPS：' + ref.url);
  }
});

test('整理说明与日期齐备', () => {
  assert.ok(full.updated);
  assert.match(full.note, /核校|核对/);
});
