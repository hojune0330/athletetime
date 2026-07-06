/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Profile Card Modular Engine – Component Registry           ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  각 UI 요소를 독립 컴포넌트로 등록합니다.                       ║
 * ║  컴포넌트는 (data, style) → HTML 문자열 함수입니다.            ║
 * ║                                                              ║
 * ║  추가/수정 방법:                                               ║
 * ║  1. 이 파일에 render 함수 추가                                 ║
 * ║  2. COMPONENTS 맵에 등록                                      ║
 * ║  3. 프리셋 JSON에서 해당 id로 참조                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── 유틸 ───────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function px(v) { return typeof v === 'number' ? `${v}px` : v; }

// CSS 속성 중 단위 없이 숫자만 사용하는 속성 목록
const UNITLESS_PROPS = new Set([
  'lineHeight', 'fontWeight', 'opacity', 'zIndex', 'flex', 'flexGrow', 'flexShrink',
  'order', 'orphans', 'widows', 'columns', 'columnCount', 'fillOpacity',
  'strokeOpacity', 'strokeMiterlimit', 'tabSize', 'animationIterationCount'
]);

function styleObj(obj) {
  if (!obj) return '';
  return Object.entries(obj)
    .filter(([k,v]) => v !== undefined && v !== null && v !== '' && typeof v !== 'object')
    .map(([k,v]) => {
      const cssProp = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      const val = (typeof v === 'number') ? (UNITLESS_PROPS.has(k) ? v : v + 'px') : v;
      return `${cssProp}:${val}`;
    })
    .join(';');
}

// ─── 컴포넌트 렌더 함수들 ────────────────────────────────

/**
 * record – 기록 숫자 (메인 히어로)
 */
function renderRecord(data, style) {
  const s = { fontSize: 152, fontWeight: 900, color: '#111', letterSpacing: -7, lineHeight: 0.9, display: 'block', paddingBottom: 10, ...style };
  const unitStyle = { fontSize: Math.round(s.fontSize * 0.18), fontWeight: 700, color: '#AAA', marginLeft: 8, verticalAlign: 'baseline', ...(style.unit || {}) };
  return `<div class="pc-record" style="${styleObj(s)}">
    <span class="pc-record__value">${esc(data.record)}</span>
    ${data.recordUnit ? `<span class="pc-record__unit" style="${styleObj(unitStyle)}">${esc(data.recordUnit)}</span>` : ''}
  </div>`;
}

/**
 * athleteName – 선수명
 */
function renderAthleteName(data, style) {
  const s = { fontSize: 56, fontWeight: 900, color: '#111', letterSpacing: -1.5, lineHeight: 1.1, display: 'block', ...style };
  return `<div class="pc-name" style="${styleObj(s)}">${esc(data.name)}</div>`;
}

/**
 * affiliation – 소속
 */
function renderAffiliation(data, style) {
  const s = { fontSize: 24, fontWeight: 500, color: '#999', marginTop: 10, ...style };
  return `<div class="pc-aff" style="${styleObj(s)}">${esc(data.affiliation)}</div>`;
}

/**
 * event – 종목명
 */
function renderEvent(data, style) {
  const s = { fontSize: 22, fontWeight: 800, color: '#999', letterSpacing: 2, ...style };
  return `<div class="pc-event" style="${styleObj(s)}">${esc(data.event)}</div>`;
}

/**
 * rank – 순위
 */
