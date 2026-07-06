/**
 * 프로필 카드 서비스
 *
 * 사용자가 업로드한 사진 + 검색된 선수 기록을 합성하여
 * 인증샷 스타일의 프로필 카드 이미지를 생성합니다.
 *
 * ═══ V3 모듈러 엔진 (권장) ═══
 * 프리셋 기반: bold-bw, dark-center, split-magazine 등
 * JSON 프리셋 파일만 추가/수정하면 디자인 패치 가능
 * 사용자 오버라이드로 요소 on/off, 위치·스타일 변경 가능
 *
 * ═══ 레거시 레이아웃 (호환 유지) ═══
 * V1: stamp, corner, fullcard
 * V2: stamp-v2, corner-v2, fullcard-v2
 *
 * 비율:
 *   - 1:1    → 1080×1080 (인스타그램 피드)
 *   - 9:16   → 1080×1920 (인스타 스토리 / 릴스)
 *   - 4:5    → 1080×1350 (인스타 세로)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const searchService = require('./searchService');
const { classifyEvent, needsWind, usesMeterUnit } = require('../eventClassifier');
const cardEngine = require('../card-engine');

// Puppeteer는 지연 로드 (서버 시작 시 불필요한 브라우저 로드 방지)
let puppeteer = null;
let _browser = null;

const LEGACY_LAYOUTS = ['stamp', 'corner', 'fullcard', 'stamp-v2', 'corner-v2', 'fullcard-v2'];
const V2_LAYOUTS = ['stamp-v2', 'corner-v2', 'fullcard-v2'];
const RATIOS = {
  '1:1':  { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '4:5':  { width: 1080, height: 1350 },
};
const THEMES = ['dark', 'light'];

class ProfileCardService {

  /**
   * 선수명으로 검색하여 프로필 카드에 사용할 수 있는 기록 목록을 반환합니다.
   *
   * @param {string} query - 선수명 (2글자 이상)
   * @param {string} [type='name'] - 검색 유형
   * @returns {Array<{eventIndex, event, competition, rank, record, name, affiliation, date, venue, wind, division}>}
   */
  searchAthleteRecords(query, type = 'name') {
    if (!query || query.trim().length < 2) return [];

    const result = searchService.search({ query: query.trim(), type, contextRows: 0 });
    if (!result.sections || result.sections.length === 0) return [];

    const records = [];
    let eventIndex = 0;

    for (const section of result.sections) {
      for (const sub of section.subSections) {
        // allResults에서 매칭된 선수만 추출
        const matched = (sub.allResults || sub.results || []).filter(r => r.isMatch);
        for (const m of matched) {
          records.push({
            eventIndex,
            event: `${sub.gender} ${section.event} ${sub.round}`,
            pureEvent: section.event,
            eventType: section.eventType,
            competition: sub.compName,
            rank: m.rank,
            record: m.record,
            name: m.name,
            affiliation: m.affiliation || '',
            date: sub.date || '',
            venue: sub.compName ? '' : '',
            wind: sub.wind || m.wind || null,
            hasWind: sub.hasWind && !!(sub.wind || m.wind),
            division: sub.division || '',
          });
          eventIndex++;
        }
      }
    }

    // venue를 대회 meta에서 추출
    this._fillVenue(records);

    return records;
  }

  /**
   * 프로필 카드를 생성합니다.
   *
   * @param {Object} opts
   * @param {Buffer|string} opts.photoBuffer - 업로드 사진 (Buffer 또는 base64)
   * @param {Object} opts.athleteRecord - searchAthleteRecords()에서 선택한 레코드
   * @param {string} [opts.layout='stamp'] - 레이아웃 (stamp, corner, fullcard)
   * @param {string} [opts.ratio='1:1'] - 비율
   * @param {string} [opts.theme='dark'] - 테마
   * @param {string} [opts.comment=''] - 코멘트 (최대 40자)
   * @returns {Promise<{ imageBuffer: Buffer, mimeType: string, filename: string }>}
   */
  async generate(opts = {}) {
    const {
      photoBuffer,
      photoMimeType = 'image/jpeg',
      athleteRecord,
      layout = 'stamp',
      ratio = '1:1',
      theme = 'dark',
      comment = '',
    } = opts;

    // 유효성 검증
    if (!photoBuffer) throw new Error('사진이 필요합니다.');
    if (!athleteRecord) throw new Error('선수 기록을 선택해주세요.');
    // 모듈러 프리셋 또는 레거시 레이아웃 확인
    const isModular = !!cardEngine.getPreset(layout);
    if (!isModular && !LEGACY_LAYOUTS.includes(layout)) {
      throw new Error(`유효하지 않은 레이아웃: ${layout}. 사용 가능: ${[...LEGACY_LAYOUTS, ...cardEngine.listPresets().map(p=>p.id)].join(', ')}`);
    }
    if (!RATIOS[ratio]) throw new Error(`유효하지 않은 비율: ${ratio}`);

    const dimensions = RATIOS[ratio];
    const sanitizedComment = (comment || '').trim().slice(0, 40);

    // 사진 → base64 data URI
    const photoBase64 = this._toBase64DataUri(photoBuffer, photoMimeType);

    // 기록 단위 결정
    const recordUnit = usesMeterUnit(athleteRecord.pureEvent || athleteRecord.event || '') ? 'm' : '';

    // 템플릿 데이터
    const templateData = {
      width: dimensions.width,
      height: dimensions.height,
      photoUrl: photoBase64,
      competition: athleteRecord.competition || '',
      event: athleteRecord.event || '',
      date: athleteRecord.date || '',
      venue: athleteRecord.venue || '',
      name: athleteRecord.name || '',
      affiliation: athleteRecord.affiliation || '',
      rank: athleteRecord.rank || '-',
      record: athleteRecord.record || '',
      recordUnit,
      wind: athleteRecord.wind || '',
      hasWind: athleteRecord.hasWind && !!athleteRecord.wind,
      comment: sanitizedComment,
      hasComment: sanitizedComment.length > 0,
    };

    // HTML 빌드 (모듈러 엔진 또는 레거시)
    let html;
    if (isModular) {
      html = cardEngine.render(layout, templateData, opts.overrides || {});
    } else {
      html = this._buildHtml(layout, templateData, theme);
    }

    // Puppeteer 캡처
    const imageBuffer = await this._capture(html, dimensions);

    // 파일명 생성
    const filename = this._generateFilename(athleteRecord);

    return { imageBuffer, mimeType: 'image/png', filename };
  }

  /**
   * 프리뷰 HTML을 반환합니다 (이미지 생성 없이 빠른 미리보기용).
   */
  buildPreviewHtml(opts = {}) {
    const {
      photoDataUri,
      athleteRecord,
      layout = 'stamp',
      ratio = '1:1',
      theme = 'dark',
      comment = '',
    } = opts;

    const dimensions = RATIOS[ratio] || RATIOS['1:1'];
    const sanitizedComment = (comment || '').trim().slice(0, 40);
    const recordUnit = usesMeterUnit(athleteRecord.pureEvent || athleteRecord.event || '') ? 'm' : '';

    const templateData = {
      width: dimensions.width,
      height: dimensions.height,
      photoUrl: photoDataUri || '',
      competition: athleteRecord.competition || '',
      event: athleteRecord.event || '',
      date: athleteRecord.date || '',
      venue: athleteRecord.venue || '',
      name: athleteRecord.name || '',
      affiliation: athleteRecord.affiliation || '',
      rank: athleteRecord.rank || '-',
      record: athleteRecord.record || '',
      recordUnit,
      wind: athleteRecord.wind || '',
      hasWind: athleteRecord.hasWind && !!athleteRecord.wind,
      comment: sanitizedComment,
      hasComment: sanitizedComment.length > 0,
    };

    return this._buildHtml(layout, templateData, theme);
  }

  // ── 내부 헬퍼 ──

  /**
   * 레이아웃 템플릿을 로드하고 데이터를 삽입합니다.
   */
  _buildHtml(layout, data, theme) {
    const templateDir = path.join(config.dirs.templates, 'profile-card');
    const templateFile = path.join(templateDir, `${layout}.html`);

    if (!fs.existsSync(templateFile)) {
      throw new Error(`템플릿 파일을 찾을 수 없습니다: ${layout}.html`);
    }

    let html = fs.readFileSync(templateFile, 'utf-8');

    // 라이트 테마 처리 (CSS 변수 오버라이드)
    if (theme === 'light') {
      if (V2_LAYOUTS.includes(layout)) {
        html = this._applyLightThemeV2(html, layout);
      } else {
        html = this._applyLightTheme(html, layout);
      }
    }

    // Mustache 스타일 변수 치환
    html = this._render(html, data);

    return html;
  }

  /**
   * 간이 Mustache 렌더러
   */
  _render(template, data) {
    let html = template;

    // 섹션 블록 ({{#key}}...{{/key}})
    html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const value = data[key];
      if (!value) return '';
      if (Array.isArray(value)) {
        return value.map(item => this._render(content, item)).join('');
      }
      return this._render(content, data);
    });

    // 단순 변수 ({{key}})
    html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        return this._escapeHtml(String(value));
      }
      return '';
    });

    return html;
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 라이트 테마 CSS 오버라이드
   */
  _applyLightTheme(html, layout) {
    // 공통 라이트 테마 변수
    const lightOverride = `
      <style>
        :root {
          --black: #FFFFFF;
          --white: #111111;
        }
        .profile-card__gradient {
          background: linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 50%, transparent 100%) !important;
        }
        .stamp__comp { color: rgba(0,0,0,0.5) !important; }
        .stamp__event { color: #111 !important; }
        .stamp__meta { color: rgba(0,0,0,0.45) !important; }
        .stamp__divider { background: rgba(0,0,0,0.15) !important; }
        .stamp__rank-label { color: rgba(0,0,0,0.4) !important; }
        .stamp__athlete { color: #111 !important; }
        .stamp__affiliation { color: rgba(0,0,0,0.5) !important; }
        .stamp__record { color: #111 !important; }
        .stamp__record-unit { color: rgba(0,0,0,0.4) !important; }
        .stamp__wind { color: rgba(0,0,0,0.35) !important; }
        .stamp__comment { color: rgba(0,0,0,0.6) !important; border-top-color: rgba(0,0,0,0.1) !important; }
        .stamp__brand { color: rgba(0,0,0,0.2) !important; }

        .corner__block { background: rgba(255,255,255,0.88) !important; }
        .corner__event { color: rgba(0,0,0,0.45) !important; }
        .corner__athlete { color: #111 !important; }
        .corner__affiliation { color: rgba(0,0,0,0.5) !important; }
        .corner__stat-label { color: rgba(0,0,0,0.35) !important; }
        .corner__stat-value { color: #111 !important; }
        .corner__wind { color: rgba(0,0,0,0.35) !important; }
        .corner__comment { color: rgba(0,0,0,0.55) !important; border-top-color: rgba(0,0,0,0.1) !important; }
        .corner__meta { border-top-color: rgba(0,0,0,0.1) !important; color: rgba(0,0,0,0.35) !important; }
        .corner__brand { color: rgba(0,0,0,0.3) !important; }

        .full__header { background: #F5F5F5 !important; }
        .full__comp { color: rgba(0,0,0,0.4) !important; }
        .full__event { color: #111 !important; }
        .full__data { background: #F5F5F5 !important; }
        .full__athlete-name { color: #111 !important; }
        .full__athlete-aff { color: rgba(0,0,0,0.45) !important; }
        .full__record-unit { color: rgba(0,0,0,0.35) !important; }
        .full__record-wind { color: rgba(0,0,0,0.3) !important; }
        .full__meta { border-top-color: rgba(0,0,0,0.1) !important; }
        .full__meta-text { color: rgba(0,0,0,0.35) !important; }
        .full__brand { color: rgba(0,0,0,0.2) !important; }
        .full__comment { color: rgba(0,0,0,0.55) !important; }
      </style>
    `;

    return html.replace('</head>', lightOverride + '</head>');
  }

  /**
   * V2 라이트 테마 CSS 오버라이드 (Nike + IAAF 스타일)
   */
  _applyLightThemeV2(html, layout) {
    const lightOverride = `
      <style>
        :root {
          --black: #FAFAFA;
          --white: #0A0A0A;
          --volt: #0066FF;
          --volt-dim: rgba(0,102,255,0.7);
          --gray-900: #F0F0F0;
        }

        body { background: #FFF !important; }

        /* Stamp V2 light */
        .pc__gradient {
          background: linear-gradient(
            to top,
            rgba(250,250,250,0.98) 0%,
            rgba(250,250,250,0.92) 25%,
            rgba(250,250,250,0.6) 55%,
            transparent 100%
          ) !important;
        }
        .pc__top-tag span { background: var(--volt) !important; color: #FFF !important; }
        .pc__rank-badge-label { color: rgba(0,0,0,0.4) !important; }
        .pc__rank-badge-value { color: var(--white) !important; text-shadow: none !important; }
        .pc__athlete-name { color: var(--white) !important; }
        .pc__athlete-aff { color: rgba(0,0,0,0.5) !important; }
        .pc__record-value { color: var(--white) !important; }
        .pc__record-unit { color: rgba(0,0,0,0.35) !important; }
        .pc__event-label { color: var(--volt) !important; }
        .pc__wind { color: rgba(0,0,0,0.3) !important; }
        .pc__divider { background: linear-gradient(to right, var(--volt), transparent) !important; }
        .pc__comp-name { color: rgba(0,0,0,0.4) !important; }
        .pc__comp-date { color: rgba(0,0,0,0.3) !important; }
        .pc__brand-icon { border-color: rgba(0,0,0,0.15) !important; }
        .pc__brand-text { color: rgba(0,0,0,0.15) !important; }
        .pc__comment { color: rgba(0,0,0,0.5) !important; border-top-color: rgba(0,0,0,0.06) !important; }
        .pc__accent-line, .pc__accent-line-2 { background: linear-gradient(to bottom, transparent, var(--volt-dim) 40%, transparent 80%) !important; }

        /* Corner V2 light */
        .pc__block { background: rgba(255,255,255,0.85) !important; border-color: rgba(0,0,0,0.06) !important; }
        .pc__event-tag-pill { background: var(--volt) !important; color: #FFF !important; }
        .pc__event-tag-label { color: rgba(0,0,0,0.35) !important; }
        .pc__stat-label { color: rgba(0,0,0,0.3) !important; }
        .pc__stat-value { color: var(--white) !important; }
        .pc__stat-value--accent { color: var(--volt) !important; }
        .pc__stat + .pc__stat { border-left-color: rgba(0,0,0,0.06) !important; }
        .pc__comp { color: rgba(0,0,0,0.35) !important; }
        .pc__comp-date { color: rgba(0,0,0,0.25) !important; }
        .pc__meta { border-top-color: rgba(0,0,0,0.06) !important; }
        .pc__brand-dot { background: var(--volt) !important; }
        .pc__brand-text { color: rgba(0,0,0,0.2) !important; }
        .pc__rank-float { background: var(--volt) !important; box-shadow: 0 8px 32px rgba(0,102,255,0.25) !important; }
        .pc__rank-float-label { color: rgba(255,255,255,0.7) !important; }
        .pc__rank-float-value { color: #FFF !important; }

        /* Fullcard V2 light */
        .pc__header { background: #FAFAFA !important; }
        .pc__comp-label { color: rgba(0,0,0,0.3) !important; }
        .pc__event-title { color: var(--white) !important; }
        .pc__rank-badge { background: var(--volt) !important; }
        .pc__rank-badge-label { color: rgba(255,255,255,0.7) !important; }
        .pc__rank-badge-value { color: #FFF !important; }
        .pc__header-bar { background: linear-gradient(to right, var(--volt) 0%, var(--volt) 30%, transparent 100%) !important; }
        .pc__photo-fade { background: linear-gradient(to top, #FAFAFA 0%, transparent 100%) !important; }
        .pc__photo-fade-top { background: linear-gradient(to bottom, #FAFAFA 0%, transparent 100%) !important; }
        .pc__footer { background: #FAFAFA !important; }
        .pc__record-value { color: var(--volt) !important; }
        .pc__meta-row { border-top-color: rgba(0,0,0,0.06) !important; }
        .pc__meta-text { color: rgba(0,0,0,0.25) !important; }
        .pc__stripe { background: linear-gradient(to bottom, var(--volt) 0%, transparent 50%, var(--volt) 100%) !important; }
      </style>
    `;

    return html.replace('</head>', lightOverride + '</head>');
  }

  /**
   * Buffer → base64 Data URI
   */
  _toBase64DataUri(buffer, mimeType = 'image/jpeg') {
    const b64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : buffer;
    // 이미 data: 로 시작하면 그대로 반환
    if (typeof b64 === 'string' && b64.startsWith('data:')) return b64;
    return `data:${mimeType};base64,${b64}`;
  }

  /**
   * Puppeteer로 HTML → PNG 캡처
   */
  async _capture(html, dimensions) {
    const browser = await this._getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({
        width: dimensions.width,
        height: dimensions.height,
        deviceScaleFactor: 2,
      });

      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      await new Promise(resolve => setTimeout(resolve, 600));

      const card = await page.$('.profile-card');
      if (!card) throw new Error('.profile-card 요소를 찾을 수 없습니다.');

      const imageBuffer = await card.screenshot({ type: 'png' });
      // Puppeteer returns Uint8Array; ensure it's a proper Node Buffer for .toString('base64')
      return Buffer.from(imageBuffer);
    } finally {
      await page.close();
    }
  }

  async _getBrowser() {
    if (!puppeteer) puppeteer = require('puppeteer');
    if (!_browser || !_browser.connected) {
      _browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--font-render-hinting=none',
          '--lang=ko-KR',
        ],
      });
    }
    return _browser;
  }

  async closeBrowser() {
    if (_browser) {
      await _browser.close();
      _browser = null;
    }
  }

  _generateFilename(record) {
    const date = (record.date || 'unknown').replace(/\//g, '-');
    const event = (record.event || 'event').replace(/\s+/g, '_');
    const name = record.name || 'athlete';
    return `profile_${date}_${name}_${event}.png`;
  }

  /**
   * raw 데이터에서 venue 보충
   */
  _fillVenue(records) {
    try {
      const rawDir = config.dirs.raw;
      if (!fs.existsSync(rawDir)) return;

      const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json'));
      const venueMap = {};  // compName → venue

      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf-8'));
          const compName = (data.meta && data.meta.competition_name) || '';
          const venue = (data.meta && data.meta.venue) || '';
          if (compName && venue) venueMap[compName] = venue;
        } catch (e) { /* skip */ }
      }

      for (const r of records) {
        if (!r.venue && r.competition && venueMap[r.competition]) {
          r.venue = venueMap[r.competition];
        }
      }
    } catch (e) { /* non-critical */ }
  }

  // ── 모듈러 엔진 API ──

  /**
   * 사용 가능한 모든 레이아웃 목록 (레거시 + 모듈러)
   */
  getAvailableLayouts() {
    const legacy = LEGACY_LAYOUTS.map(id => ({ id, name: id, type: 'legacy' }));
    const modular = cardEngine.listPresets().map(p => ({ ...p, type: 'modular' }));
    return [...legacy, ...modular];
  }

  /**
   * 프리셋의 토글 가능한 요소 목록 (UI에서 on/off 토글용)
   * @param {string} presetId
   * @returns {Array<{id, componentId, visible, label}>}
   */
  getToggleOptions(presetId) {
    return cardEngine.getToggleOptions(presetId);
  }

  /**
   * 모듈러 엔진의 프리셋 목록만 반환
   */
  getModularPresets() {
    return cardEngine.listPresets();
  }

  /**
   * 프리셋 캐시를 새로고침 (개발 중 JSON 파일 수정 후)
   */
  reloadPresets() {
    return cardEngine.reloadPresets();
  }
}

module.exports = new ProfileCardService();
