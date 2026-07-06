/**
 * 대회 콘텐츠 생성 서비스 (Admin Content Service)
 * 
 * 시간표 / 공지사항 / 경기결과 이미지를 
 * AthleTime 다크 테마 + SNS 2사이즈(게시물 1080×1080, 스토리 1080×1920)로 생성합니다.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { classifyEvent, needsWind } = require('./eventClassifier');
const { analyzeResults, renderBadgeHtml, renderRecordBannerHtml } = require('./recordDetector');

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap');`;

// ─── SNS 사이즈 정의 ───────────────────────────
const SNS_SIZES = {
  post: { width: 1080, height: 1080, label: '게시물' },
  story: { width: 1080, height: 1920, label: '스토리' },
};

// ─── 공통 디자인 시스템 ─────────────────────────
const DESIGN = {
  bg: '#0a0a0a',
  bgCard: '#111111',
  bgSubtle: '#1a1a1a',
  border: '#222222',
  borderLight: '#333333',
  text: '#ffffff',
  textDim: '#aaaaaa',
  textMuted: '#666666',
  accent: '#4a8cff',
  accentDim: 'rgba(74,140,255,0.15)',
  gold: '#f5c842',
  silver: '#d0d0d0',
  bronze: '#cd7f32',
  danger: '#ff4444',
};

// ─── 공통 CSS 베이스 ────────────────────────────
function getBaseCSS(size) {
  const s = SNS_SIZES[size] || SNS_SIZES.post;
  return `
${FONT_IMPORT}
* { margin:0; padding:0; box-sizing:border-box; }
body { margin:0; padding:0; background:${DESIGN.bg}; }
.page-container {
  width:${s.width}px;
  height:${s.height}px;
  background:${DESIGN.bg};
  font-family:'Noto Sans KR','Inter',sans-serif;
  color:${DESIGN.text};
  display:flex;
  flex-direction:column;
  overflow:hidden;
  position:relative;
}

/* 오버플로우 방지 공통 */
.text-ellipsis {
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.text-clamp-2 {
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}

/* 브랜드 푸터 */
.brand-footer {
  display:flex; align-items:center; justify-content:center;
  gap:8px; padding:16px 0;
  opacity:0.3;
}
.brand-footer svg { width:16px; height:16px; }
.brand-footer span {
  font-size:12px; font-weight:700; letter-spacing:3px;
  text-transform:uppercase; color:${DESIGN.text};
}

/* 상단 헤더 바 */
.top-bar {
  display:flex; align-items:center; justify-content:space-between;
  padding:20px 40px 16px;
  border-bottom:1px solid ${DESIGN.border};
}
.top-bar-logo {
  display:flex; align-items:center; gap:6px;
  font-size:11px; font-weight:700; letter-spacing:3px;
  text-transform:uppercase; color:${DESIGN.textMuted};
}
.top-bar-logo svg { width:14px; height:14px; }
.top-bar-badge {
  display:inline-block; padding:3px 10px; border-radius:4px;
  font-size:10px; font-weight:700; letter-spacing:1px;
  text-transform:uppercase;
  background:${DESIGN.accentDim}; color:${DESIGN.accent};
}
`;
}

// ─── 브랜드 푸터 HTML ───────────────────────────
const BRAND_FOOTER_HTML = `
<div class="brand-footer">
  <svg fill="none" stroke="${DESIGN.text}" viewBox="0 0 24 24" stroke-width="2.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
  <span>AthleTime</span>
</div>`;

const TOP_BAR_HTML = (badge = '') => `
<div class="top-bar">
  <div class="top-bar-logo">
    <svg fill="none" stroke="${DESIGN.textMuted}" viewBox="0 0 24 24" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    AthleTime
  </div>
  ${badge ? `<span class="top-bar-badge">${esc(badge)}</span>` : ''}
</div>`;

// ════════════════════════════════════════════════
//  시간표 (Schedule)
// ════════════════════════════════════════════════

function renderScheduleHtml(data, size = 'post') {
  const {
    competitionName = '',
    day = 1,
    date = '',
    dayLabel = '',
    trackEvents = [],
    fieldEvents = [],
    notes = [],
    layout = 'split'
  } = data;

  const s = SNS_SIZES[size] || SNS_SIZES.post;
  const isStory = size === 'story';
  const dayStr = dayLabel || `제${day}일 경기`;

  // 글자 크기 — 스토리는 좀 더 여유로운 공간이 있으므로 유지, 게시물은 약간 키움
  const fontSize = {
    title: isStory ? 36 : 32,
    comp: isStory ? 14 : 13,
    thHead: isStory ? 13 : 12,
    td: isStory ? 13 : 12,
    sectionTitle: isStory ? 14 : 13,
    note: isStory ? 12 : 11,
    meta: isStory ? 14 : 13,
  };

  // 행 HTML 생성 (오버플로우 방지 포함)
  const trackRowsHtml = (events) => events.map(e => {
    if (e.type === 'break') {
      return `<tr class="break-row"><td colspan="5">BREAK</td></tr>`;
    }
    return `<tr>
      <td class="td-time">${esc(e.time || '')}</td>
      <td class="td-event text-ellipsis">${esc(e.event || e.name || '')}</td>
      <td class="td-division text-ellipsis">${esc(e.division || '')}</td>
      <td class="td-round text-ellipsis">${esc(e.round || '')}</td>
      <td class="td-page">${esc(e.page || '')}</td>
    </tr>`;
  }).join('\n');

  // 트랙/필드를 2열로 분리
  const midTrack = Math.ceil(trackEvents.length / 2);
  const trackLeft = trackEvents.slice(0, midTrack);
  const trackRight = trackEvents.slice(midTrack);
  const midField = Math.ceil(fieldEvents.length / 2);
  const fieldLeft = fieldEvents.slice(0, midField);
  const fieldRight = fieldEvents.slice(midField);

  const isCombined = layout === 'combined';

  // 테이블 섹션 생성
  const makeTableHtml = (title, leftEvents, rightEvents) => `
    <div class="section">
      <div class="section-header">
        <span class="section-title">${title}</span>
        <span class="section-count">${leftEvents.concat(rightEvents).filter(e => e.type !== 'break').length} Events</span>
      </div>
      <div class="table-dual">
        <div class="table-half">
          <table>
            <thead><tr>
              <th class="th-time">시간</th>
              <th class="th-event">종목</th>
              <th class="th-div">부별</th>
              <th class="th-round">라운드</th>
              <th class="th-page">P</th>
            </tr></thead>
            <tbody>${trackRowsHtml(leftEvents)}</tbody>
          </table>
        </div>
        <div class="table-divider"></div>
        <div class="table-half">
          <table>
            <thead><tr>
              <th class="th-time">시간</th>
              <th class="th-event">종목</th>
              <th class="th-div">부별</th>
              <th class="th-round">라운드</th>
              <th class="th-page">P</th>
            </tr></thead>
            <tbody>${trackRowsHtml(rightEvents)}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  let bodyHtml;
  if (isCombined) {
    bodyHtml = `
      <div class="section">
        <div class="section-header-combined">
          <span class="section-title-half">트 랙</span>
          <span class="section-title-half">필 드</span>
        </div>
        <div class="table-dual">
          <div class="table-half">
            <table>
              <thead><tr><th class="th-time">시간</th><th class="th-event">종목</th><th class="th-div">부별</th><th class="th-round">라운드</th><th class="th-page">P</th></tr></thead>
              <tbody>${trackRowsHtml(trackEvents)}</tbody>
            </table>
          </div>
          <div class="table-divider"></div>
          <div class="table-half">
            <table>
              <thead><tr><th class="th-time">시간</th><th class="th-event">종목</th><th class="th-div">부별</th><th class="th-round">라운드</th><th class="th-page">P</th></tr></thead>
              <tbody>${trackRowsHtml(fieldEvents)}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  } else {
    bodyHtml = '';
    if (trackEvents.length > 0) {
      bodyHtml += makeTableHtml('TRACK', trackLeft, trackRight);
    }
    if (fieldEvents.length > 0) {
      bodyHtml += makeTableHtml('FIELD', fieldLeft, fieldRight);
    }
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${s.width}">
<style>
${getBaseCSS(size)}

.schedule-page {
  width:${s.width}px;
  ${isStory ? `min-height:${s.height}px;` : `height:${s.height}px;`}
  background:${DESIGN.bg};
  font-family:'Noto Sans KR','Inter',sans-serif;
  color:${DESIGN.text};
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

/* 타이틀 영역 */
.header-area {
  padding:${isStory ? '32px 40px 24px' : '24px 40px 20px'};
}
.comp-name {
  font-size:${fontSize.comp}px; font-weight:600; color:${DESIGN.textMuted};
  letter-spacing:1px; margin-bottom:8px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.page-title {
  font-size:${fontSize.title}px; font-weight:900; color:${DESIGN.text};
  letter-spacing:6px; margin-bottom:12px;
}
.meta-row {
  display:flex; justify-content:space-between; align-items:center;
}
.meta-day {
  font-size:${fontSize.meta}px; font-weight:700; color:${DESIGN.accent};
}
.meta-date {
  font-size:${fontSize.meta}px; font-weight:500; color:${DESIGN.textDim};
}
.title-divider {
  height:2px; background:linear-gradient(90deg, ${DESIGN.accent}, transparent);
  margin:0 40px;
}

/* 테이블 영역 */
.body-area {
  flex:1;
  padding:${isStory ? '16px 40px' : '12px 40px'};
  overflow:hidden;
}
.section {
  margin-bottom:${isStory ? '16px' : '10px'};
  border:1px solid ${DESIGN.border};
  border-radius:6px;
  overflow:hidden;
}
.section-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:${isStory ? '10px 16px' : '8px 14px'};
  background:${DESIGN.bgSubtle};
  border-bottom:1px solid ${DESIGN.border};
}
.section-header-combined {
  display:flex;
  border-bottom:1px solid ${DESIGN.border};
  background:${DESIGN.bgSubtle};
}
.section-title {
  font-size:${fontSize.sectionTitle}px; font-weight:800;
  letter-spacing:4px; color:${DESIGN.accent};
  text-transform:uppercase;
}
.section-title-half {
  flex:1; text-align:center;
  padding:${isStory ? '10px 0' : '8px 0'};
  font-size:${fontSize.sectionTitle}px; font-weight:800;
  letter-spacing:4px; color:${DESIGN.accent};
  text-transform:uppercase;
}
.section-title-half + .section-title-half {
  border-left:1px solid ${DESIGN.border};
}
.section-count {
  font-size:10px; font-weight:600; color:${DESIGN.textMuted};
  letter-spacing:1px; text-transform:uppercase;
}

.table-dual { display:flex; }
.table-half { flex:1; overflow:hidden; }
.table-divider { width:1px; background:${DESIGN.border}; }

table { width:100%; border-collapse:collapse; table-layout:fixed; }
thead th {
  padding:${isStory ? '8px 8px' : '6px 6px'};
  font-size:${fontSize.thHead - 1}px; font-weight:700;
  color:${DESIGN.textMuted};
  border-bottom:1px solid ${DESIGN.border};
  text-align:center; letter-spacing:1px;
  text-transform:uppercase;
  background:${DESIGN.bgCard};
}
tbody td {
  padding:${isStory ? '6px 8px' : '5px 6px'};
  border-bottom:1px solid ${DESIGN.border};
  color:${DESIGN.textDim};
  font-size:${fontSize.td}px; font-weight:400;
  vertical-align:middle;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.th-time, .td-time { width:54px; text-align:center; }
.td-time { font-weight:600; color:${DESIGN.text}; white-space:nowrap; }
.th-event, .td-event { width:auto; }
.td-event { font-weight:500; color:${DESIGN.text}; }
.th-div, .td-division { width:auto; text-align:center; }
.th-round, .td-round { width:auto; text-align:center; }
.th-page, .td-page { width:28px; text-align:center; }

.break-row td {
  text-align:center; font-weight:700; color:${DESIGN.textMuted};
  letter-spacing:6px; padding:${isStory ? '10px 0' : '8px 0'};
  background:${DESIGN.bgSubtle};
  border-bottom:1px solid ${DESIGN.border};
  font-size:11px;
}

/* 비고 */
.notes-area {
  padding:8px 40px;
}
.note {
  font-size:${fontSize.note}px; color:${DESIGN.danger}; font-weight:600; line-height:1.8;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}

/* 푸터 */
.footer-area {
  padding:8px 40px 16px;
  margin-top:auto;
}
</style>
</head>
<body>
<div class="schedule-page">
  ${TOP_BAR_HTML('SCHEDULE')}
  <div class="header-area">
    ${competitionName ? `<div class="comp-name">${esc(competitionName)}</div>` : ''}
    <div class="page-title">경기 시간표</div>
    <div class="meta-row">
      <span class="meta-day">${esc(dayStr)}</span>
      <span class="meta-date">${esc(date)}</span>
    </div>
  </div>
  <div class="title-divider"></div>
  <div class="body-area">
    ${bodyHtml}
  </div>
  ${notes.length > 0 ? `<div class="notes-area">${notes.map(n => `<div class="note">${esc(n)}</div>`).join('')}</div>` : ''}
  <div class="footer-area">
    ${BRAND_FOOTER_HTML}
  </div>
</div>
</body>
</html>`;
}


// ════════════════════════════════════════════════
//  공지사항 (Notice)
// ════════════════════════════════════════════════

function renderNoticeHtml(data, size = 'post') {
  const {
    competitionName = '',
    title = '공지사항',
    date = '',
    items = [],
    category = 'general'
  } = data;

  const s = SNS_SIZES[size] || SNS_SIZES.post;
  const isStory = size === 'story';

  const categoryStyles = {
    general: { badge: DESIGN.textMuted, label: '일반' },
    urgent: { badge: DESIGN.danger, label: '긴급' },
    schedule: { badge: DESIGN.accent, label: '일정' },
    result: { badge: DESIGN.textMuted, label: '결과' },
  };
  const cat = categoryStyles[category] || categoryStyles.general;

  const fontSize = {
    title: isStory ? 34 : 30,
    comp: isStory ? 14 : 13,
    num: isStory ? 28 : 24,
    itemTitle: isStory ? 18 : 16,
    itemDesc: isStory ? 14 : 13,
    itemDetail: isStory ? 13 : 12,
    date: isStory ? 13 : 12,
  };

  const itemsHtml = items.map((item, idx) => `
    <div class="notice-item">
      <div class="notice-num">${String(idx + 1).padStart(2, '0')}</div>
      <div class="notice-body">
        <div class="notice-item-title text-clamp-2">${esc(item.title || '')}</div>
        ${item.description ? `<div class="notice-item-desc text-clamp-2">${esc(item.description)}</div>` : ''}
        ${item.details && item.details.length ? `<ul class="notice-details">${item.details.map(d => `<li class="text-ellipsis">${esc(d)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${s.width}">
<style>
${getBaseCSS(size)}

.notice-page {
  width:${s.width}px;
  ${isStory ? `min-height:${s.height}px;` : `height:${s.height}px;`}
  background:${DESIGN.bg};
  font-family:'Noto Sans KR','Inter',sans-serif;
  color:${DESIGN.text};
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

.header-area {
  padding:${isStory ? '32px 48px 20px' : '24px 40px 16px'};
}
.comp-name {
  font-size:${fontSize.comp}px; font-weight:600; color:${DESIGN.textMuted};
  letter-spacing:1px; margin-bottom:10px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.category-badge {
  display:inline-block; padding:3px 12px; border-radius:4px;
  font-size:11px; font-weight:700; letter-spacing:1px;
  text-transform:uppercase; margin-bottom:10px;
  background:${cat.badge}20; color:${cat.badge};
  border:1px solid ${cat.badge}40;
}
.notice-title {
  font-size:${fontSize.title}px; font-weight:900; color:${DESIGN.text};
  letter-spacing:2px; margin-bottom:8px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.notice-date {
  font-size:${fontSize.date}px; font-weight:400; color:${DESIGN.textMuted};
}
.title-divider {
  height:2px; background:linear-gradient(90deg, ${DESIGN.accent}, transparent);
  margin:0 ${isStory ? '48px' : '40px'};
}

.body-area {
  flex:1;
  padding:${isStory ? '20px 48px' : '16px 40px'};
  overflow:hidden;
}
.notice-item {
  display:flex; gap:${isStory ? '20px' : '16px'};
  padding:${isStory ? '18px 0' : '14px 0'};
  border-bottom:1px solid ${DESIGN.border};
}
.notice-item:last-child { border-bottom:none; }
.notice-num {
  font-size:${fontSize.num}px; font-weight:900;
  color:${DESIGN.borderLight};
  min-width:${isStory ? '48px' : '40px'};
  line-height:1.2;
}
.notice-body { flex:1; min-width:0; }
.notice-item-title {
  font-size:${fontSize.itemTitle}px; font-weight:700; color:${DESIGN.text};
  line-height:1.5; margin-bottom:6px;
}
.notice-item-desc {
  font-size:${fontSize.itemDesc}px; font-weight:400; color:${DESIGN.textDim};
  line-height:1.6; margin-bottom:8px;
}
.notice-details { list-style:none; padding:0; }
.notice-details li {
  font-size:${fontSize.itemDetail}px; color:${DESIGN.textMuted}; line-height:1.8;
  padding-left:16px; position:relative;
  max-width:100%;
}
.notice-details li::before {
  content:'·'; position:absolute; left:4px; color:${DESIGN.borderLight};
  font-weight:900;
}

.footer-area {
  padding:8px 40px 16px;
  margin-top:auto;
}
</style>
</head>
<body>
<div class="notice-page">
  ${TOP_BAR_HTML('NOTICE')}
  <div class="header-area">
    ${competitionName ? `<div class="comp-name">${esc(competitionName)}</div>` : ''}
    ${category !== 'general' ? `<span class="category-badge">${esc(cat.label)}</span>` : ''}
    <div class="notice-title">${esc(title)}</div>
    ${date ? `<div class="notice-date">${esc(date)}</div>` : ''}
  </div>
  <div class="title-divider"></div>
  <div class="body-area">${itemsHtml}</div>
  <div class="footer-area">
    ${BRAND_FOOTER_HTML}
  </div>
</div>
</body>
</html>`;
}


// ════════════════════════════════════════════════
//  경기결과 (Result)
// ════════════════════════════════════════════════

function renderResultHtml(data, size = 'post') {
  const {
    competitionName = '',
    event = '',
    division = '',
    round = '',
    date = '',
    venue = '',
    wind = '',
    results = []
  } = data;

  const s = SNS_SIZES[size] || SNS_SIZES.post;
  const isStory = size === 'story';

  // 종목 타입 분류
  const eventType = classifyEvent(event || data.fullEvent || '');
  const showWind = wind && needsWind(eventType);

  // 대기록 감지
  const recordAnalysis = analyzeResults(results);

  const fontSize = {
    event: isStory ? 36 : 32,
    comp: isStory ? 14 : 13,
    division: isStory ? 16 : 14,
    round: isStory ? 15 : 13,
    meta: isStory ? 13 : 12,
    thHead: isStory ? 12 : 11,
    td: isStory ? 15 : 14,
    rank: isStory ? 16 : 14,
    wind: isStory ? 12 : 11,
  };

  // 종목 타입별 기록 컬럼 헤더
  const recordHeader = eventType.recordLabel || '기록';

  // 종목 타입별 테이블 컬럼 구성
  let tableHeaders, tableRowFn;

  if (eventType.type === 'field' && (eventType.subType === 'throw' || eventType.subType === 'distance')) {
    // 필드(던지기/멀리뛰기): 순위, 선수명, 소속, 기록(m), 비고
    tableHeaders = `<th class="rank-cell">순위</th><th>선수명</th><th>소속</th><th class="record-cell">기록 (m)</th><th class="note-cell">비고</th>`;
    tableRowFn = (r, idx) => {
      const rankClass = r.rank === 1 ? 'rank-gold' : r.rank === 2 ? 'rank-silver' : r.rank === 3 ? 'rank-bronze' : '';
      const badges = recordAnalysis.badges.get(idx) || [];
      const badgeHtml = badges.map(b => renderBadgeHtml(b, 'small')).join('');
      return `<tr class="${rankClass}">
        <td class="rank-cell"><div class="rank-num">${r.rank || idx + 1}</div></td>
        <td class="name-cell text-ellipsis"><span class="athlete-name">${esc(r.name)}</span></td>
        <td class="aff-cell text-ellipsis">${esc(r.affiliation || '')}</td>
        <td class="record-cell">${esc(r.record || '')}${badgeHtml}</td>
        <td class="note-cell text-ellipsis">${esc(r.note || '')}</td>
      </tr>`;
    };
  } else if (eventType.type === 'field' && eventType.subType === 'height') {
    // 필드(높이뛰기/장대높이뛰기): 순위, 선수명, 소속, 기록(m), 비고
    tableHeaders = `<th class="rank-cell">순위</th><th>선수명</th><th>소속</th><th class="record-cell">기록 (m)</th><th class="note-cell">비고</th>`;
    tableRowFn = (r, idx) => {
      const rankClass = r.rank === 1 ? 'rank-gold' : r.rank === 2 ? 'rank-silver' : r.rank === 3 ? 'rank-bronze' : '';
      const badges = recordAnalysis.badges.get(idx) || [];
      const badgeHtml = badges.map(b => renderBadgeHtml(b, 'small')).join('');
      return `<tr class="${rankClass}">
        <td class="rank-cell"><div class="rank-num">${r.rank || idx + 1}</div></td>
        <td class="name-cell text-ellipsis"><span class="athlete-name">${esc(r.name)}</span></td>
        <td class="aff-cell text-ellipsis">${esc(r.affiliation || '')}</td>
        <td class="record-cell">${esc(r.record || '')}${badgeHtml}</td>
        <td class="note-cell text-ellipsis">${esc(r.note || '')}</td>
      </tr>`;
    };
  } else if (eventType.type === 'road') {
    // 도로(마라톤/경보): 순위, 선수명, 소속, 기록(시간), 비고
    tableHeaders = `<th class="rank-cell">순위</th><th>선수명</th><th>소속</th><th class="record-cell">기록</th><th class="note-cell">비고</th>`;
    tableRowFn = (r, idx) => {
      const rankClass = r.rank === 1 ? 'rank-gold' : r.rank === 2 ? 'rank-silver' : r.rank === 3 ? 'rank-bronze' : '';
      const badges = recordAnalysis.badges.get(idx) || [];
      const badgeHtml = badges.map(b => renderBadgeHtml(b, 'small')).join('');
      return `<tr class="${rankClass}">
        <td class="rank-cell"><div class="rank-num">${r.rank || idx + 1}</div></td>
        <td class="name-cell text-ellipsis"><span class="athlete-name">${esc(r.name)}</span></td>
        <td class="aff-cell text-ellipsis">${esc(r.affiliation || '')}</td>
        <td class="record-cell">${esc(r.record || '')}${badgeHtml}</td>
        <td class="note-cell text-ellipsis">${esc(r.note || '')}</td>
      </tr>`;
    };
  } else if (eventType.type === 'combined') {
    // 복합(10종/7종): 순위, 선수명, 소속, 총점, 비고
    tableHeaders = `<th class="rank-cell">순위</th><th>선수명</th><th>소속</th><th class="record-cell">총점</th><th class="note-cell">비고</th>`;
    tableRowFn = (r, idx) => {
      const rankClass = r.rank === 1 ? 'rank-gold' : r.rank === 2 ? 'rank-silver' : r.rank === 3 ? 'rank-bronze' : '';
      const badges = recordAnalysis.badges.get(idx) || [];
      const badgeHtml = badges.map(b => renderBadgeHtml(b, 'small')).join('');
      return `<tr class="${rankClass}">
        <td class="rank-cell"><div class="rank-num">${r.rank || idx + 1}</div></td>
        <td class="name-cell text-ellipsis"><span class="athlete-name">${esc(r.name)}</span></td>
        <td class="aff-cell text-ellipsis">${esc(r.affiliation || '')}</td>
        <td class="record-cell">${esc(r.record || '')}${badgeHtml}</td>
        <td class="note-cell text-ellipsis">${esc(r.note || '')}</td>
      </tr>`;
    };
  } else {
    // 트랙(기본): 순위, 선수명, 소속, 기록, 비고
    tableHeaders = `<th class="rank-cell">순위</th><th>선수명</th><th>소속</th><th class="record-cell">기록</th><th class="note-cell">비고</th>`;
    tableRowFn = (r, idx) => {
      const rankClass = r.rank === 1 ? 'rank-gold' : r.rank === 2 ? 'rank-silver' : r.rank === 3 ? 'rank-bronze' : '';
      const badges = recordAnalysis.badges.get(idx) || [];
      const badgeHtml = badges.map(b => renderBadgeHtml(b, 'small')).join('');
      return `<tr class="${rankClass}">
        <td class="rank-cell"><div class="rank-num">${r.rank || idx + 1}</div></td>
        <td class="name-cell text-ellipsis">
          <span class="athlete-name">${esc(r.name)}</span>
          ${r.bib ? `<span class="bib">${esc(r.bib)}</span>` : ''}
        </td>
        <td class="aff-cell text-ellipsis">${esc(r.affiliation || '')}</td>
        <td class="record-cell">${esc(r.record || '')}${badgeHtml}</td>
        <td class="note-cell text-ellipsis">${esc(r.note || '')}</td>
      </tr>`;
    };
  }

  const resultsHtml = results.map((r, idx) => tableRowFn(r, idx)).join('\n');

  // 대기록 배너 (최상위 기록이 있을 때만)
  const recordBannerHtml = recordAnalysis.topRecord 
    ? renderRecordBannerHtml(recordAnalysis.topRecord) 
    : '';

  // 종목 타입별 스타일 테마 색상
  const typeThemes = {
    track: { accent: DESIGN.accent, label: 'TRACK', icon: '🏃' },
    field: { accent: '#22C55E', label: 'FIELD', icon: '🏋' },
    road: { accent: '#F59E0B', label: 'ROAD', icon: '🛣' },
    combined: { accent: '#A855F7', label: 'MULTI', icon: '🏅' },
  };
  const typeTheme = typeThemes[eventType.type] || typeThemes.track;

  // 종목 타입별 아이콘
  const typeLabel = typeTheme.label;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${s.width}">
<style>
${getBaseCSS(size)}

.result-page {
  width:${s.width}px;
  ${isStory ? `min-height:${s.height}px;` : `height:${s.height}px;`}
  background:${DESIGN.bg};
  font-family:'Noto Sans KR','Inter',sans-serif;
  color:${DESIGN.text};
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

.header-area {
  padding:${isStory ? '32px 48px 20px' : '24px 40px 16px'};
}
.comp-name {
  font-size:${fontSize.comp}px; font-weight:600; color:${DESIGN.textMuted};
  letter-spacing:1px; margin-bottom:8px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.event-row {
  display:flex; align-items:baseline; gap:16px; margin-bottom:8px;
  flex-wrap:wrap;
}
.event-name {
  font-size:${fontSize.event}px; font-weight:900; color:${DESIGN.text};
  letter-spacing:1px;
}
.event-division {
  font-size:${fontSize.division}px; font-weight:600; color:${DESIGN.textDim};
}
.event-round {
  font-size:${fontSize.round}px; font-weight:500; color:${DESIGN.textMuted};
}
.meta-row {
  display:flex; gap:16px; font-size:${fontSize.meta}px; color:${DESIGN.textMuted};
  margin-bottom:6px;
}
.wind-badge {
  display:inline-block; padding:3px 10px; border-radius:4px;
  font-size:${fontSize.wind}px; font-weight:700;
  color:${DESIGN.accent}; background:${DESIGN.accentDim};
  letter-spacing:0.5px;
}
.title-divider {
  height:2px; background:linear-gradient(90deg, ${DESIGN.accent}, transparent);
  margin:0 ${isStory ? '48px' : '40px'};
}

.body-area {
  flex:1;
  padding:${isStory ? '16px 48px' : '12px 40px'};
  overflow:hidden;
}

table.result-table {
  width:100%; border-collapse:collapse;
  table-layout:fixed;
}
.result-table thead th {
  padding:${isStory ? '12px 14px' : '10px 12px'};
  font-size:${fontSize.thHead}px; font-weight:700;
  color:${DESIGN.textMuted}; letter-spacing:1px;
  text-transform:uppercase;
  border-bottom:1px solid ${DESIGN.borderLight};
  text-align:left;
}
.result-table tbody td {
  padding:${isStory ? '12px 14px' : '10px 12px'};
  border-bottom:1px solid ${DESIGN.border};
  vertical-align:middle;
  font-size:${fontSize.td}px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}

.rank-cell { width:56px; text-align:center; }
.rank-num {
  display:inline-flex; align-items:center; justify-content:center;
  width:${isStory ? '36px' : '32px'}; height:${isStory ? '36px' : '32px'};
  border-radius:50%;
  font-size:${fontSize.rank}px; font-weight:800;
  color:${DESIGN.textMuted}; background:${DESIGN.bgSubtle};
}
.rank-gold .rank-num { background:${DESIGN.gold}; color:#000; }
.rank-silver .rank-num { background:${DESIGN.silver}; color:#000; }
.rank-bronze .rank-num { background:${DESIGN.bronze}; color:#fff; }
.name-cell { font-weight:600; }
.athlete-name { color:${DESIGN.text}; }
.bib { font-size:11px; color:${DESIGN.textMuted}; margin-left:8px; }
.aff-cell { color:${DESIGN.textDim}; }
.record-cell { font-weight:700; font-variant-numeric:tabular-nums; color:${DESIGN.text}; width:100px; }
.note-cell { font-size:12px; color:${DESIGN.textMuted}; }

.footer-area {
  padding:8px 40px 16px;
  margin-top:auto;
}
</style>
</head>
<body>
<div class="result-page">
  ${TOP_BAR_HTML(typeLabel)}
  <div class="header-area">
    ${competitionName ? `<div class="comp-name">${esc(competitionName)}</div>` : ''}
    <div class="event-row">
      <span class="event-name">${esc(event)}</span>
      ${division ? `<span class="event-division">${esc(division)}</span>` : ''}
      ${round ? `<span class="event-round">${esc(round)}</span>` : ''}
    </div>
    <div class="meta-row">
      ${date ? `<span>${esc(date)}</span>` : ''}
      ${venue ? `<span>${esc(venue)}</span>` : ''}
    </div>
    ${wind && showWind ? `<span class="wind-badge">WIND ${esc(wind)} m/s</span>` : ''}
    ${recordBannerHtml}
  </div>
  <div class="title-divider" style="background:linear-gradient(90deg, ${typeTheme.accent}, transparent);"></div>
  <div class="body-area">
    <table class="result-table">
      <thead>
        <tr>
          ${tableHeaders}
        </tr>
      </thead>
      <tbody>${resultsHtml}</tbody>
    </table>
  </div>
  <div class="footer-area">
    ${BRAND_FOOTER_HTML}
  </div>
</div>
</body>
</html>`;
}


// ─── 헬퍼 ─────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getCategoryLabel(cat) {
  const map = { general: '일반', urgent: '긴급', schedule: '일정', result: '결과' };
  return map[cat] || cat;
}

let browser = null;
async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  return browser;
}

/**
 * HTML을 PNG로 캡처 (SNS 사이즈 지원)
 */
async function captureHtmlToPng(html, options = {}) {
  const br = await getBrowser();
  const page = await br.newPage();
  try {
    const size = options.size || 'post';
    const snsSize = SNS_SIZES[size] || SNS_SIZES.post;
    
    await page.setViewport({ 
      width: snsSize.width, 
      height: snsSize.height, 
      deviceScaleFactor: 2 
    });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 500));

    const el = await page.$(options.selector || '.schedule-page, .notice-page, .result-page');
    if (!el) throw new Error('Render target not found');
    const screenshot = await el.screenshot({ type: 'png' });
    const buffer = Buffer.from(screenshot);
    return buffer;
  } finally {
    await page.close();
  }
}

// ─── 공개 API ──────────────────────────────────

async function generateSchedule(data) {
  const size = data.snsSize || 'post';
  const results = {};
  
  // 요청된 사이즈 또는 'both'일 때 두 개 다 생성
  const sizes = size === 'both' ? ['post', 'story'] : [size];
  
  for (const sz of sizes) {
    const html = renderScheduleHtml(data, sz);
    const buffer = await captureHtmlToPng(html, { selector: '.schedule-page', size: sz });
    const filename = `schedule_day${data.day || 1}_${sz}_${Date.now()}.png`;
    results[sz] = { imageBuffer: buffer, html, filename };
  }
  
  // 단일 사이즈 요청이면 기존 형식 유지
  if (sizes.length === 1) {
    return results[sizes[0]];
  }
  return results;
}

async function generateNotice(data) {
  const size = data.snsSize || 'post';
  const sizes = size === 'both' ? ['post', 'story'] : [size];
  const results = {};
  
  for (const sz of sizes) {
    const html = renderNoticeHtml(data, sz);
    const buffer = await captureHtmlToPng(html, { selector: '.notice-page', size: sz });
    const filename = `notice_${sz}_${Date.now()}.png`;
    results[sz] = { imageBuffer: buffer, html, filename };
  }
  
  if (sizes.length === 1) return results[sizes[0]];
  return results;
}

async function generateResult(data) {
  const size = data.snsSize || 'post';
  const sizes = size === 'both' ? ['post', 'story'] : [size];
  const results = {};
  
  for (const sz of sizes) {
    const html = renderResultHtml(data, sz);
    const buffer = await captureHtmlToPng(html, { selector: '.result-page', size: sz });
    const filename = `result_${sz}_${Date.now()}.png`;
    results[sz] = { imageBuffer: buffer, html, filename };
  }
  
  if (sizes.length === 1) return results[sizes[0]];
  return results;
}

function getSchedulePreviewHtml(data) { 
  return renderScheduleHtml(data, data.snsSize || 'post'); 
}
function getNoticePreviewHtml(data) { 
  return renderNoticeHtml(data, data.snsSize || 'post'); 
}
function getResultPreviewHtml(data) { 
  return renderResultHtml(data, data.snsSize || 'post'); 
}

module.exports = {
  generateSchedule,
  generateNotice,
  generateResult,
  getSchedulePreviewHtml,
  getNoticePreviewHtml,
  getResultPreviewHtml,
  SNS_SIZES,
};
