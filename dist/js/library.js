(function () {
    'use strict';
    const data = globalThis.SHANHE;
    const fullTexts = globalThis.SHANHE_POETRY_FULL?.poems || {};
    const kind = document.body.dataset.library;
    const items = kind === 'poetry' ? data.poems : data.quotes;
    const $ = id => document.getElementById(id);
    const key = 'shanhe-literature-v1';
    const validKeys = new Set([...data.poems.map(p => 'poetry:' + p.id), ...data.quotes.map(q => 'quotes:' + q.id)]);
    let saved = new Set(), selectedTheme = '', selectedWork = '', selected = null, returnFocus = null;
    const normalize = value => String(value).toLowerCase().replace(/[\s《》·，。？?、！!：:]/g, '');
    function el(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function button(text, className, fn) {
        const node = el('button', text, className);
        node.type = 'button'; node.addEventListener('click', fn); return node;
    }
    function sourceLink(source) {
        const link = el('a', source.title + ' ↗');
        link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
    }
    function readSaved() {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '[]');
            saved = new Set(Array.isArray(value) ? value.filter(id => validKeys.has(id)) : []);
        } catch { $('save-status').textContent = '浏览器未允许读取收藏，仍可正常阅读。'; }
    }
    function toggleSaved(item) {
        readSaved();
        const id = kind + ':' + item.id;
        saved.has(id) ? saved.delete(id) : saved.add(id);
        try {
            localStorage.setItem(key, JSON.stringify([...saved]));
            $('save-status').textContent = saved.has(id) ? '已收藏，可勾选“只看收藏”继续阅读。' : '已取消收藏。';
        } catch { $('save-status').textContent = '浏览器未允许保存，收藏仅在本次页面中有效。'; }
        render();
        if (selected) updateDialogSave();
    }
    function updateDialogSave() {
        const active = saved.has(kind + ':' + selected.id);
        $('reader-save').textContent = active ? '已收藏 · 点击取消' : '收藏这篇';
        $('reader-save').setAttribute('aria-pressed', String(active));
    }
    function openReader(item, trigger) {
        selected = item; returnFocus = trigger || document.activeElement;
        $('reader-meta').textContent = item.season + ' · ' + item.theme;
        $('reader-title').textContent = kind === 'poetry' ? item.title : item.work;
        $('reader-quote').textContent = item.quote;
        $('reader-caption').textContent = '毛泽东' + (kind === 'poetry' ? '《' + item.title + '》节选' : item.work + '节选');
        $('reader-background-label').textContent = kind === 'poetry' ? '创作背景' : '出处与语境';
        $('reader-background').textContent = item.text;
        $('reader-reading').textContent = item.reading;
        $('reader-sources').replaceChildren(...item.sources.map(id => {
            const source = data.sources.find(s => s.id === id), row = el('li');
            row.append(sourceLink(source), el('small', source.publisher)); return row;
        }));
        // 诗词馆详情页展示完整原文；语录馆没有全篇区块，自动隐藏相关控件。
        const fullSection = $('reader-fulltext-section'), copyFull = $('reader-copy-full'), full = fullTexts[item.id];
        if (fullSection) {
            const showFull = kind === 'poetry' && Boolean(full);
            fullSection.hidden = !showFull;
            if (copyFull) copyFull.hidden = !showFull;
            if (showFull) {
                $('reader-fulltext').textContent = full.fullText;
                $('reader-fulltext-note').textContent = '原文依据公开资料逐首核对，异文按通行定本处理；分行只为便于阅读，不改动字句。';
                $('reader-fulltext-links').replaceChildren(...full.references.map(ref => {
                    const a = el('a', ref.title + ' ↗');
                    a.href = ref.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
                }));
            }
        }
        $('copy-fallback').hidden = true; $('copy-status').textContent = '';
        updateDialogSave(); $('reader-dialog').showModal();
    }
    let currentPage = 1;
    const pageSize = 6;
    function render(resetPage = false) {
        if (resetPage) currentPage = 1;
        const focusId = document.activeElement?.dataset.saveId;
        const query = normalize($('library-search').value);
        const visible = items.filter(item => (!selectedWork || normalize(item.work||'')===normalize(selectedWork)) && (!selectedTheme || item.theme === selectedTheme) &&
            (!$('only-saved').checked || saved.has(kind + ':' + item.id)) &&
            (!query || normalize([item.title,item.work || '',item.year,item.season,item.quote,item.text,fullTexts[item.id]?.fullText||'',...item.terms].join(' ')).includes(query)));
        const order = $('library-sort').value;
        if(order !== 'featured') visible.sort((a,b)=>(Number(a.year)-Number(b.year))*(order==='oldest'?1:-1));
        const pages = Math.max(1,Math.ceil(visible.length/pageSize));
        currentPage = Math.min(currentPage,pages);
        $('result-status').textContent = '找到 ' + visible.length + ' / ' + items.length + (kind === 'poetry' ? ' 首诗词' : ' 则语录') + ' · 第 ' + currentPage + ' / ' + pages + ' 页';
        $('saved-count').textContent = String(items.filter(item => saved.has(kind + ':' + item.id)).length);
        $('library-grid').replaceChildren(...visible.slice((currentPage-1)*pageSize,currentPage*pageSize).map(item => {
            const card = el('article', undefined, 'reading-card');
            card.dataset.entryId = item.id;
            const meta = el('div', undefined, 'reading-meta'); meta.append(el('span', item.theme), el('span', item.season));
            card.append(meta, el('h2', item.title), el('blockquote', item.quote, 'reading-excerpt'));
            card.append(el('p', kind === 'poetry' ? '毛泽东《' + item.title + '》节选' : '毛泽东 · ' + item.work, 'reading-credit'));
            card.append(el('p', item.text, 'reading-context'));
            const actions = el('div', undefined, 'reading-actions');
            const read = button(kind === 'poetry' ? '品读背景与全篇 →' : '阅读语境 →', 'btn btn-outline', () => openReader(item, read));
            const favorite = button(saved.has(kind + ':' + item.id) ? '★ 已收藏' : '☆ 收藏', 'reading-save', () => toggleSaved(item));
            favorite.dataset.saveId = item.id;
            favorite.setAttribute('aria-label', '收藏：' + item.title);
            favorite.setAttribute('aria-pressed', String(saved.has(kind + ':' + item.id)));
            const source = data.sources.find(s => s.id === item.sources[0]);
            const link = sourceLink(source); link.textContent = '资料出处 ↗'; link.className = 'reading-source';
            actions.append(read, favorite, link); card.append(actions); return card;
        }));
        $('library-empty').hidden = visible.length > 0;
        const pager = $('library-pagination'); pager.replaceChildren(); pager.hidden = pages <= 1;
        for(let n=1;n<=pages;n++) {
            const b=button(String(n),'page-button',()=>{currentPage=n;render();$('result-status').focus({preventScroll:true});$('library-collection').scrollIntoView({block:'start',behavior:'instant'});});
            b.dataset.page=String(n);b.setAttribute('aria-label','第 '+n+' 页');if(n===currentPage)b.setAttribute('aria-current','page');pager.append(b);
        }
        if (focusId) {
            const target = [...document.querySelectorAll('[data-save-id]')].find(b => b.dataset.saveId === focusId);
            (target || $('only-saved')).focus({preventScroll:true});
        }
    }
    function reset() {
        selectedTheme = ''; selectedWork = ''; $('library-search').value = ''; $('only-saved').checked = false; currentPage = 1; $('library-sort').value = 'featured';
        document.querySelectorAll('[data-topic]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.topic === '')));
        render();
    }
    ['', ...new Set(items.map(item => item.theme))].forEach(theme => {
        const b = button(theme || '全部主题', 'topic-filter', () => {
            selectedTheme = theme; currentPage = 1;
            document.querySelectorAll('[data-topic]').forEach(node => node.setAttribute('aria-pressed', String(node === b)));
            render();
        });
        b.dataset.topic = theme; b.setAttribute('aria-pressed', String(!theme)); $('theme-filters').append(b);
    });
    $('library-search').addEventListener('input', () => {selectedWork='';render(true);});
    $('library-form').addEventListener('submit', event => event.preventDefault());
    $('only-saved').addEventListener('change', () => render(true));
    $('library-sort').addEventListener('change', () => render(true));
    $('library-reset').addEventListener('click', reset); $('empty-reset').addEventListener('click', reset);
    $('reader-close').addEventListener('click', () => $('reader-dialog').close());
    $('reader-dialog').addEventListener('close', () => {
        if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
        else {
            const card=[...document.querySelectorAll('.reading-card')].find(card=>card.dataset.entryId===selected?.id);
            (card?.querySelector('.reading-actions .btn')||$('library-search')).focus({preventScroll:true});
        }
    });
    $('reader-save').addEventListener('click', () => toggleSaved(selected));
    async function copyWithFallback(text, doneMessage, label) {
        try {
            await navigator.clipboard.writeText(text);
            $('copy-status').textContent = doneMessage; $('copy-fallback').hidden = true;
        } catch {
            $('copy-fallback').hidden = false;
            if ($('copy-fallback-label')) $('copy-fallback-label').textContent = label;
            $('copy-text').value = text; $('copy-text').focus(); $('copy-text').select();
            $('copy-status').textContent = '浏览器未允许直接复制。可复制下方已选中的文字。';
        }
    }
    $('reader-copy').addEventListener('click', () => {
        const source = data.sources.find(s => s.id === selected.sources[0]);
        const text = selected.quote + '\n——毛泽东' + (kind === 'poetry' ? '《' + selected.title + '》' : selected.work) + '（' + selected.season + '）节选\n资料：' + source.url;
        return copyWithFallback(text, '已复制节选、篇名与来源。', '节选与出处');
    });
    $('reader-copy-full')?.addEventListener('click', () => {
        const full = fullTexts[selected.id];
        if (!full) return;
        const text = [
            full.title, full.fullText, '', '——毛泽东《' + full.title + '》全篇', '',
            '全文核对来源：', ...full.references.map(ref => ref.title + ' ' + ref.url), '',
            '本站资料出处：', ...full.sources.map(s => s.title + ' ' + s.url)
        ].join('\n');
        return copyWithFallback(text, '已复制全篇、篇名与来源。', '全篇与出处');
    });
    function closeMenu() { $('nav-links').classList.remove('active'); $('mobile-menu-btn').setAttribute('aria-expanded', 'false'); }
    $('mobile-menu-btn').addEventListener('click', () => {
        const open = $('nav-links').classList.toggle('active'); $('mobile-menu-btn').setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('#nav-links a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    document.addEventListener('click', event => { if (!$('site-header').contains(event.target)) closeMenu(); });
    matchMedia('(max-width:1200px)').addEventListener('change', closeMenu);
    function applyTheme(value) {
        document.documentElement.dataset.theme = value;
        $('theme-toggle').setAttribute('aria-pressed', String(value === 'dark'));
        $('theme-toggle').querySelector('span').textContent = value === 'dark' ? '浅色' : '深色';
    }
    let theme = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    try { const value = localStorage.getItem('shanheTheme'); if (['dark','light'].includes(value)) theme = value; } catch {}
    applyTheme(theme);
    $('theme-toggle').addEventListener('click', () => {
        theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(theme);
        try { localStorage.setItem('shanheTheme', theme); } catch {}
    });
    window.addEventListener('storage', event => { if (event.key === key) { readSaved(); render(); if (selected) updateDialogSave(); } });
    const requestedWork=new URLSearchParams(location.search).get('work');
    if(kind==='quotes'&&requestedWork&&items.some(item=>normalize(item.work||'')===normalize(requestedWork))){selectedWork=requestedWork;$('library-search').value=requestedWork;}
    const deepLink = items.find(item => item.id === new URLSearchParams(location.search).get('entry'));
    if(deepLink){selectedWork='';$('library-search').value='';currentPage=Math.floor(items.indexOf(deepLink)/pageSize)+1;}
    readSaved(); render();
    if(deepLink){
        const card=[...document.querySelectorAll('.reading-card')].find(card=>card.dataset.entryId===deepLink.id);
        openReader(deepLink,card?.querySelector('.reading-actions .btn')||$('library-search'));
    }
})();
