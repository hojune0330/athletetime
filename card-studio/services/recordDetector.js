/**
 * 대기록 감지 모듈 (Record Detector)
 * 
 * 경기 결과 데이터에서 한국신기록/대회신기록 등 특별 기록을 감지하고
 * 렌더링에 사용할 배지 정보를 반환합니다.
 * 
 * v1.0.0
 */

// ─── 기록 타입 정의 ─────────────────────────────

const RECORD_TYPES = {
  KR:  { code: 'KR',  label: '한국신기록',    labelEn: 'KR',  color: '#FF0000', bg: 'rgba(255,0,0,0.15)', priority: 1 },
  NR:  { code: 'NR',  label: '한국신기록',    labelEn: 'NR',  color: '#FF0000', bg: 'rgba(255,0,0,0.15)', priority: 1 },
  CR:  { code: 'CR',  label: '대회신기록',    labelEn: 'CR',  color: '#FF6600', bg: 'rgba(255,102,0,0.15)', priority: 2 },
  MR:  { code: 'MR',  label: '대회신기록',    labelEn: 'MR',  color: '#FF6600', bg: 'rgba(255,102,0,0.15)', priority: 2 },
  SR:  { code: 'SR',  label: '시즌최고기록',  labelEn: 'SB',  color: '#22C55E', bg: 'rgba(34,197,94,0.15)', priority: 3 },
  SB:  { code: 'SB',  label: '시즌최고기록',  labelEn: 'SB',  color: '#22C55E', bg: 'rgba(34,197,94,0.15)', priority: 3 },
  PB:  { code: 'PB',  label: '개인최고기록',  labelEn: 'PB',  color: '#4a8cff', bg: 'rgba(74,140,255,0.15)', priority: 4 },
  PR:  { code: 'PR',  label: '개인최고기록',  labelEn: 'PB',  color: '#4a8cff', bg: 'rgba(74,140,255,0.15)', priority: 4 },
  AR:  { code: 'AR',  label: '아시아신기록',  labelEn: 'AR',  color: '#FF0000', bg: 'rgba(255,0,0,0.15)', priority: 1 },
  WR:  { code: 'WR',  label: '세계신기록',    labelEn: 'WR',  color: '#FF0000', bg: 'rgba(255,0,0,0.2)', priority: 0 },
};

// ─── 감지 패턴 ──────────────────────────────────

const RECORD_PATTERNS = [
  // 한국 표기
  { regex: /한국\s*(?:신|新)?\s*기록/i, type: 'KR' },
  { regex: /대회\s*(?:신|新)?\s*기록/i, type: 'CR' },
  { regex: /시즌\s*최고/i, type: 'SB' },
  { regex: /개인\s*최고/i, type: 'PB' },
  { regex: /아시아\s*(?:신|新)?\s*기록/i, type: 'AR' },
  { regex: /세계\s*(?:신|新)?\s*기록/i, type: 'WR' },
  // 영문 약어
  { regex: /\bKR\b/, type: 'KR' },
  { regex: /\bNR\b/, type: 'NR' },
  { regex: /\bCR\b/, type: 'CR' },
  { regex: /\bMR\b/, type: 'MR' },
  { regex: /\bSR\b/, type: 'SR' },
  { regex: /\bSB\b/, type: 'SB' },
  { regex: /\bPB\b/, type: 'PB' },
  { regex: /\bPR\b/, type: 'PR' },
  { regex: /\bAR\b/, type: 'AR' },
  { regex: /\bWR\b/, type: 'WR' },
];

// ─── 감지 엔진 ──────────────────────────────────

/**
 * 단일 선수 결과에서 기록 배지 감지
 * @param {object} result - { name, record, note, newRecord }
 * @returns {object[]} 감지된 기록 배지 배열 (priority 순 정렬)
 */
function detectRecords(result) {
  const badges = [];
  const seen = new Set();

  // 검사 대상 문자열 조합
  const searchText = [
    result.note || '',
    result.newRecord || '',
    result.remark || '',
  ].join(' ');

  for (const pattern of RECORD_PATTERNS) {
    if (pattern.regex.test(searchText)) {
      const rt = RECORD_TYPES[pattern.type];
      if (rt && !seen.has(rt.code)) {
        seen.add(rt.code);
        badges.push({ ...rt });
      }
    }
  }

  return badges.sort((a, b) => a.priority - b.priority);
}

/**
 * 전체 결과 배열에서 대기록 존재 여부 확인
 * @param {object[]} results
 * @returns {{ hasRecord: boolean, topRecord: object|null, badges: Map }}
 */
function analyzeResults(results) {
  if (!results || !results.length) return { hasRecord: false, topRecord: null, badges: new Map() };

  const badgeMap = new Map(); // resultIndex → badges[]
  let topRecord = null;

  results.forEach((r, idx) => {
    const badges = detectRecords(r);
    if (badges.length > 0) {
      badgeMap.set(idx, badges);
      if (!topRecord || badges[0].priority < topRecord.priority) {
        topRecord = { ...badges[0], athleteName: r.name, record: r.record, resultIndex: idx };
      }
    }
  });

  return {
    hasRecord: badgeMap.size > 0,
    topRecord,
    badges: badgeMap,
  };
}

/**
 * 기록 배지를 HTML로 렌더링
 */
function renderBadgeHtml(badge, size = 'normal') {
  const fontSize = size === 'large' ? '14px' : '10px';
  const padding = size === 'large' ? '4px 12px' : '2px 8px';
  return `<span style="display:inline-block;padding:${padding};border-radius:4px;font-size:${fontSize};font-weight:800;color:${badge.color};background:${badge.bg};letter-spacing:0.5px;margin-left:6px;">${badge.labelEn}</span>`;
}

/**
 * 대기록 배너 HTML (이미지 상단에 표시되는 큰 배너)
 */
function renderRecordBannerHtml(topRecord) {
  if (!topRecord) return '';
  return `
    <div style="background:${topRecord.bg};border:1px solid ${topRecord.color};border-radius:8px;padding:12px 20px;margin:8px 0;display:flex;align-items:center;gap:12px;">
      <span style="font-size:24px;font-weight:900;color:${topRecord.color};letter-spacing:2px;">${topRecord.labelEn}</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:${topRecord.color};">${topRecord.label}</div>
        <div style="font-size:11px;color:#aaa;">${topRecord.athleteName || ''} ${topRecord.record || ''}</div>
      </div>
    </div>`;
}

module.exports = {
  RECORD_TYPES,
  detectRecords,
  analyzeResults,
  renderBadgeHtml,
  renderRecordBannerHtml,
};