function renderRank(data, style) {
  const layout = style.layout || 'inline'; // inline | badge | circle
  const labelS = { fontSize: 14, fontWeight: 800, color: '#CCC', letterSpacing: 4, textTransform: 'uppercase', ...(style.label || {}) };
  const valueS = { fontSize: 80, fontWeight: 900, color: '#111', lineHeight: 0.85, fontVariantNumeric: 'tabular-nums', ...(style.value || {}) };

  if (layout === 'badge') {
    const badgeS = { background: '#111', borderRadius: 8, padding: '8px 16px', textAlign: 'center', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', ...(style.badge || {}) };
    return `<div class="pc-rank pc-rank--badge" style="${styleObj(badgeS)}">
      <span style="${styleObj(labelS)}">RANK</span>
      <span style="${styleObj(valueS)}">${esc(data.rank)}</span>
    </div>`;
  }

  if (layout === 'circle') {
    const size = style.size || 72;
    const circleS = { width: size, height: size, borderRadius: '50%', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...(style.circle || {}) };
    return `<div class="pc-rank pc-rank--circle" style="${styleObj(circleS)}">
      <span style="${styleObj(labelS)}">${style.hideLabel ? '' : 'RANK'}</span>
      <span style="${styleObj(valueS)}">${esc(data.rank)}</span>
    </div>`;
  }

  // inline (default)
  return `<div class="pc-rank pc-rank--inline" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;${styleObj(style.container || {})}">
    <span style="${styleObj(labelS)}">RANK</span>
    <span style="${styleObj(valueS)}">${esc(data.rank)}</span>
  </div>`;
}

/**
 * wind – 풍속
 */
function renderWind(data, style) {
  if (!data.hasWind) return '';
  const s = { fontSize: 17, fontWeight: 500, color: '#BBB', letterSpacing: 1.5, marginTop: 14, ...style };
  return `<div class="pc-wind" style="${styleObj(s)}">WIND ${esc(data.wind)} m/s</div>`;
}

/**
 * competition – 대회명
 */
function renderCompetition(data, style) {
  const s = { fontSize: 18, fontWeight: 600, color: '#AAA', ...style };
  return `<div class="pc-comp" style="${styleObj(s)}">${esc(data.competition)}</div>`;
}

/**
 * date – 날짜·장소
 */
function renderDate(data, style) {
  const s = { fontSize: 16, fontWeight: 400, color: '#CCC', ...style };
  const parts = [data.date, data.venue].filter(Boolean).join(' · ');
  return `<div class="pc-date" style="${styleObj(s)}">${esc(parts)}</div>`;
}

/**
 * comment – 사용자 코멘트
 */
function renderComment(data, style) {
  if (!data.hasComment || !data.comment) return '';
  const s = { fontSize: 20, fontWeight: 500, color: '#888', fontStyle: 'italic', lineHeight: 1.5, ...style };
  return `<div class="pc-comment" style="${styleObj(s)}">"${esc(data.comment)}"</div>`;
}

/**
 * brand – AthleTime 로고
 */
function renderBrand(data, style) {
  const s = { display: 'flex', alignItems: 'center', gap: 8, ...style };
  const logoSize = style.logoSize || 28;
  const textS = { fontSize: 15, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase', color: style.color || '#111', ...(style.text || {}) };
  const borderColor = style.borderColor || textS.color;
  const strokeColor = style.strokeColor || textS.color;

  return `<div class="pc-brand" style="${styleObj(s)}">
    <div style="width:${logoSize}px;height:${logoSize}px;border:2px solid ${borderColor};border-radius:50%;display:flex;align-items:center;justify-content:center">
      <svg fill="none" stroke="${strokeColor}" viewBox="0 0 24 24" stroke-width="2.5" style="width:${Math.round(logoSize*0.5)}px;height:${Math.round(logoSize*0.5)}px">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </div>
    <span style="${styleObj(textS)}">AthleTime</span>
  </div>`;
}

/**
 * divider – 구분선
 */
function renderDivider(data, style) {
  const s = { height: 3, background: '#111', width: '100%', ...style };
  return `<div class="pc-divider" style="${styleObj(s)}"></div>`;
}

/**
 * spacer – 빈 공간
 */
function renderSpacer(data, style) {
  const s = { height: 24, ...style };
  return `<div class="pc-spacer" style="${styleObj(s)}"></div>`;
}

/**
 * photo – 사진 영역 (절대 위치)
 */
function renderPhoto(data, style) {
  const s = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundSize: 'cover', backgroundPosition: 'center top',
    ...style
  };
  const filter = style.filter || 'grayscale(100%) contrast(1.1)';
  return `<div class="pc-photo" style="${styleObj(s)};background-image:url('${data.photoUrl}');filter:${filter}"></div>`;
}

/**
 * photoFade – 사진 그라데이션 (방향 제어 가능)
 */
function renderPhotoFade(data, style) {
  const direction = style.direction || 'to top';
  const fromColor = style.fromColor || '#FFFFFF';
  const s = {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
    background: `linear-gradient(${direction}, ${fromColor} 0%, transparent 100%)`,
    ...style
  };
  return `<div class="pc-photo-fade" style="${styleObj(s)}"></div>`;
}

// ─── 컴포넌트 레지스트리 ─────────────────────────────────
const COMPONENTS = {
  record:       renderRecord,
  athleteName:  renderAthleteName,
  affiliation:  renderAffiliation,
  event:        renderEvent,
  rank:         renderRank,
  wind:         renderWind,
  competition:  renderCompetition,
  date:         renderDate,
  comment:      renderComment,
  brand:        renderBrand,
  divider:      renderDivider,
  spacer:       renderSpacer,
  photo:        renderPhoto,
  photoFade:    renderPhotoFade,
};

/**
 * 커스텀 컴포넌트를 등록합니다.
 * @param {string} id - 컴포넌트 식별자
 * @param {(data, style) => string} renderFn - 렌더 함수
 */
function registerComponent(id, renderFn) {
  COMPONENTS[id] = renderFn;
}

/**
 * 등록된 컴포넌트를 렌더합니다.
 * @param {string} id
 * @param {Object} data - 카드 데이터
 * @param {Object} style - 스타일 오버라이드
 * @returns {string} HTML
 */
function renderComponent(id, data, style = {}) {
  const fn = COMPONENTS[id];
  if (!fn) {
    console.warn(`[CardEngine] Unknown component: ${id}`);
    return `<!-- unknown: ${id} -->`;
  }
  return fn(data, style);
}

module.exports = { COMPONENTS, registerComponent, renderComponent, esc, px, styleObj };
