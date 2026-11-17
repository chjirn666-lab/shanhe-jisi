/* 首页沿用文旅项目的信息结构；数据来自已核对的 knowledge.js。 */
(function () {
    'use strict';
    const data = globalThis.SHANHE;
    const $ = id => document.getElementById(id);
    const BOOKMARK_KEY = 'shanhe-jisi-v1';
    const READING_KEY = 'shanhe-reading-v1';
    const THEME_KEY = 'shanheTheme';
    const places = Object.fromEntries(data.events.map(e=>[e.id,e.city||e.place]));
    let selected = null, toastTimer;
    let state = {}, bookmarks = [], read = [];
    let storageOkay = true;
    function storedJSON(key,fallback){const value=localStorage.getItem(key);try{return value?JSON.parse(value):fallback;}catch{return fallback;}}
    function loadState() {
        try {
            const saved = storedJSON(BOOKMARK_KEY,{});
            state = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
            bookmarks = Array.isArray(state.bookmarks) ? [...new Set(state.bookmarks.filter(id => data.events.some(e => e.id === id)))] : [];
            const records = storedJSON(READING_KEY,[]);
            read = Array.isArray(records) ? [...new Set(records.filter(id => data.events.some(e => e.id === id)))] : [];
        } catch { storageOkay = false; }
    }
    function saveState() {
        try {
            // Preserve the long-scroll page's memorial message and signature.
            const latest = storedJSON(BOOKMARK_KEY,{});
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
        const event=data.events.find(e=>e.id===id);if(event)location.assign(event.localUrl);
    }
    function updatePhotoPreview(event){
        const photo=event.photos?.[0];if(!photo)return;
        $('map-preview-photo').src=photo.src;$('map-preview-photo').alt=photo.title+'；'+photo.context;
        $('map-preview-meta').textContent=event.year+' · '+event.label;
        $('map-preview-title').textContent=event.title;$('map-preview-text').replaceChildren(SHANHE_REFERENCES.fragment(event.lead||event.summary));
        $('map-preview-caption').textContent=photo.year+' · '+photo.context;
        $('map-preview-read').href=event.localUrl||'footprint-'+event.id+'.html';
    }
    function toggleBookmark(id) {
        const existed = bookmarks.includes(id);
        bookmarks = existed ? bookmarks.filter(x => x !== id) : [...bookmarks, id];
        const saved = saveState();
        refreshRecords();
        toast(saved ? (existed ? '已移除收藏' : '已加入阅读收藏') : '存储不可用，收藏仅在本次页面中有效。');
    }
    const cityList = [...new Set(Object.values(places))];
    (data.biographyPeriods||[]).forEach(period=>{
        const option=element('option',period.range+' · '+period.label);option.value=period.id;$('map-period').append(option);
    });
    function renderPeriod(){
        const period=(data.biographyPeriods||[]).find(p=>p.id===$('map-period').value);
        $('map-period-summary').hidden=!period;
        if(!period)return;
        $('map-period-range').textContent=period.range+' · '+period.label;
        $('map-period-title').textContent=period.title;
        $('map-period-copy').replaceChildren(...period.paragraphs.map(text=>{const p=element('p');p.append(SHANHE_REFERENCES.fragment(text));return p;}));
        $('map-period-links').replaceChildren(...period.eventIds.map(id=>{
            const event=data.events.find(e=>e.id===id);const a=element('a',event.year+' · '+places[id]+' · 图文详读 →');a.href=event.localUrl;return a;
        }));
    }
    cityList.forEach(city => {
        const option = element('option', city); option.value = city; $('map-city').append(option);
        const li = element('li');
        li.append(button(city, '', () => { $('map-city').value = city; $('map-search').value = ''; $('map-period').value=''; selected=null;renderMap(); $('home-map').scrollIntoView(); }));
        $('footer-places').append(li);
    });
    function filteredEvents() {
        const q = $('map-search').value.trim().toLowerCase(), city = $('map-city').value,period=$('map-period').value;
        return data.events.filter(e => (!period||e.biographyIds?.includes(period)) && (!city || places[e.id] === city) && (!q || [e.title,e.text,e.year,e.place,...e.terms].join(' ').toLowerCase().includes(q)));
    }
    const svgNS = 'http://www.w3.org/2000/svg';
    function svgElement(tag, attributes, text) {
        const el = document.createElementNS(svgNS, tag);
        Object.entries(attributes).forEach(([key,value]) => el.setAttribute(key, String(value)));
        if (text !== undefined) el.textContent = text;
        return el;
    }
    data.events.forEach((event,index) => {
        const group = svgElement('g', {class:'journey-marker',id:'marker-'+event.id,role:'link',tabindex:0,'aria-label':event.year+'年 '+places[event.id]+'：'+event.title});
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
        const columns=compact?2:3,width=compact?480:800,step=190;
        const height=88+(Math.ceil(data.events.length/columns)-1)*step+146;
        const points=data.events.map((_,index)=>{
            const row=Math.floor(index/columns),column=index%columns;
            const x=compact?120+(row%2?columns-1-column:column)*240:138+(row%2?columns-1-column:column)*262;
            return [x,88+row*step];
        });
        $('journey-map').setAttribute('viewBox','0 0 '+width+' '+height);
        data.events.forEach((event,index) => $('marker-'+event.id).setAttribute('transform','translate('+points[index].join(' ')+')'));
        const route=points.reduce((line,[x,y],index)=>{
            if(!index)return 'M'+x+' '+y;
            const [px,py]=points[index-1],bend=x>width/2?100:-100;
            return line+(py===y?' C'+(px+(x-px)/3)+' '+(y-42)+' '+(x-(x-px)/3)+' '+(y-42)+' '+x+' '+y:' C'+(x+bend)+' '+(py+65)+' '+(x+bend)+' '+(y-65)+' '+x+' '+y);
        },'');
        document.querySelectorAll('.journey-route,.journey-route-halo').forEach(p=>p.setAttribute('d',route));
        const picture=$('journey-map').querySelector('image');picture.setAttribute('width',String(width));picture.setAttribute('height',String(height));
        const signature=$('journey-map').querySelector('.map-signature');signature.setAttribute('x',String(width-30));signature.setAttribute('y',String(height-24));
        const caption=$('journey-map').querySelector('.map-caption');caption.setAttribute('x',compact?'25':'35');caption.setAttribute('y',compact?'30':'46');
    }
    compactMap.addEventListener('change',layoutMap);
    layoutMap();
    function renderMap() {
        renderPeriod();
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
            const row = element('a', undefined, 'map-result');row.href=event.localUrl;
            row.dataset.event = event.id;
            const year = element('span', undefined, 'result-year result-portrait');
            const photo=event.photos?.[0];
            if(photo){const image=element('img');image.src=photo.src;image.alt=photo.title+'（'+photo.year+'）';image.loading='lazy';image.width=76;image.height=100;year.append(image);}
            year.append(element('span',event.year,'result-photo-year'),element('small',read.includes(event.id)?'已读':'图文'));
            const copy = element('div');
            copy.append(element('strong',event.title),element('span',places[event.id]+' · '+event.label,'map-result-meta'),element('p',event.summary || event.text));
            row.append(year,copy,icon('fa-angle-right'));
            $('map-results').append(row);
        });
        $('map-photo-preview').hidden=!visible.length;
        if(visible.length)updatePhotoPreview(visible.find(e=>e.id===selected)||visible[0]);
    }
    function resetMap() { $('map-search').value = ''; $('map-city').value = ''; $('map-period').value=''; selected = null; renderMap(); }
    $('home-map-search-form').addEventListener('submit',event => { event.preventDefault(); renderMap(); });
    $('map-search').addEventListener('input',renderMap);
    $('map-city').addEventListener('change',renderMap);
    $('map-period').addEventListener('change',()=>{selected=null;renderMap();});
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

    [
        {title:'从家乡出发，读青年求索',text:'从韶山、长沙读到上海，沿着求学、结社与建党的线索，走近青年时期的学习和实践。',ids:['1893','1918','1921']},
        {title:'沿着征途，读探索与选择',text:'串联井冈山、遵义、延安和重庆，阅读根据地、长征、抗战与战后谈判的不同经历。',ids:['1927','1935','1937','1945']},
        {title:'翻开新篇，回望历史',text:'从开国大典、宪法起草到重返韶山，结合外交影像与诗词，继续阅读后半生的活动。',ids:['1949','1954','1959','1972','1976']}
    ].forEach((route,index)=>{const item=element('article',undefined,'path-step');const content=element('div',undefined,'step-content');content.append(element('h3',route.title),element('p',route.text));const links=element('div',undefined,'step-spots');route.ids.forEach(id=>{const e=data.events.find(e=>e.id===id);const a=element('a',e.year+' · '+e.label,'step-spot-link');a.href=e.localUrl;links.append(a);});content.append(links);item.append(element('span',String(index+1),'step-number'),content);$('route-steps').append(item);});

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
        renderMap();renderNotebook();
    }
    $('show-notebook').addEventListener('click',()=>{renderNotebook();$('notebook-dialog').showModal();});
    window.addEventListener('storage',event=>{if(event.key===BOOKMARK_KEY||event.key===READING_KEY){loadState();refreshRecords();}});
    window.addEventListener('pageshow',()=>{loadState();refreshRecords();});
    loadState();refreshRecords();
    if(!storageOkay)toast('浏览器存储不可用，当前仍可浏览，阅读记录仅在本次页面中有效。');
})();
