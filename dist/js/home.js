/* 首页沿用文旅项目的信息结构；数据来自已核对的 knowledge.js。 */
(function () {
    'use strict';
    const data = globalThis.SHANHE;
    const $ = id => document.getElementById(id);
    const BOOKMARK_KEY = 'shanhe-jisi-v1';
    const READING_KEY = 'shanhe-reading-v1';
    const THEME_KEY = 'shanheTheme';
    const places = {'1893':'韶山','1921':'上海','1927':'井冈山','1935':'遵义','1949':'北京','1976':'北京'};
    const categories = [
        {id:'all', name:'全部足迹', icon:'fa-layer-group', ids:data.events.map(e => e.id)},
        {id:'youth', name:'青年求索', icon:'fa-seedling', ids:['1893','1921']},
        {id:'revolution', name:'革命征途', icon:'fa-flag', ids:['1927','1935']},
        {id:'founding', name:'开国新篇', icon:'fa-landmark', ids:['1949']},
        {id:'remembrance', name:'山河长忆', icon:'fa-feather-pointed', ids:['1976']},
        {id:'poetry', name:'诗词山河', icon:'fa-book-open', ids:data.poems.map(p => p.id)}
    ];
    let category = 'all', selected = null, toastTimer, storyTrigger = null;
    let state = {}, bookmarks = [], read = [];
    let storageOkay = true;
    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '{}');
            state = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
            bookmarks = Array.isArray(state.bookmarks) ? [...new Set(state.bookmarks.filter(id => data.events.some(e => e.id === id)))] : [];
            const records = JSON.parse(localStorage.getItem(READING_KEY) || '[]');
            read = Array.isArray(records) ? [...new Set(records.filter(id => data.events.some(e => e.id === id)))] : [];
        } catch { storageOkay = false; }
    }
    function saveState() {
        try {
            // Preserve the long-scroll page's memorial message and signature.
            const latest = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '{}');
            if (latest && typeof latest === 'object' && !Array.isArray(latest)) state = latest;
            state.bookmarks = bookmarks;
            localStorage.setItem(BOOKMARK_KEY, JSON.stringify(state));
            localStorage.setItem(READING_KEY, JSON.stringify(read));
            storageOkay = true;
            return true;
        } catch { storageOkay = false; return false; }
    }
    function element(tag, text, className) {
        const el = document.createElement(tag);
        if (text !== undefined) el.textContent = text;
        if (className) el.className = className;
        return el;
    }
    function icon(name) {
        const el = element('i', undefined, 'fas ' + name);
        el.setAttribute('aria-hidden', 'true');
        return el;
    }
    function button(text, className, action) {
        const el = element('button', text, className);
        el.type = 'button';
        el.addEventListener('click', action);
        return el;
    }
    function sourceLink(source) {
        const a = element('a', source.title + ' ↗');
        a.href = source.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        return a;
    }
    function toast(text) {
        $('home-toast').textContent = text;
        $('home-toast').classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => $('home-toast').classList.remove('visible'), 3000);
    }
    function closeMenu() {
        $('nav-links').classList.remove('active');
        $('mobile-menu-btn').setAttribute('aria-expanded', 'false');
        $('mobile-menu-btn').setAttribute('aria-label', '展开菜单');
    }
    $('mobile-menu-btn').addEventListener('click', () => {
        const open = $('nav-links').classList.toggle('active');
        $('mobile-menu-btn').setAttribute('aria-expanded', String(open));
        $('mobile-menu-btn').setAttribute('aria-label', open ? '收起菜单' : '展开菜单');
    });
    $('nav-links').querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('click', event => { if (!$('site-header').contains(event.target)) closeMenu(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    matchMedia('(max-width: 1200px)').addEventListener('change', closeMenu);
    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        $('theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
        $('theme-toggle').querySelector('i').className = 'fas ' + (theme === 'dark' ? 'fa-sun' : 'fa-moon');
        $('theme-toggle').querySelector('span').textContent = theme === 'dark' ? '浅色' : '深色';
    }
    let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try { const saved = localStorage.getItem(THEME_KEY); if (['light','dark'].includes(saved)) theme = saved; } catch {}
    applyTheme(theme);
    $('theme-toggle').addEventListener('click', () => {
        theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(theme);
        try { localStorage.setItem(THEME_KEY, theme); } catch { toast('当前主题已切换，浏览器未允许保存偏好。'); }
    });

    document.querySelectorAll('[data-close-dialog]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
    document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }));
    function showSources() { closeMenu(); $('sources-dialog').showModal(); }
    document.querySelectorAll('[data-open-sources]').forEach(b => b.addEventListener('click', showSources));
    for (const source of data.sources) {
        const item = element('li');
        item.append(sourceLink(source), element('small', source.publisher));
        $('source-list').append(item);
    }

    function showStory(id) {
        const event = data.events.find(e => e.id === id);
        if (!event) return;
        storyTrigger = document.activeElement;
        selected = id;
        $('story-meta').textContent = event.year + ' · ' + event.place;
        $('story-title').textContent = event.title;
        $('story-text').textContent = event.text;
        $('story-note').textContent = event.note;
        $('story-sources').replaceChildren();
        event.sources.forEach(sourceId => {
            const li = element('li');
            li.append(sourceLink(data.sources.find(s => s.id === sourceId)));
            $('story-sources').append(li);
        });
        $('story-long-scroll').href = 'long-scroll.html?event=' + encodeURIComponent(id) + '#journey';
        $('story-save-status').textContent = '';
        updateStoryButtons();
        document.querySelectorAll('.journey-marker').forEach(marker => marker.classList.toggle('selected', marker.id === 'marker-'+id));
        $('story-dialog').showModal();
    }
    $('story-dialog').addEventListener('close', () => {
        const target = storyTrigger?.isConnected ? storyTrigger : $('marker-'+selected);
        target?.focus({preventScroll:true});
    });
    function updateStoryButtons() {
        $('story-bookmark').setAttribute('aria-pressed', String(bookmarks.includes(selected)));
        $('story-bookmark').textContent = bookmarks.includes(selected) ? '已收藏 · 点击取消' : '加入收藏';
        $('mark-read').textContent = read.includes(selected) ? '✓ 已标记阅读' : '标记已读';
        $('mark-read').disabled = read.includes(selected);
    }
    function toggleBookmark(id) {
        const existed = bookmarks.includes(id);
        bookmarks = existed ? bookmarks.filter(x => x !== id) : [...bookmarks, id];
        const saved = saveState();
        refreshRecords();
        toast(saved ? (existed ? '已移除收藏' : '已加入阅读收藏') : '存储不可用，收藏仅在本次页面中有效。');
    }
    $('story-bookmark').addEventListener('click', () => toggleBookmark(selected));
    $('mark-read').addEventListener('click', () => {
        if (!selected || read.includes(selected)) return;
        read.push(selected);
        const saved = saveState();
        refreshRecords();
        $('story-save-status').textContent = saved ? '已保存本次阅读进度。' : '浏览器存储不可用，阅读记录仅在本次页面中有效。';
    });

    const cityList = [...new Set(Object.values(places))];
    cityList.forEach(city => {
        const option = element('option', city); option.value = city; $('map-city').append(option);
        const li = element('li');
        li.append(button(city, '', () => { $('map-city').value = city; $('map-search').value = ''; renderMap(); $('home-map').scrollIntoView(); }));
        $('footer-places').append(li);
    });
    function filteredEvents() {
        const q = $('map-search').value.trim().toLowerCase(), city = $('map-city').value;
        return data.events.filter(e => (!city || places[e.id] === city) && (!q || [e.title,e.text,e.year,e.place,...e.terms].join(' ').toLowerCase().includes(q)));
    }
    const svgNS = 'http://www.w3.org/2000/svg';
    function svgElement(tag, attributes, text) {
        const el = document.createElementNS(svgNS, tag);
        Object.entries(attributes).forEach(([key,value]) => el.setAttribute(key, String(value)));
        if (text !== undefined) el.textContent = text;
        return el;
    }
    const coordinates = [[138,132],[400,132],[662,132],[662,382],[400,382],[138,382]];
    data.events.forEach((event,index) => {
        const [x,y] = coordinates[index];
        const group = svgElement('g', {class:'journey-marker',id:'marker-'+event.id,transform:'translate('+x+' '+y+')',role:'button',tabindex:0,'aria-label':event.year+'年 '+places[event.id]+'：'+event.title});
        group.append(
            svgElement('circle',{class:'marker-disc',r:21}),
            svgElement('text',{class:'marker-number',y:1},String(index+1).padStart(2,'0')),
            svgElement('rect',{class:'marker-label',x:-90,y:29,width:180,height:84,rx:12}),
            svgElement('text',{class:'marker-year',y:61},event.year),
            svgElement('text',{class:'marker-place',y:88},places[event.id]),
            svgElement('text',{class:'marker-read',id:'marker-read-'+event.id,y:105},'')
        );
        group.addEventListener('click', () => { if (!group.classList.contains('is-muted')) showStory(event.id); });
        group.addEventListener('keydown', eventKey => {
            if (eventKey.key === 'Enter' || eventKey.key === ' ') { eventKey.preventDefault(); if (!group.classList.contains('is-muted')) showStory(event.id); }
        });
        $('map-markers').append(group);
    });
    const compactMap = matchMedia('(max-width: 600px)');
    function layoutMap() {
        const compact = compactMap.matches;
        const points = compact ? [[120,88],[360,88],[360,290],[120,290],[120,492],[360,492]] : coordinates;
        $('journey-map').setAttribute('viewBox', compact ? '0 0 480 660' : '0 0 800 560');
        data.events.forEach((event,index) => $('marker-'+event.id).setAttribute('transform','translate('+points[index].join(' ')+')'));
        const route = compact ? 'M120 88 C190 40 290 40 360 88 C465 155 465 230 360 290 S190 340 120 290 C15 355 15 425 120 492 S290 545 360 492' : 'M138 132 C220 80 320 80 400 132 S590 80 662 132 C754 218 754 296 662 382 S480 435 400 382 S220 435 138 382';
        document.querySelectorAll('.journey-route,.journey-route-halo').forEach(p=>p.setAttribute('d',route));
        const picture=$('journey-map').querySelector('image');picture.setAttribute('width',compact?'480':'800');picture.setAttribute('height',compact?'660':'560');
        const signature=$('journey-map').querySelector('.map-signature');signature.setAttribute('x',compact?'450':'760');signature.setAttribute('y',compact?'643':'514');
        const caption=$('journey-map').querySelector('.map-caption');caption.setAttribute('x',compact?'25':'35');caption.setAttribute('y',compact?'30':'46');
    }
    compactMap.addEventListener('change',layoutMap);
    layoutMap();
    function renderMap() {
        const visible = filteredEvents();
        $('map-results-title').textContent = ($('map-city').value || '全部地点') + ' · 足迹清单';
        $('map-status').textContent = '找到 ' + visible.length + ' / ' + data.events.length + ' 个历史节点';
        $('map-results').replaceChildren();
        data.events.forEach(event => {
            const matched = visible.some(e => e.id === event.id), group = $('marker-'+event.id);
            group.classList.toggle('is-muted', !matched);
            group.classList.toggle('selected', selected === event.id);
            group.setAttribute('tabindex', matched ? '0' : '-1');
            group.setAttribute('aria-disabled', String(!matched));
            $('marker-read-'+event.id).textContent = read.includes(event.id) ? '已读 ✓' : '';
        });
        if (!visible.length) {
            const empty = element('div', undefined, 'map-empty');
            empty.append(element('p','没有匹配的历史节点。试试“韶山”“遵义”或“1949”，也可以清除筛选。'), button('显示全部足迹','btn btn-outline',resetMap));
            $('map-results').append(empty);
        }
        visible.forEach(event => {
            const row = button(undefined, 'map-result'+(selected === event.id?' active':''), () => showStory(event.id));
            row.dataset.event = event.id;
            const year = element('span', event.year, 'result-year'); year.append(element('small',read.includes(event.id)?'已读':'历史节点'));
            const copy = element('div');
            copy.append(element('strong',event.title),element('span',places[event.id]+' · '+event.label,'map-result-meta'),element('p',event.summary || event.text));
            row.append(year,copy,icon('fa-angle-right'));
            $('map-results').append(row);
        });
    }
    function resetMap() { $('map-search').value = ''; $('map-city').value = ''; selected = null; renderMap(); }
    $('home-map-search-form').addEventListener('submit',event => { event.preventDefault(); renderMap(); });
    $('map-search').addEventListener('input',renderMap);
    $('map-city').addEventListener('change',renderMap);
    $('map-reset').addEventListener('click',resetMap);

    [
        {count:data.events.length,label:'历史节点',hint:'循着足迹读历史',href:'#home-map'},
        {count:cityList.length,label:'足迹地点',hint:'走近韶山与远方',href:'#home-map'},
        {count:data.poems.length,label:'诗词选读',hint:'读懂诗行里的山河',href:'long-scroll.html#poetry'},
        {count:data.sources.length,label:'资料来源',hint:'每段阅读都有出处',action:showSources}
    ].forEach(stat => {
        const item = stat.action ? button(undefined,'hero-stat',stat.action) : element('a',undefined,'hero-stat');
        if (stat.href) item.href = stat.href;
        item.append(element('strong',String(stat.count)),element('span',stat.label),element('small',stat.hint+' ↗'));
        $('home-stats').append(item);
    });

    categories.forEach(cat => {
        const li = element('li');
        const b = button(undefined,'category-button',()=>selectCategory(cat.id));
        b.dataset.category = cat.id;
        b.append(icon(cat.icon),element('span',cat.name),element('span',String(cat.ids.length),'category-count'));
        li.append(b); $('sidebar-categories').append(li);
    });
    function selectCategory(id) {
        category = id;
        document.querySelectorAll('[data-category]').forEach(b => {
            b.classList.toggle('active',b.dataset.category === id);
            b.setAttribute('aria-pressed',String(b.dataset.category === id));
        });
        selectTab('featured'); renderCards();
    }
    function renderCards() {
        $('story-cards').replaceChildren();
        const cat = categories.find(c => c.id === category);
        const poetry = category === 'poetry';
        const items = poetry ? data.poems.slice(0,6) : data.events.filter(e => cat.ids.includes(e.id));
        $('featured-note').textContent = cat.name+' · '+items.length+' 篇选读。'+(poetry?'阅读节选、创作背景与资料出处。':'点击阅读摘要，也可收藏并标记阅读进度。');
        items.forEach((item,index) => {
            const card = element('article',undefined,'spot-card');
            const href = 'long-scroll.html?poem='+encodeURIComponent(item.id)+'#poetry';
            const cover = poetry ? element('a',undefined,'spot-card-cover cover-book') : button(undefined,'spot-card-cover'+(index%2?' cover-book':''),()=>showStory(item.id));
            if(poetry)cover.href = href;
            cover.setAttribute('aria-label','阅读'+item.title);
            const img = element('img'); img.src = poetry || index%2 ? 'assets/reading.svg' : 'assets/landscape.svg'; img.alt='原创意境插画，非历史影像'; img.loading='lazy'; img.width=640; img.height=400;
            cover.append(img,element('span',poetry?'诗词选读':'历史选读','level-badge'),element('span',item.year,'cover-year'),element('span',poetry?'诗词里的山河':places[item.id]+' · '+item.label,'cover-subtitle'));
            const body=element('div',undefined,'spot-card-body'),head=element('div',undefined,'spot-card-header'),h3=element('h3');
            const title=poetry?element('a',item.title):button(item.title,'card-title',()=>showStory(item.id));if(poetry)title.href=href;
            h3.append(title);head.append(h3);
            if(!poetry && read.includes(item.id))head.append(element('span','✓ 已读','read-chip'));
            const tags=element('div',undefined,'spot-tags');tags.append(element('span',poetry?'创作背景':item.kicker,'tag'),element('span','附史料来源','tag'));
            const actions=element('div',undefined,'spot-card-footer');
            if(poetry){const a=element('a','品读诗词 →','btn btn-outline');a.href=href;actions.append(a);}else{
                const favorite=button(undefined,'icon-btn'+(bookmarks.includes(item.id)?' active':''),()=>toggleBookmark(item.id));favorite.dataset.bookmark=item.id;favorite.setAttribute('aria-label',(bookmarks.includes(item.id)?'取消收藏':'收藏')+item.title);favorite.setAttribute('aria-pressed',String(bookmarks.includes(item.id)));favorite.append(icon('fa-bookmark'));
                actions.append(button('阅读故事 →','btn btn-outline',()=>showStory(item.id)),favorite);
            }
            body.append(head,element('p',item.summary || item.text,'spot-summary'),tags,actions);card.append(cover,body);$('story-cards').append(card);
        });
    }
    function selectTab(id) {
        document.querySelectorAll('[data-tab]').forEach(b => {const active=b.dataset.tab===id;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
        ['featured','route'].forEach(panel=>{$(panel).hidden=panel!==id;$(panel).classList.toggle('active',panel===id);});
    }
    document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
    document.querySelector('.tab-nav').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const id=event.key==='Home'?'featured':event.key==='End'?'route':$('tab-featured').getAttribute('aria-selected')==='true'?'route':'featured';selectTab(id);$('tab-'+id).focus();});
    [
        {title:'从家乡出发，读青年求索',text:'从韶山的起点读到1921年，观察个人成长与时代变化如何相遇。',ids:['1893','1921']},
        {title:'沿着征途，读探索与选择',text:'把井冈山与遵义两个节点联系起来，结合资料原文理解道路探索。',ids:['1927','1935']},
        {title:'翻开新篇，回望历史',text:'阅读新中国成立与1976年的历史节点，结合完整生平了解历史贡献与曲折。',ids:['1949','1976']}
    ].forEach((route,index)=>{const item=element('article',undefined,'path-step');const content=element('div',undefined,'step-content');content.append(element('h3',route.title),element('p',route.text));const links=element('div',undefined,'step-spots');route.ids.forEach(id=>{const e=data.events.find(e=>e.id===id);links.append(button(e.year+' · '+e.label,'step-spot-link',()=>showStory(id)));});content.append(links);item.append(element('span',String(index+1),'step-number'),content);$('route-steps').append(item);});

    function renderNotebook() {
        const list=$('notebook-items');list.replaceChildren();
        const items=data.events.filter(e=>bookmarks.includes(e.id)||read.includes(e.id));
        if(!items.length){list.append(element('p','还没有阅读手记。打开一个历史节点，收藏或标记已读后会显示在这里。','notebook-empty'));return;}
        items.forEach(item=>{
            const row=element('div',undefined,'notebook-item'),copy=element('div');
            copy.append(element('strong',item.year+' · '+item.title),element('p',[bookmarks.includes(item.id)?'已收藏':'',read.includes(item.id)?'已读':''].filter(Boolean).join(' · ')));
            row.append(copy,button('继续阅读','',()=>{$('notebook-dialog').close();showStory(item.id);}));
            if(bookmarks.includes(item.id))row.append(button('取消收藏','',()=>toggleBookmark(item.id)));
            if(read.includes(item.id))row.append(button('撤销已读','',()=>{read=read.filter(id=>id!==item.id);saveState();refreshRecords();}));
            list.append(row);
        });
    }
    function refreshRecords() {
        $('favorite-count').textContent=String(bookmarks.length);$('read-count').textContent=String(read.length);$('total-count').textContent=String(data.events.length);
        $('reading-progress').max=data.events.length;$('reading-progress').value=read.length;
        $('progress-text').textContent=read.length?'已读 '+read.length+' / '+data.events.length+' 篇（'+Math.round(read.length/data.events.length*100)+'%），继续留下你的阅读足迹。':'还没有阅读记录，从一个历史节点开始吧。';
        if(selected)updateStoryButtons();renderCards();renderMap();renderNotebook();
    }
    $('show-notebook').addEventListener('click',()=>{renderNotebook();$('notebook-dialog').showModal();});
    window.addEventListener('storage',event=>{if(event.key===BOOKMARK_KEY||event.key===READING_KEY){loadState();refreshRecords();}});
    window.addEventListener('pageshow',()=>{loadState();refreshRecords();});
    loadState();selectCategory('all');refreshRecords();
    if(!storageOkay)toast('浏览器存储不可用，当前仍可浏览，阅读记录仅在本次页面中有效。');
})();
