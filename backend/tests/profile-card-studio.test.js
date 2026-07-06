/**
 * 프로필 카드 스튜디오 계약 테스트
 *
 * 잠그는 것:
 *  1. 신뢰 표기 — '직접 입력한 기록' 배지 + AthleteTime 워터마크가 캔버스에 항상 렌더
 *  2. 서버 전송 없음 — fetch/axios/apiClient 미사용 (전부 브라우저 내 처리)
 *  3. 구 빌더(모드 선택/iframe) 제거 — 진입 즉시 편집
 *  4. 접근성 — label 연결, aria-pressed, inputmode, 이모지 아이콘 금지
 *  5. 내보내기 — 실크기 캡처 (스케일 업 없음), Web Share 폴백
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const STUDIO = 'frontend/src/pages/ProfileCardStudio';

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('CARD-TRUST-001: trust badge and watermark are wired into the canvas and cannot be omitted', () => {
  const types = readSource(`${STUDIO}/types.ts`);
  const preview = readSource(`${STUDIO}/CardPreview.tsx`);
  assert.ok(types.includes("badge: '직접 입력한 기록'"), 'CARD_TRUST.badge must declare manual-entry nature');
  assert.ok(types.includes("watermark: 'AthleteTime'"), 'watermark must exist');
  assert.ok(preview.includes('CARD_TRUST.badge'), 'canvas must render trust badge');
  assert.ok(preview.includes('CARD_TRUST.watermark'), 'canvas must render watermark');
});

test('CARD-PRIVACY-001: studio does no network calls — photo/records stay in the browser', () => {
  for (const f of ['index.tsx', 'CardPreview.tsx', 'exportCard.ts', 'types.ts', 'themes.ts']) {
    const src = readSource(`${STUDIO}/${f}`);
    assert.ok(!/fetch\(/.test(src), `${f} must not call fetch`);
    assert.ok(!src.includes('apiClient'), `${f} must not use apiClient`);
    assert.ok(!src.includes('axios'), `${f} must not use axios`);
  }
  const index = readSource(`${STUDIO}/index.tsx`);
  assert.ok(index.includes('서버로 보내지 않아요'), 'privacy promise must be visible to users');
});

test('CARD-UX-001: old mode-select/iframe builder is gone — studio opens straight into editing', () => {
  assert.equal(
    fs.existsSync(path.join(ROOT, 'frontend/src/pages/ProfileCardPage.tsx')),
    false,
    'legacy ProfileCardPage must be deleted',
  );
  const app = readSource('frontend/src/App.tsx');
  assert.ok(app.includes("import('./pages/ProfileCardStudio')"), 'route must point at the studio');
  const index = readSource(`${STUDIO}/index.tsx`);
  assert.ok(!index.includes('iframe'), 'no iframe embedding');
  assert.ok(!index.includes('BuilderMode'), 'no mode-select step');
});

test('CARD-INPUT-001: records are manual entry — today/PB/season kinds with add/remove', () => {
  const types = readSource(`${STUDIO}/types.ts`);
  assert.ok(types.includes("'today' | 'pb' | 'season'"), 'three record kinds');
  assert.ok(types.includes("today: '오늘의 기록'"), 'today label');
  assert.ok(types.includes('최고 기록 (PB)'), 'PB label');
  assert.ok(types.includes('시즌 기록 (SB)'), 'season label');
  const index = readSource(`${STUDIO}/index.tsx`);
  assert.ok(index.includes('addRecord'), 'can add record rows');
  assert.ok(index.includes('removeRecord'), 'can remove record rows');
  assert.ok(index.includes('MAX_RECORDS'), 'record rows are capped');
});

test('CARD-A11Y-001: accessibility contract — labels, aria-pressed, inputmode, no emoji icons', () => {
  const index = readSource(`${STUDIO}/index.tsx`);
  assert.ok(index.includes('aria-pressed'), 'toggles expose pressed state');
  assert.ok(index.includes('inputMode="decimal"'), 'record value uses decimal keyboard');
  assert.ok(index.includes('aria-label'), 'icon-only buttons are labeled');
  assert.ok(index.includes('min-h-[44px]') || index.includes('min-h-[48px]'), '44px+ touch targets');
  const preview = readSource(`${STUDIO}/CardPreview.tsx`);
  const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.ok(!emojiPattern.test(preview), 'canvas must not use emoji as icons (SVG only)');
});

test('CARD-EXPORT-001: export captures at full 1080px size and offers Web Share with download fallback', () => {
  const exp = readSource(`${STUDIO}/exportCard.ts`);
  assert.ok(exp.includes("el.style.transform = 'none'"), 'preview scale must be lifted before capture');
  assert.ok(exp.includes('scale: 1'), 'html2canvas captures at natural size (no upscaling blur)');
  assert.ok(exp.includes('navigator.canShare'), 'Web Share API attempted');
  assert.ok(exp.includes("'downloaded'"), 'download fallback exists');
  const types = readSource(`${STUDIO}/types.ts`);
  assert.ok(types.includes('w: 1080, h: 1920'), 'story format is 1080x1920');
  assert.ok(types.includes('w: 1080, h: 1080'), 'feed format is 1080x1080');
});

test('CARD-THEME-001: theme system — 6 themes, token-complete, layout stays common', () => {
  const themes = readSource(`${STUDIO}/themes.ts`);
  const ids = [...themes.matchAll(/id: '([a-z-]+)'/g)].map((m) => m[1]);
  assert.ok(ids.length >= 6, `at least 6 themes (got ${ids.length})`);
  for (const key of ['bg:', 'ink:', 'inkSub:', 'accent:', 'accentInk:', 'panel:', 'lane:', 'avatarBg:']) {
    const count = (themes.match(new RegExp(key.replace(':', ':'), 'g')) || []).length;
    assert.ok(count >= ids.length, `token ${key} present in every theme`);
  }
  assert.ok(themes.includes('function getTheme'), 'getTheme fallback exists');
});

test('CARD-TONE-001: no forbidden trust words on the studio surface (공식/랭킹/검증/예측/평가)', () => {
  for (const f of ['index.tsx', 'CardPreview.tsx', 'types.ts', 'themes.ts']) {
    const src = readSource(`${STUDIO}/${f}`);
    for (const word of ['공식 기록', '랭킹', '검증된', '예측', '평가']) {
      assert.ok(!src.includes(word), `${f} must not contain "${word}"`);
    }
  }
});
