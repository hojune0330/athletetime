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
  for (const f of ['index.tsx', 'CardPreview.tsx', 'exportCard.ts', 'types.ts', 'themes.ts', 'filters.ts', 'stickers.ts']) {
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
  // 캐버스 소스에 이모지 리터럴 금지 — 이모지는 사용자가 스티커로 올리는 콘텐츠(데이터)로만 허용
  const preview = readSource(`${STUDIO}/CardPreview.tsx`);
  const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.ok(!emojiPattern.test(preview), 'canvas source must not hardcode emoji as icons (SVG only)');
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
  for (const f of ['index.tsx', 'CardPreview.tsx', 'types.ts', 'themes.ts', 'filters.ts', 'stickers.ts']) {
    const src = readSource(`${STUDIO}/${f}`);
    for (const word of ['공식 기록', '랭킹', '검증된', '예측', '평가']) {
      assert.ok(!src.includes(word), `${f} must not contain "${word}"`);
    }
  }
});

test('CARD-FILTER-001: photo adjustments are baked — preview equals export, with manual-pixel fallback', () => {
  const filters = readSource(`${STUDIO}/filters.ts`);
  // 프리셋 최소 8종 (원본 포함)
  const presetIds = [...filters.matchAll(/id: '([a-z-]+)'/g)].map((m) => m[1]);
  assert.ok(presetIds.length >= 8, `at least 8 filter presets (got ${presetIds.length})`);
  assert.ok(presetIds.includes('original'), 'original preset exists');
  // 구워서 미리보기=저장본 (CSS filter를 html2canvas에 맡기지 않음)
  assert.ok(filters.includes('export async function bakePhoto'), 'bake pipeline exists');
  assert.ok(filters.includes('applyFilterManually'), 'ctx.filter-unsupported browsers get pixel fallback');
  assert.ok(filters.includes('brightness') && filters.includes('contrast') && filters.includes('saturate'), 'core adjustments');
  const index = readSource(`${STUDIO}/index.tsx`);
  assert.ok(index.includes('bakePhoto'), 'studio bakes on adjustment change');
  assert.ok(index.includes('displayPhoto={bakedPhoto}'), 'preview shows the baked photo (what you see is what you save)');
  assert.ok(index.includes('보정 초기화'), 'one-tap reset exists');
  // 수동 슬라이더 4종 (밝기/대비/채도/따뜻함)
  for (const s of ['밝기', '대비', '채도', '따뜻함']) {
    assert.ok(index.includes(`'${s}'`), `manual slider: ${s}`);
  }
});

test('CARD-STICKER-001: free-position sticker layer — emoji/text, drag, % coords, clamped, capped', () => {
  const stickers = readSource(`${STUDIO}/stickers.ts`);
  assert.ok(stickers.includes('EMOJI_PALETTE'), 'curated emoji palette exists');
  assert.ok(stickers.includes('TEXT_CHIP_PRESETS'), 'text chip presets exist');
  assert.ok(stickers.includes('MAX_STICKERS'), 'sticker count is capped');
  assert.ok(stickers.includes('clampSticker'), 'position/size/rotation are clamped');
  const types = readSource(`${STUDIO}/types.ts`);
  assert.ok(types.includes("'emoji' | 'text'"), 'two sticker types');
  assert.ok(/x: number/.test(types) && /y: number/.test(types), 'percent coordinates in the model');
  const index = readSource(`${STUDIO}/index.tsx`);
  assert.ok(index.includes('onStickerPointerDown'), 'stickers are draggable on the preview');
  assert.ok(index.includes('pointermove'), 'drag follows pointer');
  assert.ok(index.includes('removeSticker'), 'stickers can be deleted');
  const preview = readSource(`${STUDIO}/CardPreview.tsx`);
  assert.ok(preview.includes('card.stickers.map'), 'canvas renders the sticker layer');
  assert.ok(preview.includes('touchAction'), 'touch drag does not scroll the page');
  // 신뢰 표기는 스티커보다 항상 위 (zIndex 우위)
  assert.ok(preview.includes('zIndex: 3'), 'trust badge stays above stickers');
});

test('CARD-INSTA-001: Instagram share — mobile share sheet first, story-camera deeplink fallback', () => {
  const exp = readSource(`${STUDIO}/exportCard.ts`);
  assert.ok(exp.includes('export async function shareToInstagram'), 'dedicated Instagram path exists');
  assert.ok(exp.includes('instagram://story-camera'), 'story camera deeplink fallback');
  assert.ok(exp.includes("'deeplinked'"), 'deeplink result reported so UI can guide the user');
  const index = readSource(`${STUDIO}/index.tsx`);
  assert.ok(index.includes('handleInstagram'), 'studio wires the Instagram button');
  assert.ok(index.includes('인스타그램'), 'button is labeled');
  // 내보내기 전 선택 테두리 해제 (선택 점선이 저장본에 안 박힘)
  assert.ok(index.includes('setSelectedStickerId(null)'), 'sticker selection cleared before capture');
});
