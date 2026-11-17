(function (root) {
  'use strict';
  const data = root.SHANHE;
  const events = new Map(data.events.map(event => [event.id, event]));
  const snow = data.poems.find(poem => poem.id === 'snow');

  function timeline(eventId, ...dates) {
    const event = events.get(eventId);
    return {
      kind: '足迹时间线',
      title: event.title,
      excerpt: event.timeline.filter(row => dates.includes(row.date))
        .map(row => `${row.date} · ${row.text}`).join('\n'),
      url: `${event.localUrl}#detail-timeline`
    };
  }

  function photograph(eventId, photoId) {
    const event = events.get(eventId);
    const photo = event.photos.find(item => item.id === photoId);
    const caption = photo.chapterContexts?.[eventId] || photo.context || photo.caption;
    return {
      kind: '档案照片',
      title: photo.title,
      excerpt: caption.startsWith(photo.year) ? caption : `${photo.year} · ${caption}`,
      url: photo.archive,
      image: photo.src
    };
  }

  const topics = [
    {
      id: 'youth',
      title: '从长沙求学到中共一大',
      question: '从长沙求学到参加中共一大，经历了哪些主要变化？1919年的新民学会合影能说明什么？',
      timelineQuestion: '按时间说明长沙求学、发起新民学会、主编《湘江评论》和参加中共一大的先后关系。',
      requiredYears: Object.freeze(['1918', '1921']),
      evidence: [
        timeline('1918', '1917年4月', '1918年4月', '1918年6—8月'),
        timeline('1921', '1919年7月', '1920年', '1921年7月'),
        photograph('1918', 'xinmin-society-1919')
      ]
    },
    {
      id: 'chongqing',
      title: '重庆谈判与《沁园春·雪》',
      question: '《沁园春·雪》的写作、重庆谈判与首次公开发表，先后顺序是什么？机场合影记录的是哪段经历？',
      timelineQuestion: '按时间说明《沁园春·雪》的写作、赴重庆谈判与首次公开发表的先后顺序，分别写明日期。',
      requiredYears: Object.freeze(['1936', '1945']),
      evidence: [
        {kind: '诗词背景', title: snow.title, excerpt: snow.text, url: 'poetry.html?entry=snow'},
        timeline('1945', '1945年8月28日', '1945年10月10日', '1945年11月14日'),
        photograph('1945', 'mao-chongqing-1945')
      ]
    }
  ];

  for (const topic of topics) {
    topic.evidence = Object.freeze(topic.evidence.map((entry, index) =>
      Object.freeze({...entry, id: `E${index + 1}`})));
    Object.freeze(topic);
  }

  function findTopic(id) {
    return topics.find(topic => topic.id === id);
  }

  function materials(topic) {
    return {
      mode: 'retrieval',
      answer: '按来源阅读同一组资料，逐项核对事件顺序和照片说明。',
      study: {topic: topic.id, evidence: topic.evidence}
    };
  }

  root.SHANHE_STUDY = Object.freeze({topics: Object.freeze(topics), findTopic, materials});
})(globalThis);
